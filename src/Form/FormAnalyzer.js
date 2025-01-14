import { removeExcessWhitespace, Matching } from './matching.js'
import { constants } from '../constants.js'
import { matchingConfiguration } from './matching-configuration.js'
import { getTextShallow, isLikelyASubmitButton } from '../autofill-utils.js'

class FormAnalyzer {
    /** @type HTMLElement */
    form;
    /** @type Matching */
    matching;
    /**
     * @param {HTMLElement} form
     * @param {HTMLInputElement|HTMLSelectElement} input
     * @param {Matching} [matching]
     */
    constructor (form, input, matching) {
        this.form = form
        this.matching = matching || new Matching(matchingConfiguration)

        /**
         * The signal is a continuum where negative values imply login and positive imply signup
         * @type {number}
         */
        this.autofillSignal = 0
        /**
         * A hybrid form can be either a login or a signup, the site uses a single form for both
         * @type {number}
         */
        this.hybridSignal = 0

        /**
         * Collects the signals for debugging purposes
         * @type {string[]}
         */
        this.signals = []

        this.evaluateElAttributes(input, 1, true)
        form ? this.evaluateForm() : this.evaluatePage()
        return this
    }

    /**
     * Hybrid forms can be used for both login and signup
     * @returns {boolean}
     */
    get isHybrid () {
        // When marking for hybrid we also want to ensure other signals are weak
        const areOtherSignalsWeak = Math.abs(this.autofillSignal) < 10

        return this.hybridSignal > 0 && areOtherSignalsWeak
    }

    get isLogin () {
        if (this.isHybrid) return false

        return this.autofillSignal < 0
    }

    get isSignup () {
        if (this.isHybrid) return false

        return this.autofillSignal >= 0
    }

    /**
     * Tilts the scoring towards Signup
     * @param {number} strength
     * @param {string} signal
     * @returns {FormAnalyzer}
     */
    increaseSignalBy (strength, signal) {
        this.autofillSignal += strength
        this.signals.push(`${signal}: +${strength}`)
        return this
    }

    /**
     * Tilts the scoring towards Login
     * @param {number} strength
     * @param {string} signal
     * @returns {FormAnalyzer}
     */
    decreaseSignalBy (strength, signal) {
        this.autofillSignal -= strength
        this.signals.push(`${signal}: -${strength}`)
        return this
    }

    /**
     * Increases the probability that this is a hybrid form (can be either login or signup)
     * @param {number} strength
     * @param {string} signal
     * @returns {FormAnalyzer}
     */
    increaseHybridSignal (strength, signal) {
        this.hybridSignal += strength
        this.signals.push(`${signal} (hybrid): +${strength}`)
        return this
    }

    /**
     * Updates the Login<->Signup signal according to the provided parameters
     * @param {object} p
     * @param {string} p.string - The string to check
     * @param {number} p.strength - Strength of the signal
     * @param {string} [p.signalType] - For debugging purposes, we give a name to the signal
     * @param {boolean} [p.shouldFlip] - Flips the signals, i.e. when a link points outside. See below
     * @param {boolean} [p.shouldCheckUnifiedForm] - Should check for login/signup forms
     * @param {boolean} [p.shouldBeConservative] - Should use the conservative signup regex
     * @returns {FormAnalyzer}
     */
    updateSignal ({
        string,
        strength,
        signalType = 'generic',
        shouldFlip = false,
        shouldCheckUnifiedForm = false,
        shouldBeConservative = false
    }) {
        const matchesLogin = /current.?password/i.test(string) || this.matching.getDDGMatcherRegex('loginRegex')?.test(string) || this.matching.getDDGMatcherRegex('resetPasswordLink')?.test(string)

        // Check explicitly for unified login/signup forms
        if (shouldCheckUnifiedForm && matchesLogin && this.matching.getDDGMatcherRegex('conservativeSignupRegex')?.test(string)) {
            this.increaseHybridSignal(strength, signalType)
            return this
        }

        const signupRegexToUse = this.matching.getDDGMatcherRegex(shouldBeConservative ? 'conservativeSignupRegex' : 'signupRegex')
        const matchesSignup = /new.?password/i.test(string) || signupRegexToUse?.test(string)

        // In some cases a login match means the login is somewhere else, i.e. when a link points outside
        if (shouldFlip) {
            if (matchesLogin) this.increaseSignalBy(strength, signalType)
            if (matchesSignup) this.decreaseSignalBy(strength, signalType)
        } else {
            if (matchesLogin) this.decreaseSignalBy(strength, signalType)
            if (matchesSignup) this.increaseSignalBy(strength, signalType)
        }
        return this
    }

