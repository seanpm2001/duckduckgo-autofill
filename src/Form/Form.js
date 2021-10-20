const FormAnalyzer = require('./FormAnalyzer')
const {PASSWORD_SELECTOR, SUBMIT_BUTTON_SELECTOR, GENERIC_TEXT_FIELD} = require('./selectors')
const {addInlineStyles, removeInlineStyles, isDDGApp, isApp, setValue, isEventWithinDax} = require('../autofill-utils')
const {getInputType} = require('./input-classifiers')
const {getIconStylesAutofilled, getIconStylesBase} = require('./inputStyles')
const {ATTR_AUTOFILL, ATTR_INPUT_TYPE} = require('../constants')
const getInputConfig = require('./inputTypeConfig')

class Form {
    constructor (form, input, DeviceInterface) {
        this.form = form
        this.formAnalyzer = new FormAnalyzer(form, input)
        this.isLogin = this.formAnalyzer.isLogin
        this.isSignup = this.formAnalyzer.isSignup
        this.Device = DeviceInterface
        this.attachTooltip = DeviceInterface.attachTooltip
        this.allInputs = new Set()
        this.emailNewInputs = new Set()
        this.emailLoginInputs = new Set()
        this.passwordInputs = new Set()
        this.usernameInputs = new Set()
        this.ccInputs = new Set()
        this.unknownInputs = new Set()

        this.inputs = new Map([
            ['all', this.allInputs],
            ['passwords', this.passwordInputs],
            ['emailNew', this.emailNewInputs],
            ['emailLogin', this.emailLoginInputs],
            ['usernames', this.usernameInputs],
            ['ccInputs', this.ccInputs],
            ['unknownInputs', this.unknownInputs]
        ])

        this.touched = new Set()
        this.listeners = new Set()
        this.tooltip = null
        this.activeInput = null
        this.handlerExecuted = false
        this.shouldPromptToStoreCredentials = true

        this.submitHandler = () => {
            if (this.handlerExecuted) return

            const credentials = this.getValues()
            if (credentials.password) {
                // ask to store credentials and/or fireproof
                if (this.shouldPromptToStoreCredentials) {
                    this.Device.storeCredentials(credentials)
                }
                this.handlerExecuted = true
            }
        }

        this.getValues = () => {
            const username =
                [...this.usernameInputs].reduce((prev, curr) => curr.value ? curr.value : prev, '') ||
                [...this.emailNewInputs].reduce((prev, curr) => curr.value ? curr.value : prev, '') ||
                [...this.emailLoginInputs].reduce((prev, curr) => curr.value ? curr.value : prev, '')
            const password = [...this.passwordInputs].reduce((prev, curr) => curr.value ? curr.value : prev, '')
            return {username, password}
        }

        this.hasValues = () => {
            const {username, password} = this.getValues()
            return !!(username && password)
        }

        this.intObs = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) this.removeTooltip()
            }
        })

        this.removeTooltip = (e) => {
            if (
                !this.tooltip ||
                (e && e.target === this.tooltip.host)
            ) {
                return
            }
            this.tooltip.remove()
            this.tooltip = null
            this.intObs.disconnect()
            window.removeEventListener('mousedown', this.removeTooltip, {capture: true})
        }
        this.removeInputHighlight = (input) => {
            removeInlineStyles(input, getIconStylesAutofilled(input, this.isLogin))
            input.classList.remove('ddg-autofilled')
            this.addAutofillStyles(input)
        }
        this.removeAllHighlights = (e) => {
            // This ensures we are not removing the highlight ourselves when autofilling more than once
            if (e && !e.isTrusted) return

            // If the user has changed the value, we prompt to update the stored creds
            this.shouldPromptToStoreCredentials = true

            this.execOnInputs(this.removeInputHighlight)
        }
        this.removeInputDecoration = (input) => {
            removeInlineStyles(input, getIconStylesBase(input, this.isLogin))
            input.removeAttribute(ATTR_AUTOFILL)
        }
        this.removeAllDecorations = () => {
            this.execOnInputs(this.removeInputDecoration)
            this.listeners.forEach(({el, type, fn}) => el.removeEventListener(type, fn))
        }
        this.redecorateAllInputs = () => {
            this.removeAllDecorations()
            this.execOnInputs(this.decorateInput)
        }
        this.resetAllInputs = () => {
            this.execOnInputs((input) => {
                setValue(input, '')
                this.removeInputHighlight(input)
            })
            if (this.activeInput) this.activeInput.focus()
        }
        this.dismissTooltip = () => {
            this.removeTooltip()
        }
        this.categorizeInputs()

        return this
    }

    categorizeInputs () {
        this.form.querySelectorAll(GENERIC_TEXT_FIELD).forEach(input => this.addInput(input))
    }

    // TODO: try to filter down to only submit buttons
    get submitButtons () {
        return this.form.querySelectorAll(SUBMIT_BUTTON_SELECTOR)
    }

    execOnInputs (fn) {
        for (const input of this.allInputs) {
            const {shouldDecorate} = getInputConfig(input)
            if (shouldDecorate(this.isLogin, this.Device)) fn(input)
        }
    }

    addInput (input) {
        if (this.allInputs.has(input)) return this

        this.allInputs.add(input)

        const inputType = getInputType(input, this.isLogin)

        this[`${inputType}Inputs`].add(input)

        this.decorateInput(input, inputType)

        return this
    }

    areAllInputsEmpty () {
        let allEmpty = true
        this.execOnInputs((input) => {
            if (input.value) allEmpty = false
        })
        return allEmpty
    }

    addListener (el, type, fn) {
        el.addEventListener(type, fn)
        this.listeners.add({el, type, fn})
    }

    addAutofillStyles (input) {
        const styles = getIconStylesBase(input, this.isLogin)
        addInlineStyles(input, styles)
    }

    decorateInput (input, inputType) {
        const config = getInputConfig(input, inputType)

        if (!config.shouldDecorate(this.isLogin, this.Device)) return this

        input.setAttribute(ATTR_AUTOFILL, 'true')
        input.setAttribute(ATTR_INPUT_TYPE, inputType)
        this.addAutofillStyles(input, config)
        this.addListener(input, 'mousemove', (e) => {
            if (isEventWithinDax(e, e.target)) {
                e.target.style.setProperty('cursor', 'pointer', 'important')
            } else {
                e.target.style.removeProperty('cursor')
            }
        })
        this.addListener(input, 'mousedown', (e) => {
            if (!e.isTrusted) return
            const isMainMouseButton = e.button === 0
            if (!isMainMouseButton) return

            if (this.shouldOpenTooltip(e, e.target)) {
                if (isEventWithinDax(e, e.target) || (isDDGApp && !isApp)) {
                    e.preventDefault()
                    e.stopImmediatePropagation()
                }

                this.touched.add(e.target)
                this.attachTooltip(this, e.target)
            }
        })
        return this
    }

    shouldOpenTooltip (e, input) {
        return (!this.touched.has(input) && this.areAllInputsEmpty()) || isEventWithinDax(e, input)
    }

    autofillInput = (input, string) => {
        setValue(input, string)
        input.classList.add('ddg-autofilled')
        addInlineStyles(input, getIconStylesAutofilled(input, this.isLogin))

        // If the user changes the alias, remove the decoration
        input.addEventListener('input', this.removeAllHighlights, {once: true})
    }

    autofillEmail (alias) {
        this.execOnInputs((input) => !input.matches(PASSWORD_SELECTOR) && this.autofillInput(input, alias))
        if (this.tooltip) {
            this.removeTooltip()
        }
    }

    autofillCredentials (credentials) {
        this.shouldPromptToStoreCredentials = false
        this.execOnInputs((input) => {
            if (input.matches(PASSWORD_SELECTOR)) {
                this.autofillInput(input, credentials.password)
            } else {
                this.autofillInput(input, credentials.username)
            }
        })
        if (this.tooltip) {
            this.removeTooltip()
        }
    }
}

module.exports = Form
