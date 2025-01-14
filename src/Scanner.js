import { Form } from './Form/Form.js'
import { constants } from './constants.js'
import { createMatching } from './Form/matching.js'
import {logPerformance, isFormLikelyToBeUsedAsPageWrapper, shouldLog} from './autofill-utils.js'
import { AddDebugFlagCall } from './deviceApiCalls/__generated__/deviceApiCalls.js'

const {
    MAX_INPUTS_PER_PAGE,
    MAX_FORMS_PER_PAGE,
    MAX_INPUTS_PER_FORM
} = constants

/**
 * @typedef {{
 *     forms: Map<HTMLElement, import("./Form/Form").Form>;
 *     init(): (reason, ...rest)=> void;
 *     enqueue(elements: (HTMLElement|Document)[]): void;
 *     findEligibleInputs(context): Scanner;
 *     matching: import("./Form/matching").Matching;
 *     options: ScannerOptions;
 * }} Scanner
 *
 * @typedef {{
 *     initialDelay: number,
 *     bufferSize: number,
 *     debounceTimePeriod: number,
 *     maxInputsPerPage: number,
 *     maxFormsPerPage: number,
 *     maxInputsPerForm: number
 * }} ScannerOptions
 */

/** @type {ScannerOptions} */
const defaultScannerOptions = {
    // This buffer size is very large because it's an unexpected edge-case that
    // a DOM will be continually modified over and over without ever stopping. If we do see 1000 unique
    // new elements in the buffer however then this will prevent the algorithm from never ending.
    bufferSize: 50,
    // wait for a 500ms window of event silence before performing the scan
    debounceTimePeriod: 500,
    // how long to wait when performing the initial scan
    initialDelay: 0,
    // How many inputs is too many on the page. If we detect that there's above
    // this maximum, then we don't scan the page. This will prevent slowdowns on
    // large pages which are unlikely to require autofill anyway.
    maxInputsPerPage: MAX_INPUTS_PER_PAGE,
    maxFormsPerPage: MAX_FORMS_PER_PAGE,
    maxInputsPerForm: MAX_INPUTS_PER_FORM
}

/**
 * This allows:
 *   1) synchronous DOM scanning + mutations - via `createScanner(device).findEligibleInputs(document)`
 *   2) or, as above + a debounced mutation observer to re-run the scan after the given time
 */
class DefaultScanner {
    /** @type Map<HTMLElement, Form> */
    forms = new Map();
    /** @type {any|undefined} the timer to reset */
    debounceTimer;
    /** @type {Set<HTMLElement|Document>} stored changed elements until they can be processed */
    changedElements = new Set()
    /** @type {ScannerOptions} */
    options;
    /** @type {HTMLInputElement | null} */
    activeInput = null;
    /** @type {boolean} A flag to indicate the whole page will be re-scanned */
    rescanAll = false;
    /** @type {boolean} Indicates whether we called stopScanning */
    stopped = false
    /** @type {import("./Form/matching").Matching} matching */
    matching

    /**
     * @param {import("./DeviceInterface/InterfacePrototype").default} device
     * @param {ScannerOptions} options
     */
    constructor (device, options) {
        this.device = device
        this.matching = createMatching()
        this.options = options
        /** @type {number} A timestamp of the  */
        this.initTimeStamp = Date.now()
    }

    /**
     * Determine whether we should fire the credentials autoprompt. This is needed because some sites are blank
     * on page load and load scripts asynchronously, so our initial scan didn't set the autoprompt correctly
     * @returns {boolean}
     */
    get shouldAutoprompt () {
        return Date.now() - this.initTimeStamp <= 1500
    }

    /**
     * Call this to scan once and then watch for changes.
     *
     * Call the returned function to remove listeners.
     * @returns {(reason: string, ...rest) => void}
     */
    init () {
        if (this.device.globalConfig.isExtension) {
            this.device.deviceApi.notify(new AddDebugFlagCall({ flag: 'autofill' }))
        }
        const delay = this.options.initialDelay
        // if the delay is zero, (chrome/firefox etc) then use `requestIdleCallback`
        if (delay === 0) {
            window.requestIdleCallback(() => this.scanAndObserve())
        } else {
            // otherwise, use the delay time to defer the initial scan
            setTimeout(() => this.scanAndObserve(), delay)
        }
        return (reason, ...rest) => {
            this.stopScanner(reason, ...rest)
        }
    }

    /**
     * Scan the page and begin observing changes
     */
    scanAndObserve () {
        window.performance?.mark?.('initial_scanner:init:start')
        this.findEligibleInputs(document)
        window.performance?.mark?.('initial_scanner:init:end')
        logPerformance('initial_scanner')
        this.mutObs.observe(document.documentElement, { childList: true, subtree: true })
    }

    /**
     * @param context
     */
    findEligibleInputs (context) {
        // Avoid autofill on Email Protection web app
        if (this.device.globalConfig.isDDGDomain) {
            return this
        }

        if ('matches' in context && context.matches?.(this.matching.cssSelector('formInputsSelector'))) {
            this.addInput(context)
        } else {
            const inputs = context.querySelectorAll(this.matching.cssSelector('formInputsSelector'))
            if (inputs.length > this.options.maxInputsPerPage) {
                this.stopScanner('Too many input fields in the given context, stop scanning', context)
                return this
            }
            inputs.forEach((input) => this.addInput(input))
        }
        return this
    }

