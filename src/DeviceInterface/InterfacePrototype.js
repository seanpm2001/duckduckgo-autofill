import {
    ADDRESS_DOMAIN,
    SIGN_IN_MSG,
    sendAndWaitForAnswer,
    formatDuckAddress,
    notifyWebApp
} from '../autofill-utils'

import {getInputType, getSubtypeFromType} from '../Form/matching'
import { formatFullName } from '../Form/formatters'
import listenForGlobalFormSubmission from '../Form/listenForFormSubmission'
import { fromPassword, GENERATED_ID } from '../input-types/Credentials'
import { PasswordGenerator } from '../PasswordGenerator'
import { createScanner } from '../Scanner'
import {createGlobalConfig} from '../config'
import {AutofillSettings} from '../settings/settings'
import {RuntimeConfiguration} from '@duckduckgo/content-scope-scripts'
import {createRuntime} from '../runtime/runtime'
import {WebTooltip} from '../UI/WebTooltip'

/**
 * @implements {GlobalConfigImpl}
 */
class InterfacePrototype {
    attempts = 0
    /** @type {import("../Form/Form").Form | null} */
    currentAttached = null
    /** @type {import("../UI/Tooltip.js").Tooltip | null} */
    currentTooltip = null
    stripCredentials = true
    /** @type {number} */
    initialSetupDelayMs = 0

    /** @type {PasswordGenerator} */
    passwordGenerator = new PasswordGenerator();

