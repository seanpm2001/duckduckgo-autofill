// Do not remove -- Apple devices change this when they support modern webkit messaging
let hasModernWebkitAPI = false
// INJECT hasModernWebkitAPI HERE

// The native layer will inject a randomised secret here and use it to verify the origin
let secret = 'PLACEHOLDER_SECRET'

const ddgGlobals = require('../captureDdgGlobals')

// The native layer will inject a 128-bit tag here and we'll use it for decryption
let additionalData = new ddgGlobals.Uint8Array('PLACEHOLDER_AUTH_DATA')

/**
 * Sends message to the webkit layer (fire and forget)
 * @param {String} handler
 * @param {*} data
 * @returns {*}
 */
const wkSend = (handler, data = {}) =>
    window.webkit.messageHandlers[handler].postMessage(data)

/**
 * Generate a random method name and adds it to the global scope
 * The native layer will use this method to send the response
 * @param {String} randomMethodName
 * @param {Function} callback
 */
const generateRandomMethod = (randomMethodName, callback) => {
    Object.defineProperty(ddgGlobals.window, randomMethodName, {
        enumerable: false,
        // configurable, To allow for deletion later
        configurable: true,
        writable: false,
        value: (...args) => {
            callback(...args)
            delete ddgGlobals.window[randomMethodName]
        }
    })
}

/**
 * Sends message to the webkit layer and waits for the specified response
 * @param {String} handler
 * @param {*} data
 * @returns {Promise<*>}
 */
const wkSendAndWait = async (handler, data = {}) => {
    if (hasModernWebkitAPI) {
        return wkSend(handler, data)
    }

    const randMethodName = createRandMethodName()
    const key = await createRandKey()
    const iv = createRandIv()

    const encryptedResponse = await new ddgGlobals.Promise((resolve) => {
        generateRandomMethod(randMethodName, resolve)
        data.messageHandling = {
            methodName: randMethodName,
            secret,
            key: ddgGlobals.Arrayfrom(key),
            iv: ddgGlobals.Arrayfrom(iv)
        }
        wkSend(handler, data)
    })

    return decrypt(encryptedResponse, key, iv)
        .then(decrypted => ddgGlobals.JSONparse(decrypted))
        .catch(e => { console.log(e); return {error: e} })
}

const randomString = () =>
    '' + ddgGlobals.getRandomValues(new ddgGlobals.Uint32Array(1))[0]

const createRandMethodName = () => '_' + randomString()

const algoObj = {name: 'AES-GCM', length: 256}
const createRandKey = () => ddgGlobals.generateKey(algoObj, true, ['encrypt', 'decrypt'])
    .then(key => ddgGlobals.exportKey('raw', key))
    .then(exportedKey => new ddgGlobals.Uint8Array(exportedKey))

const createRandIv = () => ddgGlobals.getRandomValues(new ddgGlobals.Uint8Array(12))

const decrypt = async (ciphertext, key, iv) => {
    const keyBuffer = new ddgGlobals.Uint8Array(key)
    const cryptoKey = await ddgGlobals.importKey('raw', keyBuffer, 'AES-GCM', false, ['decrypt'])
    const U8iv = new ddgGlobals.Uint8Array(iv)
    const algo = { name: 'AES-GCM', iv: U8iv, additionalData }
    let decrypted = await ddgGlobals.decrypt(algo, cryptoKey, ciphertext)

    let dec = new ddgGlobals.TextDecoder()
    return dec.decode(decrypted)
}

module.exports = {
    wkSend,
    wkSendAndWait
}