    evaluateElAttributes (el, signalStrength = 3, isInput = false) {
        Array.from(el.attributes).forEach(attr => {
            if (attr.name === 'style') return

            const attributeString = `${attr.name}=${attr.value}`
            this.updateSignal({
                string: attributeString,
                strength: signalStrength,
                signalType: `${el.name} attr: ${attributeString}`,
                shouldCheckUnifiedForm: isInput
            })
        })
    }

    evaluateUrl () {
        const path = window.location.pathname

        const matchesLogin = this.matching.getDDGMatcherRegex('loginRegex')?.test(path)
        const matchesSignup = this.matching.getDDGMatcherRegex('conservativeSignupRegex')?.test(path)

        // If the url matches both, do nothing: the signal is probably confounding
        if (matchesLogin && matchesSignup) return

        if (matchesLogin) {
            this.decreaseSignalBy(1, 'url matches login')
        }

        if (matchesSignup) {
            this.increaseSignalBy(1, 'url matches signup')
        }
    }

    evaluatePageTitle () {
        const pageTitle = document.title
        this.updateSignal({string: pageTitle, strength: 2, signalType: `page title: ${pageTitle}`, shouldCheckUnifiedForm: true})
    }

    evaluatePageHeadings () {
        const headings = document.querySelectorAll('h1, h2, h3, [class*="title"], [id*="title"]')
        headings.forEach(({textContent}) => {
            textContent = removeExcessWhitespace(textContent || '')
            this.updateSignal({
                string: textContent,
                strength: 0.5,
                signalType: `heading: ${textContent}`,
                shouldCheckUnifiedForm: true,
                shouldBeConservative: true
            })
        })
    }

    evaluatePage () {
        this.evaluatePageTitle()
        this.evaluatePageHeadings()
        // Check for submit buttons
        const buttons = document.querySelectorAll(this.matching.cssSelector('submitButtonSelector'))
        buttons.forEach(button => {
            // if the button has a form, it's not related to our input, because our input has no form here
            if (button instanceof HTMLButtonElement) {
                if (!button.form && !button.closest('form')) {
                    this.evaluateElement(button)
                    this.evaluateElAttributes(button, 0.5)
                }
            }
        })
    }

