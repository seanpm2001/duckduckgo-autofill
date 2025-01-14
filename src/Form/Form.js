import FormAnalyzer from './FormAnalyzer.js'

import {
    addInlineStyles,
    removeInlineStyles,
    setValue,
    isEventWithinDax,
    isLikelyASubmitButton,
    isPotentiallyViewable, buttonMatchesFormType,
    safeExecute, getTextShallow, wasAutofilledByChrome, shouldLog
} from '../autofill-utils.js'

import {getInputSubtype, getInputMainType, createMatching, safeRegex} from './matching.js'
import { getIconStylesAutofilled, getIconStylesBase, getIconStylesAlternate } from './inputStyles.js'
import {canBeInteractedWith, getInputConfig, isFieldDecorated} from './inputTypeConfig.js'

import {
    getUnifiedExpiryDate,
    formatCCYear,
    getCountryName,
    prepareFormValuesForStorage,
    inferCountryCodeFromElement
} from './formatters.js'

import {constants} from '../constants.js'
const {
    ATTR_AUTOFILL,
    ATTR_INPUT_TYPE,
    MAX_FORM_MUT_OBS_COUNT,
    MAX_INPUTS_PER_FORM
} = constants

class Form {
    /** @type {import("../Form/matching").Matching} */
    matching;
    /** @type {HTMLElement} */
    form;
    /** @type {HTMLInputElement | null} */
    activeInput;
    /**
     * @param {HTMLElement} form
     * @param {HTMLInputElement|HTMLSelectElement} input
     * @param {import("../DeviceInterface/InterfacePrototype").default} deviceInterface
     * @param {import("../Form/matching").Matching} [matching]
     * @param {Boolean} [shouldAutoprompt]
     */
    constructor (form, input, deviceInterface, matching, shouldAutoprompt = false) {
        this.form = form
        this.matching = matching || createMatching()
        this.formAnalyzer = new FormAnalyzer(form, input, matching)
        this.device = deviceInterface

        /** @type Record<'all' | SupportedMainTypes, Set> */
        this.inputs = {
            all: new Set(),
            credentials: new Set(),
            creditCards: new Set(),
            identities: new Set(),
            unknown: new Set()
        }

        this.touched = new Set()
        this.listeners = new Set()
        this.activeInput = null
        // We set this to true to skip event listeners while we're autofilling
        this.isAutofilling = false
        this.handlerExecuted = false
        this.shouldPromptToStoreData = true
        this.shouldAutoSubmit = this.device.globalConfig.isMobileApp

        /**
         * @type {IntersectionObserver | null}
         */
        this.intObs = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) this.removeTooltip()
            }
        })

        this.mutObsCount = 0
        this.mutObsConfig = { childList: true, subtree: true }
        this.mutObs = new MutationObserver(
            (records) => {
                const anythingRemoved = records.some(record => record.removedNodes.length > 0)
                if (anythingRemoved) {
                    // Must check for inputs because a parent may be removed and not show up in record.removedNodes
                    if ([...this.inputs.all].some(input => !input.isConnected)) {
                        // If any known input has been removed from the DOM, reanalyze the whole form
                        window.requestIdleCallback(() => {
                            this.formAnalyzer = new FormAnalyzer(this.form, input, this.matching)
                            this.recategorizeAllInputs()
                        })

                        this.mutObsCount++
                        // If the form mutates too much, disconnect to avoid performance issues
                        if (this.mutObsCount >= MAX_FORM_MUT_OBS_COUNT) {
                            this.mutObs.disconnect()
                        }
                    }
                }
            }
        )

        // This ensures we fire the handler again if the form is changed
        this.addListener(form, 'input', () => {
            if (!this.isAutofilling) {
                this.handlerExecuted = false
                this.shouldPromptToStoreData = true
            }
        })

        this.categorizeInputs()
        this.mutObs.observe(this.form, this.mutObsConfig)

        this.logFormInfo()

        if (shouldAutoprompt) {
            this.promptLoginIfNeeded()
        }
    }

    get isLogin () {
        return this.formAnalyzer.isLogin
    }
    get isSignup () {
        return this.formAnalyzer.isSignup
    }
    get isHybrid () {
        return this.formAnalyzer.isHybrid
    }
    get isCCForm () {
        return this.formAnalyzer.isCCForm()
    }

    logFormInfo () {
        if (!shouldLog()) return

        console.log(`Form type: %c${this.getFormType()}`, 'font-weight: bold')
        console.log('Signals: ', this.formAnalyzer.signals)
        console.log('Wrapping element: ', this.form)
        console.log('Inputs: ', this.inputs)
        console.log('Submit Buttons: ', this.submitButtons)
    }

    getFormType () {
        if (this.isHybrid) return `hybrid (hybrid score: ${this.formAnalyzer.hybridSignal}, score: ${this.formAnalyzer.autofillSignal})`
        if (this.isLogin) return `login (score: ${this.formAnalyzer.autofillSignal}, hybrid score: ${this.formAnalyzer.hybridSignal})`
        if (this.isSignup) return `signup (score: ${this.formAnalyzer.autofillSignal}, hybrid score: ${this.formAnalyzer.hybridSignal})`

        return 'something went wrong'
    }

    /**
     * Checks if the form element contains the activeElement or the event target
     * @return {boolean}
     * @param {KeyboardEvent | null} [e]
     */
    hasFocus (e) {
        return this.form.contains(document.activeElement) || this.form.contains(/** @type HTMLElement */(e?.target))
    }

    submitHandler (via = 'unknown') {
        if (this.device.globalConfig.isDDGTestMode) {
            console.log('Form.submitHandler via:', via, this)
        }

        if (this.handlerExecuted) return

        const values = this.getValuesReadyForStorage()

        this.device.postSubmit?.(values, this)

        // mark this form as being handled
        this.handlerExecuted = true
    }

    /**
     * Reads the values from the form without preparing to store them
     * @return {InternalDataStorageObject}
     */
    getRawValues () {
        const formValues = [...this.inputs.credentials, ...this.inputs.identities, ...this.inputs.creditCards]
            .reduce((output, inputEl) => {
                const mainType = getInputMainType(inputEl)
                const subtype = getInputSubtype(inputEl)
                let value = inputEl.value || output[mainType]?.[subtype]
                if (subtype === 'addressCountryCode') {
                    value = inferCountryCodeFromElement(inputEl)
                }
                // Discard passwords that are shorter than 4 characters
                if (subtype === 'password' && value?.length <= 3) {
                    value = undefined
                }
                if (value) {
                    output[mainType][subtype] = value
                }
                return output
            }, {credentials: {}, creditCards: {}, identities: {}})

        if (
            formValues.credentials.password &&
            !formValues.credentials.username &&
            !formValues.identities.emailAddress
        ) {
            // If we have a password but no username, let's search further
            const hiddenFields = /** @type [HTMLInputElement] */([...this.form.querySelectorAll('input[type=hidden]')])
            const probableField = hiddenFields.find((field) => {
                const regex = safeRegex('email|' + this.matching.ddgMatcher('username')?.match)
                const attributeText = field.id + ' ' + field.name
                return regex?.test(attributeText)
            })
            if (probableField?.value) {
                formValues.credentials.username = probableField.value
            } else if (
                // If a form has phone + password(s) fields, save the phone as username
                formValues.identities.phone &&
                this.inputs.all.size - this.inputs.unknown.size < 4
            ) {
                formValues.credentials.username = formValues.identities.phone
            } else {
                // If we still don't have a username, try scanning the form's text for an email address
                this.form.querySelectorAll(this.matching.cssSelector('safeUniversalSelector')).forEach((el) => {
                    const elText = getTextShallow(el)
                    // Ignore long texts to avoid false positives
                    if (elText.length > 70) return

                    const emailOrUsername = elText.match(
                        // https://www.emailregex.com/
                        /[a-zA-Z\d.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z\d-]+(?:\.[a-zA-Z\d-]+)*/
                    )?.[0]
                    if (emailOrUsername) {
                        formValues.credentials.username = emailOrUsername
                    }
                })
            }
        }

        return formValues
    }

    /**
     * Return form values ready for storage
     * @returns {DataStorageObject}
     */
    getValuesReadyForStorage () {
        const formValues = this.getRawValues()
        return prepareFormValuesForStorage(formValues)
    }

    /**
     * Determine if the form has values we want to store in the device
     * @param {DataStorageObject} [values]
     * @return {boolean}
     */
    hasValues (values) {
        const {credentials, creditCards, identities} = values || this.getValuesReadyForStorage()

        return Boolean(credentials || creditCards || identities)
    }

    async removeTooltip () {
        const tooltip = this.device.isTooltipActive()
        if (
            this.isAutofilling ||
            !tooltip
        ) {
            return
        }
        await this.device.removeTooltip()
        this.intObs?.disconnect()
    }

    showingTooltip (input) {
        this.intObs?.observe(input)
    }

    removeInputHighlight (input) {
        if (!input.classList.contains('ddg-autofilled')) return

        removeInlineStyles(input, getIconStylesAutofilled(input, this))
        removeInlineStyles(input, {'cursor': 'pointer'})
        input.classList.remove('ddg-autofilled')
        this.addAutofillStyles(input)
    }

    resetIconStylesToInitial () {
        const input = this.activeInput
        if (input) {
            const initialStyles = getIconStylesBase(input, this)
            addInlineStyles(input, initialStyles)
        }
    }

    removeAllHighlights (e, dataType) {
        // This ensures we are not removing the highlight ourselves when autofilling more than once
        if (e && !e.isTrusted) return

        // If the user has changed the value, we prompt to update the stored data
        this.shouldPromptToStoreData = true

        this.execOnInputs((input) => this.removeInputHighlight(input), dataType)
    }

    removeInputDecoration (input) {
        removeInlineStyles(input, getIconStylesBase(input, this))
        removeInlineStyles(input, getIconStylesAlternate(input, this))
        input.removeAttribute(ATTR_AUTOFILL)
        input.removeAttribute(ATTR_INPUT_TYPE)
    }
    removeAllDecorations () {
        this.execOnInputs((input) => this.removeInputDecoration(input))
        this.listeners.forEach(({el, type, fn, opts}) => el.removeEventListener(type, fn, opts))
    }
    redecorateAllInputs () {
        this.removeAllDecorations()
        this.execOnInputs((input) => {
            if (input instanceof HTMLInputElement) {
                this.decorateInput(input)
            }
        })
    }

    /**
     * Removes all scoring attributes from the inputs and deletes them from memory
     */
    forgetAllInputs () {
        this.execOnInputs((input) => {
            input.removeAttribute(ATTR_AUTOFILL)
            input.removeAttribute(ATTR_INPUT_TYPE)
        })
        Object.values(this.inputs).forEach((inputSet) => inputSet.clear())
    }

    /**
     * Resets our input scoring and starts from scratch
     */
    recategorizeAllInputs () {
        this.initialScanComplete = false
        this.removeAllDecorations()
        this.forgetAllInputs()
        this.categorizeInputs()
    }
    resetAllInputs () {
        this.execOnInputs((input) => {
            setValue(input, '', this.device.globalConfig)
            this.removeInputHighlight(input)
        })
        if (this.activeInput) this.activeInput.focus()
        this.matching.clear()
    }
    dismissTooltip () {
        this.removeTooltip()
    }
    // This removes all listeners to avoid memory leaks and weird behaviours
    destroy () {
        this.removeAllDecorations()
        this.removeTooltip()
        this.forgetAllInputs()
        this.mutObs.disconnect()
        this.matching.clear()
        this.intObs = null
    }

    categorizeInputs () {
        const selector = this.matching.cssSelector('formInputsSelector')
        if (this.form.matches(selector)) {
            this.addInput(this.form)
        } else {
            let foundInputs = this.form.querySelectorAll(selector)
            // If the markup is broken form.querySelectorAll may not return the fields, so we select from the parent
            if (foundInputs.length === 0 && this.form instanceof HTMLFormElement && this.form.length > 0) {
                foundInputs = this.form.parentElement?.querySelectorAll(selector) || foundInputs
            }
            if (foundInputs.length < MAX_INPUTS_PER_FORM) {
                foundInputs.forEach(input => this.addInput(input))
            } else {
                if (shouldLog()) {
                    console.log('The form has too many inputs, bailing.')
                }
            }
        }
        this.initialScanComplete = true
    }

    get submitButtons () {
        const selector = this.matching.cssSelector('submitButtonSelector')
        const allButtons = /** @type {HTMLElement[]} */([...this.form.querySelectorAll(selector)])

        return allButtons
            .filter((btn) =>
                isPotentiallyViewable(btn) && isLikelyASubmitButton(btn, this.matching) && buttonMatchesFormType(btn, this)
            )
    }

    attemptSubmissionIfNeeded () {
        if (
            !this.isLogin || // Only submit login forms
            this.submitButtons.length > 1 // Do not submit if we're unsure about the submit button
        ) return

        // check for visible empty fields before attemtping submission
        // this is to avoid loops where a captcha keeps failing for the user
        let isThereAnEmptyVisibleField = false
        this.execOnInputs((input) => {
            if (input.value === '' && isPotentiallyViewable(input)) isThereAnEmptyVisibleField = true
        }, 'all', false)
        if (isThereAnEmptyVisibleField) return

        // We're not using .submit() to minimise breakage with client-side forms
        this.submitButtons.forEach((button) => {
            if (isPotentiallyViewable(button)) {
                button.click()
            }
        })
    }

    /**
     * Executes a function on input elements. Can be limited to certain element types
     * @param {(input: HTMLInputElement|HTMLSelectElement) => void} fn
     * @param {'all' | SupportedMainTypes} inputType
     * @param {boolean} shouldCheckForDecorate
     */
    execOnInputs (fn, inputType = 'all', shouldCheckForDecorate = true) {
        const inputs = this.inputs[inputType]
        for (const input of inputs) {
            let canExecute = true
            // sometimes we want to execute even if we didn't decorate
            if (shouldCheckForDecorate) {
                canExecute = isFieldDecorated(input)
            }
            if (canExecute) fn(input)
        }
    }

    addInput (input) {
        if (this.inputs.all.has(input)) return this

        // If the form has too many inputs, destroy everything to avoid performance issues
        if (this.inputs.all.size > MAX_INPUTS_PER_FORM) {
            if (shouldLog()) {
                console.log('The form has too many inputs, destroying.')
            }
            this.destroy()
            return this
        }

        // When new inputs are added after the initial scan, reanalyze the whole form
        if (this.initialScanComplete) {
            this.formAnalyzer = new FormAnalyzer(this.form, input, this.matching)
            this.recategorizeAllInputs()
            return this
        }

        // Nothing to do with 1-character fields
        if (input.maxLength === 1) return this

        this.inputs.all.add(input)

        const opts = {
            isLogin: this.isLogin,
            isHybrid: this.isHybrid,
            isCCForm: this.isCCForm,
            hasCredentials: Boolean(this.device.settings.availableInputTypes.credentials?.username),
            supportsIdentitiesAutofill: this.device.settings.featureToggles.inputType_identities
        }
        this.matching.setInputType(input, this.form, opts)

        const mainInputType = getInputMainType(input)
        this.inputs[mainInputType].add(input)

        this.decorateInput(input)

        return this
    }

    /**
     * Adds event listeners and keeps track of them for subsequent removal
     * @param {HTMLElement} el
     * @param {Event['type']} type
     * @param {(Event) => void} fn
     * @param {AddEventListenerOptions} [opts]
     */
    addListener (el, type, fn, opts) {
        el.addEventListener(type, fn, opts)
        this.listeners.add({el, type, fn, opts})
    }

    addAutofillStyles (input) {
        const initialStyles = getIconStylesBase(input, this)
        const activeStyles = getIconStylesAlternate(input, this)

        addInlineStyles(input, initialStyles)
        return {
            onMouseMove: activeStyles,
            onMouseLeave: initialStyles
        }
    }

    /**
     * Decorate here means adding listeners and an optional icon
     * @param {HTMLInputElement} input
     * @returns {Promise<Form>}
     */
    async decorateInput (input) {
        const config = getInputConfig(input)

        const shouldDecorate = await config.shouldDecorate(input, this)
        if (!shouldDecorate) return this

        input.setAttribute(ATTR_AUTOFILL, 'true')

        const hasIcon = !!config.getIconBase(input, this)
        if (hasIcon) {
            const { onMouseMove, onMouseLeave } = this.addAutofillStyles(input)
            this.addListener(input, 'mousemove', (e) => {
                if (wasAutofilledByChrome(input)) return

                if (isEventWithinDax(e, e.target)) {
                    addInlineStyles(e.target, {
                        'cursor': 'pointer',
                        ...onMouseMove
                    })
                } else {
                    removeInlineStyles(e.target, {'cursor': 'pointer'})
                    // Only overwrite active icon styles if tooltip is closed
                    if (!this.device.isTooltipActive()) {
                        addInlineStyles(e.target, { ...onMouseLeave })
                    }
                }
            })
            this.addListener(input, 'mouseleave', (e) => {
                removeInlineStyles(e.target, {'cursor': 'pointer'})
                // Only overwrite active icon styles if tooltip is closed
                if (!this.device.isTooltipActive()) {
                    addInlineStyles(e.target, { ...onMouseLeave })
                }
            })
        }

        /**
         * @param {PointerEvent} e
         * @returns {{ x: number; y: number; } | undefined}
         */
        function getMainClickCoords (e) {
            if (!e.isTrusted) return
            const isMainMouseButton = e.button === 0
            if (!isMainMouseButton) return
            return {
                x: e.clientX,
                y: e.clientY
            }
        }

        /**
         * @param {Event} e
         * @param {WeakMap} storedClickCoords
         * @returns {{ x: number; y: number; } | null}
         */
        function getClickCoords (e, storedClickCoords) {
            // Get click co-ordinates for pointer events
            // We need click coordinates to position the tooltip when the field is in an iframe
            if (e.type === 'pointerdown') {
                return getMainClickCoords(/** @type {PointerEvent} */ (e)) || null
            }

            // Reuse a previous click co-ordinates if they exist for this element
            const click = storedClickCoords.get(input)
            storedClickCoords.delete(input)
            return click || null
        }

        // Store the click to a label so we can use the click when the field is focused
        // Needed to handle label clicks when the form is in an iframe
        let storedClickCoords = new WeakMap()
        let timeout = null

        /**
         * @param {PointerEvent} e
         */
        const handlerLabel = (e) => {
            // Look for e.target OR it's closest parent to be a HTMLLabelElement
            const control = /** @type HTMLElement */(e.target)?.closest('label')?.control
            if (!control) return

            if (e.isTrusted) {
                storedClickCoords.set(control, getMainClickCoords(e))
            }

            clearTimeout(timeout)
            // Remove the stored click if the timer expires
            timeout = setTimeout(() => {
                storedClickCoords = new WeakMap()
            }, 1000)
        }

        const handler = (e) => {
            // Avoid firing multiple times
            if (this.isAutofilling || this.device.isTooltipActive()) {
                return
            }

            // On mobile, we don't trigger on focus, so here we get the target control on label click
            const isLabel = e.target instanceof HTMLLabelElement
            const input = isLabel ? e.target.control : e.target
            if (!input || !this.inputs.all.has(input)) return

            if (wasAutofilledByChrome(input)) return

            if (!canBeInteractedWith(input)) return

            const clickCoords = getClickCoords(e, storedClickCoords)

            if (e.type === 'pointerdown') {
                // Only allow real user clicks with co-ordinates through
                if (!e.isTrusted || !clickCoords) return
            }

            if (this.shouldOpenTooltip(e, input)) {
                const iconClicked = isEventWithinDax(e, input)
                // On mobile and extensions we don't trigger the focus event to avoid
                // keyboard flashing and conflicts with browsers' own tooltips
                if (
                    (this.device.globalConfig.isMobileApp || this.device.globalConfig.isExtension) &&
                    // Avoid the icon capturing clicks on small fields making it impossible to focus
                    input.offsetWidth > 50 &&
                    iconClicked
                ) {
                    e.preventDefault()
                    e.stopImmediatePropagation()
                    input.blur()
                }

                this.touched.add(input)
                this.device.attachTooltip({
                    form: this,
                    input: input,
                    click: clickCoords,
                    trigger: 'userInitiated',
                    triggerMetaData: {
                        // An 'icon' click is very different to a field click or focus.
                        // It indicates an explicit opt-in to the feature.
                        type: iconClicked ? 'explicit-opt-in' : 'implicit-opt-in'
                    }
                })

                const activeStyles = getIconStylesAlternate(input, this)
                addInlineStyles(input, activeStyles)
            }
        }

        if (!(input instanceof HTMLSelectElement)) {
            const events = ['pointerdown']
            if (!this.device.globalConfig.isMobileApp) events.push('focus')
            input.labels?.forEach((label) => {
                if (this.device.globalConfig.isMobileApp) {
                    // On mobile devices we don't trigger on focus, so we use the click handler here
                    this.addListener(label, 'pointerdown', handler)
                } else {
                    // Needed to handle label clicks when the form is in an iframe
                    this.addListener(label, 'pointerdown', handlerLabel)
                }
            })
            events.forEach((ev) => this.addListener(input, ev, handler))
        }
        return this
    }

    shouldOpenTooltip (e, input) {
        if (!isPotentiallyViewable(input)) return false

        // Always open if the user has clicked on the Dax icon
        if (isEventWithinDax(e, input)) return true
        if (this.device.globalConfig.isWindows) return true

        const subtype = getInputSubtype(input)
        const isIncontextSignupAvailable = this.device.inContextSignup?.isAvailable(subtype)

        if (this.device.globalConfig.isApp) {
            const mainType = getInputMainType(input)
            // Check if, without in-context signup (passed as `null` below),
            // we'd have any other items to show. This lets us know if we're
            // just showing in-context signup, or with other autofill items.
            const hasSavedDetails = this.device.settings.canAutofillType({ mainType, subtype }, null)

            // Don't open the tooltip on input focus whenever it'll only show in-context signup
            if (!hasSavedDetails && isIncontextSignupAvailable) return false
            return true
        }

        if (this.device.globalConfig.isExtension || this.device.globalConfig.isMobileApp) {
            // Don't open the tooltip on input focus whenever it's showing in-context signup
            if (isIncontextSignupAvailable) return false
        }

        return (!this.touched.has(input) && !input.classList.contains('ddg-autofilled'))
    }

    autofillInput (input, string, dataType) {
        // Do not autofill if it's invisible (select elements can be hidden because of custom implementations)
        if (input instanceof HTMLInputElement && !isPotentiallyViewable(input)) return
        // Do not autofill if it's disabled or readonly to avoid potential breakage
        if (!canBeInteractedWith(input)) return

        // @ts-ignore
        const activeInputSubtype = getInputSubtype(this.activeInput)
        const inputSubtype = getInputSubtype(input)
        const isEmailAutofill = activeInputSubtype === 'emailAddress' && inputSubtype === 'emailAddress'

        // Don't override values for identities, unless it's the current input or we're autofilling email
        if (
            dataType === 'identities' && // only for identities
            input.nodeName !== 'SELECT' && input.value !== '' && // if the input is not empty
            this.activeInput !== input && // and this is not the active input
            !isEmailAutofill // and we're not auto-filling email
        ) return // do not overwrite the value

        // If the value is already there, just return
        if (input.value === string) return

        const successful = setValue(input, string, this.device.globalConfig)

        if (!successful) return

        input.classList.add('ddg-autofilled')
        addInlineStyles(input, getIconStylesAutofilled(input, this))
        this.touched.add(input)

        // If the user changes the value, remove the decoration
        input.addEventListener('input', (e) => this.removeAllHighlights(e, dataType), {once: true})
    }

    /**
     * Autofill method for email protection only
     * @param {string} alias
     * @param {'all' | SupportedMainTypes} dataType
     */
    autofillEmail (alias, dataType = 'identities') {
        this.isAutofilling = true
        this.execOnInputs(
            (input) => {
                const inputSubtype = getInputSubtype(input)
                if (inputSubtype === 'emailAddress') {
                    this.autofillInput(input, alias, dataType)
                }
            },
            dataType
        )
        this.isAutofilling = false
        this.removeTooltip()
    }

    autofillData (data, dataType) {
        this.isAutofilling = true

        this.execOnInputs((input) => {
            const inputSubtype = getInputSubtype(input)
            let autofillData = data[inputSubtype]

            if (inputSubtype === 'expiration' && input instanceof HTMLInputElement) {
                autofillData = getUnifiedExpiryDate(input, data.expirationMonth, data.expirationYear, this)
            }

            if (inputSubtype === 'expirationYear' && input instanceof HTMLInputElement) {
                autofillData = formatCCYear(input, autofillData, this)
            }

            if (inputSubtype === 'addressCountryCode') {
                autofillData = getCountryName(input, data)
            }

            if (autofillData) {
                this.autofillInput(input, autofillData, dataType)
            }
        }, dataType)

        this.isAutofilling = false

        // After autofill we check if form values match the data provided…
        const formValues = this.getValuesReadyForStorage()
        const areAllFormValuesKnown = Object.keys(formValues[dataType] || {})
            .every((subtype) => formValues[dataType][subtype] === data[subtype])
        if (areAllFormValuesKnown) {
            // …if we know all the values do not prompt to store data
            this.shouldPromptToStoreData = false
            // reset this to its initial value
            this.shouldAutoSubmit = this.device.globalConfig.isMobileApp
        } else {
            // …otherwise we will prompt and do not want to autosubmit because the experience is jarring
            this.shouldAutoSubmit = false
        }

        this.device.postAutofill?.(data, dataType, this)

        this.removeTooltip()
    }

    /**
     * Set all inputs of the data type to "touched"
     * @param {'all' | SupportedMainTypes} dataType
     */
    touchAllInputs (dataType = 'all') {
        this.execOnInputs(
            (input) => this.touched.add(input),
            dataType
        )
    }

    getFirstViableCredentialsInput () {
        return [...this.inputs.credentials].find((input) => canBeInteractedWith(input) && isPotentiallyViewable(input))
    }

    async promptLoginIfNeeded () {
        if (document.visibilityState !== 'visible' || !this.isLogin) return

        const firstCredentialInput = this.getFirstViableCredentialsInput()
        const input = this.activeInput || firstCredentialInput
        if (!input) return

        const mainType = getInputMainType(input)
        const subtype = getInputSubtype(input)
        await this.device.settings.populateDataIfNeeded({ mainType, subtype })
        if (this.device.settings.canAutofillType({ mainType, subtype }, this.device.inContextSignup)) {
            // The timeout is needed in case the page shows a cookie prompt with a slight delay
            setTimeout(() => {
                // safeExecute checks that the element is on screen according to IntersectionObserver
                safeExecute(this.form, () => {
                    const {x, y, width, height} = this.form.getBoundingClientRect()
                    const elHCenter = x + (width / 2)
                    const elVCenter = y + (height / 2)
                    // This checks that the form is not covered by anything else
                    const topMostElementFromPoint = document.elementFromPoint(elHCenter, elVCenter)
                    if (this.form.contains(topMostElementFromPoint)) {
                        this.execOnInputs((input) => {
                            if (isPotentiallyViewable(input)) {
                                this.touched.add(input)
                            }
                        }, 'credentials')
                        this.device.attachTooltip({
                            form: this,
                            input: input,
                            click: null,
                            trigger: 'autoprompt',
                            triggerMetaData: {
                                type: 'implicit-opt-in'
                            }
                        })
                    }
                })
            }, 200)
        }
    }
}

export { Form }