    /** @type {{privateAddress: string, personalAddress: string}} */
    #addresses = {
        privateAddress: '',
        personalAddress: ''
    }

    /** @type {GlobalConfig} */
    globalConfig;

    /** @type {import("@duckduckgo/content-scope-scripts").RuntimeConfiguration} */
    runtimeConfiguration;

    /** @type {import("../settings/settings").AutofillSettings} */
    autofillSettings;

    /** @type {AvailableInputTypes} */
    availableInputTypes;

    /** @type {import('../Scanner').Scanner} */
    scanner;

    /** @type {TooltipInterface} */
    tooltip;

    /**
     * @param {AvailableInputTypes} availableInputTypes
     * @param {import("../runtime/runtime").Runtime} runtime
     * @param {TooltipInterface} tooltip
     * @param {GlobalConfig} globalConfig
     * @param {import("@duckduckgo/content-scope-scripts").RuntimeConfiguration} platformConfig
     * @param {import("../settings/settings").AutofillSettings} autofillSettings
     */
    constructor (availableInputTypes, runtime, tooltip, globalConfig, platformConfig, autofillSettings) {
        this.availableInputTypes = availableInputTypes
        this.globalConfig = globalConfig
        this.tooltip = tooltip
        this.runtimeConfiguration = platformConfig
        this.autofillSettings = autofillSettings
        this.runtime = runtime
        this.scanner = createScanner(this, {
            initialDelay: this.initialSetupDelayMs,
            availableInputTypes: availableInputTypes
        })
    }

    get hasLocalAddresses () {
        return !!(this.#addresses?.privateAddress && this.#addresses?.personalAddress)
    }
    getLocalAddresses () {
        return this.#addresses
    }
    storeLocalAddresses (addresses) {
        this.#addresses = addresses
        // When we get new duck addresses, add them to the identities list
        const identities = this.getLocalIdentities()
        const privateAddressIdentity = identities.find(({id}) => id === 'privateAddress')
        // If we had previously stored them, just update the private address
        if (privateAddressIdentity) {
            privateAddressIdentity.emailAddress = formatDuckAddress(addresses.privateAddress)
        } else {
            // Otherwise, add both addresses
            this.#data.identities = this.addDuckAddressesToIdentities(identities)
        }
    }

    /** @type { PMData } */
    #data = {
        credentials: [],
        creditCards: [],
        identities: [],
        topContextData: undefined
    }

    /**
     * @returns {Promise<import('../Form/matching').SupportedTypes>}
     */
    async getCurrentInputType () {
        throw new Error('Not implemented')
    }

    addDuckAddressesToIdentities (identities) {
        if (!this.hasLocalAddresses) return identities

        const newIdentities = []
        let { privateAddress, personalAddress } = this.getLocalAddresses()
        privateAddress = formatDuckAddress(privateAddress)
        personalAddress = formatDuckAddress(personalAddress)

        // Get the duck addresses in identities
        const duckEmailsInIdentities = identities.reduce(
            (duckEmails, { emailAddress: email }) =>
                email?.includes(ADDRESS_DOMAIN) ? duckEmails.concat(email) : duckEmails,
            []
        )

        // Only add the personal duck address to identities if the user hasn't
        // already manually added it
        if (!duckEmailsInIdentities.includes(personalAddress)) {
            newIdentities.push({
                id: 'personalAddress',
                emailAddress: personalAddress,
                title: 'Blocks email trackers'
            })
        }

        newIdentities.push({
            id: 'privateAddress',
            emailAddress: privateAddress,
            title: 'Blocks email trackers and hides your address'
        })

        return [...identities, ...newIdentities]
    }

    /**
     * Stores init data coming from the tooltipHandler
     * @param { InboundPMData } data
     */
    storeLocalData (data) {
        if (this.stripCredentials) {
            data.credentials.forEach((cred) => delete cred.password)
            data.creditCards.forEach((cc) => delete cc.cardNumber && delete cc.cardSecurityCode)
        }
        // Store the full name as a separate field to simplify autocomplete
        const updatedIdentities = data.identities.map((identity) => ({
            ...identity,
            fullName: formatFullName(identity)
        }))
        // Add addresses
        this.#data.identities = this.addDuckAddressesToIdentities(updatedIdentities)
        this.#data.creditCards = data.creditCards
        this.#data.credentials = data.credentials

        // Top autofill only
        if (data.serializedInputContext) {
            try {
                this.#data.topContextData = JSON.parse(data.serializedInputContext)
            } catch (e) {
                console.error(e)
                this.removeTooltip()
            }
        }
    }
    getTopContextData () {
        return this.#data.topContextData
    }
    get hasLocalCredentials () {
        return this.#data.credentials.length > 0
    }
    getLocalCredentials () {
        return this.#data.credentials.map(cred => {
            const { password, ...rest } = cred
            return rest
        })
    }
    get hasLocalIdentities () {
        return this.#data.identities.length > 0
    }
    getLocalIdentities () {
        return this.#data.identities
    }
    get hasLocalCreditCards () {
        return this.#data.creditCards.length > 0
    }
    /** @return {CreditCardObject[]} */
    getLocalCreditCards () {
        return this.#data.creditCards
    }

    async init () {
        if (document.readyState === 'complete') {
            this._startInit()
                .catch(e => console.error('init error', e))
        } else {
            window.addEventListener('load', () => {
                this._startInit()
                    .catch(e => console.error('init error', e))
            })
        }
    }

    async _startInit () {
        // todo(toggles): move to runtime polymorphism
        if (this.autofillSettings.featureToggles.credentials_saving) {
            listenForGlobalFormSubmission(this.scanner.forms)
        }

        await this.setupAutofill()
        await this.setupSettingsPage()
    }

    /**
     * @param {IdentityObject|CreditCardObject|CredentialsObject|{email:string, id: string}} data
     * @param {string} type
     */
    async selectedDetail (data, type) {
        this.activeFormSelectedDetail(data, type)
    }

    /**
     * @param {IdentityObject|CreditCardObject|CredentialsObject|{email:string, id: string}} data
     * @param {string} type
     */
    activeFormSelectedDetail (data, type) {
        const form = this.currentAttached
        if (!form) {
            return
        }
        if (data.id === 'privateAddress') {
            this.refreshAlias()
        }
        if (type === 'email' && 'email' in data) {
            form.autofillEmail(data.email)
        } else {
            form.autofillData(data, type)
        }
        this.removeTooltip()
    }

    /**
     * Before the DataWebTooltip opens, we collect the data based on the config.type
     * @param {InputTypeConfigs} config
     * @param {import('../Form/matching').SupportedTypes} inputType
     * @param {TopContextData} [data]
     * @returns {(CredentialsObject|CreditCardObject|IdentityObject)[]}
     */
    dataForAutofill (config, inputType, data) {
        const subtype = getSubtypeFromType(inputType)
        if (config.type === 'identities') {
            return this.getLocalIdentities().filter(identity => !!identity[subtype])
        }
        if (config.type === 'creditCards') {
            return this.getLocalCreditCards()
        }
        if (config.type === 'credentials') {
            if (data) {
                if (Array.isArray(data.credentials) && data.credentials.length > 0) {
                    return data.credentials
                } else {
                    return this.getLocalCredentials()
                }
            }
        }
        return []
    }

    /**
     * @param {import("../Form/Form").Form} form
     * @deprecated
     */
    getEmailAlias (form) {
        this.getAlias().then((alias) => {
            if (alias) form.autofillEmail(alias)
            else form.activeInput?.focus()
        })
    }

    /**
     * @param {import("../Form/Form").Form} form
     * @param {HTMLInputElement} input
     * @param {{ (): { x: number; y: number; height: number; width: number; } }} getPosition
     * @param {{ x: number; y: number; } | null} click
     */
    attachTooltip (form, input, getPosition, click) {
        form.activeInput = input
        this.currentAttached = form
        const inputType = getInputType(input)

        if (this.globalConfig.isMobileApp && inputType === 'identities.emailAddress') {
            return this.getEmailAlias(form)
        }

        /** @type {TopContextData} */
        const topContextData = {
            inputType
        }

        // A list of checks to determine if we need to generate a password
        const checks = [
            inputType === 'credentials.password',
            this.autofillSettings.featureToggles.password_generation,
            form.isSignup
        ]

        // if all checks pass, generate and save a password
        if (checks.every(Boolean)) {
            const password = this.passwordGenerator.generate({
                input: input.getAttribute('passwordrules'),
                domain: window.location.hostname
            })

            // append the new credential to the topContextData so that the top autofill can display it
            topContextData.credentials = [fromPassword(password)]
        }

        this.tooltip.attach({input, form, click, getPosition, topContextData, device: this})
        // if (this.globalConfig.hasNativeTooltip) {
        // } else {
        //     this.attachCloseListeners()
        //     this.attachTooltipInner(form, input, getPosition, click, topContextData)
        // }
    }

    /**
     * If the tooltipHandler was capable of generating password, and it
     * previously did so for the form in question, then offer to
     * save the credentials
     *
     * @param {{ formElement?: HTMLElement; }} options
     */
    shouldPromptToStoreCredentials (options) {
        if (!options.formElement) return false
        if (!this.autofillSettings.featureToggles.password_generation) return false

        // if we previously generated a password, allow it to be saved
        if (this.passwordGenerator.generated) {
            return true
        }

        return false
    }

    /**
     * When an item was selected, we then call back to the tooltipHandler
     * to fetch the full suite of data needed to complete the autofill
     *
     * @param {InputTypeConfigs} config
     * @param {(CreditCardObject|IdentityObject|CredentialsObject)[]} items
     * @param {string|number} id
     */
    onSelect (config, items, id) {
        id = String(id)
        const matchingData = items.find(item => String(item.id) === id)
        if (!matchingData) throw new Error('unreachable (fatal)')

        const dataPromise = (() => {
            switch (config.type) {
            case 'creditCards': return this.getAutofillCreditCard(id)
            case 'identities': return this.getAutofillIdentity(id)
            case 'credentials': {
                if (id === GENERATED_ID) {
                    return Promise.resolve({ success: matchingData })
                }
                return this.getAutofillCredentials(id)
            }
            default: throw new Error('unreachable!')
            }
        })()

        // wait for the data back from the tooltipHandler
        dataPromise.then(response => {
            if (response.success) {
                return this.selectedDetail(response.success, config.type)
            } else {
                return Promise.reject(new Error('none-success response'))
            }
        }).catch(e => {
            console.error(e)
            return this.removeTooltip()
        })
    }

    getActiveTooltip () {
        return this.tooltip.getActiveTooltip()
    }

    setActiveTooltip (tooltip) {
        this.tooltip.setActiveTooltip(tooltip)
    }

    async setupSettingsPage ({shouldLog} = {shouldLog: false}) {
        if (this.globalConfig.isDDGDomain) {
            notifyWebApp({isApp: this.globalConfig.isApp})

            if (this.isDeviceSignedIn()) {
                let userData
                try {
                    userData = await this.getUserData()
                } catch (e) {}

                const hasUserData = userData && !userData.error && Object.entries(userData).length > 0
                notifyWebApp({
                    deviceSignedIn: {
                        value: true,
                        shouldLog,
                        userData: hasUserData ? userData : undefined
                    }
                })
            } else {
                this.trySigningIn()
            }
        }
    }

    async setupAutofill () {}

    /** @returns {Promise<EmailAddresses>} */
    async getAddresses () { throw new Error('unimplemented') }

    /** @returns {Promise<null|Record<any,any>>} */
    getUserData () { return Promise.resolve(null) }

    refreshAlias () {}

    async trySigningIn () {
        if (this.globalConfig.isDDGDomain) {
            if (this.attempts < 10) {
                this.attempts++
                const data = await sendAndWaitForAnswer(SIGN_IN_MSG, 'addUserData')
                // This call doesn't send a response, so we can't know if it succeeded
                this.storeUserData(data)
                await this.setupAutofill()
                await this.setupSettingsPage({shouldLog: true})
            } else {
                console.warn('max attempts reached, bailing')
            }
        }
    }
    storeUserData (_data) {}

    /** @param {() => void} _fn */
    addLogoutListener (_fn) {}
    isDeviceSignedIn () { return false }
    /**
     * @returns {Promise<null|string>}
     */
    async getAlias () {
        return null
    }
    // PM endpoints
    storeCredentials (_opts) {}
    getAccounts () {}
    /** @returns {APIResponse<CredentialsObject>} */
    getAutofillCredentials (_id) { throw new Error('unimplemented') }
    /** @returns {APIResponse<CreditCardObject>} */
    async getAutofillCreditCard (_id) { throw new Error('unimplemented') }
    /** @returns {Promise<{success: IdentityObject|undefined}>} */
    async getAutofillIdentity (_id) { throw new Error('unimplemented') }

    openManagePasswords () {}

    /**
     * Sends form data to the native layer
     * @param {DataStorageObject} data
     */
    storeFormData (data) {
        return this.runtime.storeFormData(data)
    }

    setSize (_cb) {
        // noop
    }

    /** @returns {string} */
    tooltipStyles () {
        return ``
    }

    tooltipWrapperClass () {
        return ''
    }

    tooltipPositionClass (top, left) {
        return `.wrapper {transform: translate(${left}px, ${top}px);}`
    }

    setupSizeListener (_cb) {
        // no-op
    }

    static default () {
        const config = new RuntimeConfiguration()
        const globalConfig = createGlobalConfig()
        const runtime = createRuntime(globalConfig)
        const tooltip = new WebTooltip({tooltipKind: 'modern'})
        return new InterfacePrototype({}, runtime, tooltip, globalConfig, config, AutofillSettings.default())
    }

    removeTooltip () {
        return this.tooltip.removeTooltip()
    }

    isTestMode () {
        return this.globalConfig.isDDGTestMode
    }
}

export default InterfacePrototype
