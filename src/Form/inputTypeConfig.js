const {isDDGApp, isApp} = require('../autofill-utils')
const {daxBase64} = require('./logo-svg')
const ddgPasswordIcons = require('../UI/img/ddgPasswordIcon')
const {getInputMainType, getInputSubtype} = require('./matching')
const {getCountryDisplayName} = require('./formatters')

// In Firefox web_accessible_resources could leak a unique user identifier, so we avoid it here
const isFirefox = navigator.userAgent.includes('Firefox')
const getDaxImg = isDDGApp || isFirefox ? daxBase64 : chrome.runtime.getURL('img/logo-small.svg')

/**
 * Get the icon for the identities (currently only Dax for emails)
 * @param {HTMLInputElement} input
 * @param device
 * @return {string}
 */
const getIdentitiesIcon = (input, {device}) => {
    const subtype = getInputSubtype(input)
    if (subtype === 'emailAddress' && device.isDeviceSignedIn()) return getDaxImg

    return ''
}

/**
 * Inputs with readOnly or disabled should never be decorated
 * @param {HTMLInputElement} input
 * @return {boolean}
 */
const canBeDecorated = (input) => !input.readOnly && !input.disabled

/**
 * A map of config objects. These help by centralising here some complexity
 * @type {InputTypeConfig}
 */
const inputTypeConfig = {
    /** @type {CredentialsInputTypeConfig} */
    credentials: {
        type: 'credentials',
        getIconBase: () => ddgPasswordIcons.ddgPasswordIconBase,
        getIconFilled: () => ddgPasswordIcons.ddgPasswordIconFilled,
        shouldDecorate: (_input, {isLogin, device}) =>
            canBeDecorated(_input) && isLogin && device.hasLocalCredentials,
        dataType: 'Credentials',
        displayTitlePropName: (_subtype, data) => data.username,
        displaySubtitlePropName: '•••••••••••••••',
        autofillMethod: 'getAutofillCredentials'
    },
    /** @type {CreditCardInputTypeConfig} */
    creditCards: {
        type: 'creditCards',
        getIconBase: () => '',
        getIconFilled: () => '',
        shouldDecorate: (_input, {device}) =>
            canBeDecorated(_input) && device.hasLocalCreditCards,
        dataType: 'CreditCards',
        displayTitlePropName: (_subtype, data) => data.title,
        displaySubtitlePropName: 'displayNumber',
        autofillMethod: 'getAutofillCreditCard'
    },
    /** @type {IdentitiesInputTypeConfig} */
    identities: {
        type: 'identities',
        getIconBase: getIdentitiesIcon,
        getIconFilled: getIdentitiesIcon,
        shouldDecorate: (_input, {device}) => {
            if (!canBeDecorated(_input)) return false

            if (isApp) {
                return device.getLocalIdentities()?.some((identity) => !!identity[subtype])
            }

            if (subtype === 'emailAddress') {
                return device.isDeviceSignedIn()
            }

            return false
        },
        dataType: 'Identities',
        displayTitlePropName: (subtype, data) => {
            if (subtype === 'addressCountryCode') {
                return getCountryDisplayName('en', data.addressCountryCode)
            }
            return data[subtype]
        },
        displaySubtitlePropName: 'title',
        autofillMethod: 'getAutofillIdentity'
    },
    /** @type {UnknownInputTypeConfig} */
    unknown: {
        type: 'unknown',
        getIconBase: () => '',
        getIconFilled: () => '',
        shouldDecorate: () => false,
        dataType: '',
        displayTitlePropName: () => 'unknown',
        displaySubtitlePropName: '',
        autofillMethod: ''
    }
}

/**
 * Retrieves configs from an input el
 * @param {HTMLInputElement} input
 * @returns {InputTypeConfigs}
 */
const getInputConfig = (input) => {
    const inputType = getInputMainType(input)
    return getInputConfigFromType(inputType)
}

/**
 * Retrieves configs from an input type
 * @param {SupportedMainTypes | string} inputType
 * @returns {InputTypeConfigs}
 */
const getInputConfigFromType = (inputType) => {
    return inputTypeConfig[inputType || 'unknown']
}

module.exports = {
    getInputConfig,
    getInputConfigFromType
}