    evaluateElement (el) {
        const string = getTextShallow(el)

        if (el.matches(this.matching.cssSelector('password'))) {
            // These are explicit signals by the web author, so we weigh them heavily
            this.updateSignal({
                string: el.getAttribute('autocomplete') || el.getAttribute('name') || '',
                strength: 5,
                signalType: `explicit: ${el.getAttribute('autocomplete')}`
            })
            return
        }

        // check button contents
        if (el.matches(this.matching.cssSelector('submitButtonSelector') + ', *[class*=button]')) {
            // If we're confident this is the submit button, it's a stronger signal
            let likelyASubmit = isLikelyASubmitButton(el, this.matching)
            if (likelyASubmit) {
                this.form.querySelectorAll('input[type=submit], button[type=submit]').forEach(
                    (submit) => {
                        // If there is another element marked as submit and this is not, flip back to false
                        if (el.type !== 'submit' && el !== submit) {
                            likelyASubmit = false
                        }
                    }
                )
            }
            const strength = likelyASubmit ? 20 : 2
            this.updateSignal({string, strength, signalType: `submit: ${string}`})
            return
        }
        // if an external link matches one of the regexes, we assume the match is not pertinent to the current form
        if (
            (el instanceof HTMLAnchorElement && el.href && el.getAttribute('href') !== '#') ||
            (el.getAttribute('role') || '').toUpperCase() === 'LINK' ||
            el.matches('button[class*=secondary]')
        ) {
            let shouldFlip = true
            let strength = 1
            // Don't flip forgotten password links
            if (this.matching.getDDGMatcherRegex('resetPasswordLink')?.test(string)) {
                shouldFlip = false
                strength = 3
            } else if (this.matching.getDDGMatcherRegex('loginProvidersRegex')?.test(string)) {
                // Don't flip login providers links
                shouldFlip = false
            }
            this.updateSignal({string, strength, signalType: `external link: ${string}`, shouldFlip})
        } else {
            // any other case
            // only consider the el if it's a small text to avoid noisy disclaimers
            if (removeExcessWhitespace(el.textContent)?.length < constants.TEXT_LENGTH_CUTOFF) {
                this.updateSignal({string, strength: 1, signalType: `generic: ${string}`, shouldCheckUnifiedForm: true})
            }
        }
    }

    evaluateForm () {
        // Check page url
        this.evaluateUrl()

        // Check page title
        this.evaluatePageTitle()

        // Check form attributes
        this.evaluateElAttributes(this.form)

        // Check form contents (noisy elements are skipped with the safeUniversalSelector)
        this.form.querySelectorAll(this.matching.cssSelector('safeUniversalSelector')).forEach(el => {
            // Check if element is not hidden. Note that we can't use offsetHeight
            // nor intersectionObserver, because the element could be outside the
            // viewport or its parent hidden
            const displayValue = window.getComputedStyle(el, null).getPropertyValue('display')
            if (displayValue !== 'none') this.evaluateElement(el)
        })

        // A form with many fields is unlikely to be a login form
        const relevantFields = this.form.querySelectorAll(this.matching.cssSelector('genericTextField'))
        if (relevantFields.length >= 4) {
            this.increaseSignalBy(relevantFields.length * 1.5, 'many fields: it is probably not a login')
        }

        // If we can't decide at this point, try reading page headings
        if (this.autofillSignal === 0) {
            this.evaluatePageHeadings()
        }
        return this
    }

    /** @type {undefined|boolean} */
    _isCCForm = undefined
    /**
     * Tries to infer if it's a credit card form
     * @returns {boolean}
     */
    isCCForm () {
        if (this._isCCForm !== undefined) return this._isCCForm

        const formEl = this.form
        const ccFieldSelector = this.matching.joinCssSelectors('cc')
        if (!ccFieldSelector) {
            this._isCCForm = false
            return this._isCCForm
        }
        const hasCCSelectorChild = formEl.matches(ccFieldSelector) || formEl.querySelector(ccFieldSelector)
        // If the form contains one of the specific selectors, we have high confidence
        if (hasCCSelectorChild) {
            this._isCCForm = true
            return this._isCCForm
        }

        // Read form attributes to find a signal
        const hasCCAttribute = [...formEl.attributes].some(({name, value}) =>
            /(credit|payment).?card/i.test(`${name}=${value}`)
        )
        if (hasCCAttribute) {
            this._isCCForm = true
            return this._isCCForm
        }

        // Match form textContent against common cc fields (includes hidden labels)
        const textMatches = formEl.textContent?.match(/(credit|payment).?card(.?number)?|ccv|security.?code|cvv|cvc|csc/ig)

        // We check for more than one to minimise false positives
        this._isCCForm = Boolean(textMatches && textMatches.length > 1)
        return this._isCCForm
    }
}

export default FormAnalyzer