    /**
     * Stops scanning, switches off the mutation observer and clears all forms
     * @param {string} reason
     * @param {...any} rest
     */
    stopScanner (reason, ...rest) {
        this.stopped = true

        if (shouldLog()) {
            console.log(reason, ...rest)
        }

        const activeInput = this.device.activeForm?.activeInput

        // remove Dax, listeners, timers, and observers
        clearTimeout(this.debounceTimer)
        this.changedElements.clear()
        this.mutObs.disconnect()

        this.forms.forEach(form => {
            form.destroy()
        })
        this.forms.clear()

        // Bring the user back to the input they were interacting with
        activeInput?.focus()
    }

    /**
     * @param {HTMLElement|HTMLInputElement|HTMLSelectElement} input
     * @returns {HTMLFormElement|HTMLElement}
     */
    getParentForm (input) {
        if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
            if (input.form) {
                // Use input.form unless it encloses most of the DOM
                // In that case we proceed to identify more precise wrappers
                if (
                    this.forms.has(input.form) || // If we've added the form we've already checked that it's not a page wrapper
                    !isFormLikelyToBeUsedAsPageWrapper(input.form)
                ) {
                    return input.form
                }
            }
        }

        let element = input
        // traverse the DOM to search for related inputs
        while (element.parentElement && element.parentElement !== document.documentElement) {
            // Avoid overlapping containers or forms
            const siblingForm = element.parentElement?.querySelector('form')
            if (siblingForm && siblingForm !== element) {
                return element
            }

            element = element.parentElement

            const inputs = element.querySelectorAll(this.matching.cssSelector('formInputsSelector'))
            const buttons = element.querySelectorAll(this.matching.cssSelector('submitButtonSelector'))
            // If we find a button or another input, we assume that's our form
            if (inputs.length > 1 || buttons.length) {
                // found related input, return common ancestor
                return element
            }
        }

        return input
    }

    /**
     * @param {HTMLInputElement|HTMLSelectElement} input
     */
    addInput (input) {
        if (this.stopped) return

        const parentForm = this.getParentForm(input)

        if (parentForm instanceof HTMLFormElement && this.forms.has(parentForm)) {
            // We've met the form, add the input
            this.forms.get(parentForm)?.addInput(input)
            return
        }

        // Check if the forms we've seen are either disconnected,
        // or are parent/child of the currently-found form
        let previouslyFoundParent, childForm
        for (const [formEl] of this.forms) {
            // Remove disconnected forms to avoid leaks
            if (!formEl.isConnected) {
                this.forms.delete(formEl)
                continue
            }
            if (formEl.contains(parentForm)) {
                previouslyFoundParent = formEl
                break
            }
            if (parentForm.contains(formEl)) {
                childForm = formEl
                break
            }
        }

        if (previouslyFoundParent) {
            if (parentForm instanceof HTMLFormElement && parentForm !== previouslyFoundParent) {
                // If we had a prior parent but this is an explicit form, the previous was a false positive
                this.forms.delete(previouslyFoundParent)
            } else {
                // If we've already met the form or a descendant, add the input
                this.forms.get(previouslyFoundParent)?.addInput(input)
            }
        } else {
            // if this form is an ancestor of an existing form, remove that before adding this
            if (childForm) {
                this.forms.get(childForm)?.destroy()
                this.forms.delete(childForm)
            }

            // Only add the form if below the limit of forms per page
            if (this.forms.size < this.options.maxFormsPerPage) {
                this.forms.set(parentForm, new Form(parentForm, input, this.device, this.matching, this.shouldAutoprompt))
            } else {
                this.stopScanner('The page has too many forms, stop adding them.')
            }
        }
    }

    /**
     * enqueue elements to be re-scanned after the given
     * amount of time has elapsed.
     *
     * @param {(HTMLElement|Document)[]} htmlElements
     */
    enqueue (htmlElements) {
        // if the buffer limit is reached, stop trying to track elements and process body instead.
        if (this.changedElements.size >= this.options.bufferSize) {
            this.rescanAll = true
            this.changedElements.clear()
        } else if (!this.rescanAll) {
            // otherwise keep adding each element to the queue
            for (let element of htmlElements) {
                this.changedElements.add(element)
            }
        }

        clearTimeout(this.debounceTimer)
        this.debounceTimer = setTimeout(() => {
            window.performance?.mark?.('scanner:init:start')
            this.processChangedElements()
            this.changedElements.clear()
            this.rescanAll = false
            window.performance?.mark?.('scanner:init:end')
            logPerformance('scanner')
        }, this.options.debounceTimePeriod)
    }

    /**
     * re-scan the changed elements, but only if they
     * are still present in the DOM
     */
    processChangedElements () {
        if (this.rescanAll) {
            this.findEligibleInputs(document)
            return
        }
        for (let element of this.changedElements) {
            if (element.isConnected) {
                this.findEligibleInputs(element)
            }
        }
    }

    /**
     * Watch for changes in the DOM, and enqueue elements to be scanned
     * @type {MutationObserver}
     */
    mutObs = new MutationObserver((mutationList) => {
        /** @type {HTMLElement[]} */
        if (this.rescanAll) {
            // quick version if buffer full
            this.enqueue([])
            return
        }
        const outgoing = []
        for (const mutationRecord of mutationList) {
            if (mutationRecord.type === 'childList') {
                for (let addedNode of mutationRecord.addedNodes) {
                    if (!(addedNode instanceof HTMLElement)) continue
                    if (addedNode.nodeName === 'DDG-AUTOFILL') continue
                    outgoing.push(addedNode)
                }
            }
        }
        this.enqueue(outgoing)
    })
}

/**
 * @param {import("./DeviceInterface/InterfacePrototype").default} device
 * @param {Partial<ScannerOptions>} [scannerOptions]
 * @returns {Scanner}
 */
function createScanner (device, scannerOptions) {
    return new DefaultScanner(device, {
        ...defaultScannerOptions,
        ...scannerOptions
    })
}

export {
    createScanner
}
