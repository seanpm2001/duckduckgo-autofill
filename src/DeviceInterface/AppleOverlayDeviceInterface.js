import {AppleDeviceInterface} from './AppleDeviceInterface.js'
import {HTMLTooltipUIController} from '../UI/controllers/HTMLTooltipUIController.js'
import {overlayApi} from './overlayApi.js'
import {createNotification} from '../../packages/device-api/index.js'

/**
 * This subclass is designed to separate code that *only* runs inside the
 * Overlay into a single place.
 *
 * It will only run inside the macOS overlay, therefor all code here
 * can be viewed as *not* executing within a regular page context.
 */
class AppleOverlayDeviceInterface extends AppleDeviceInterface {
    /**
     * Mark top frame as not stripping credential data
     * @type {boolean}
     */
    stripCredentials = false;

    /**
     * overlay API helpers
     */
    overlay = overlayApi(this)

    /**
     * Because we're running inside the Overlay, we always create the HTML
     * Tooltip controller.
     *
     * @override
     * @returns {import("../UI/controllers/UIController.js").UIController}
     */
    createUIController () {
        return new HTMLTooltipUIController({
            tooltipKind: /** @type {const} */ ('modern'),
            device: this
        }, {
            wrapperClass: 'top-autofill',
            tooltipPositionClass: () => '.wrapper { transform: none; }',
            setSize: (details) => this.deviceApi.notify(createNotification('setSize', details)),
            testMode: this.isTestMode()
        })
    }

    /**
     * Since we're running inside the Overlay we can limit what happens here to
     * be only things that are needed to power the HTML Tooltip
     *
     * @override
     * @returns {Promise<void>}
     */
    async setupAutofill () {
        await this._getAutofillInitData()
        const signedIn = await this._checkDeviceSignedIn()

        if (signedIn) {
            await this.getAddresses()
        }
    }

    async postInit () {
        // setup overlay API pieces
        this.overlay.showImmediately()
        super.postInit()
    }

    /**
     * In the top-frame scenario we override the base 'selectedDetail'.
     *
     * This
     *
     * @override
     * @param {IdentityObject|CreditCardObject|CredentialsObject|{email:string, id: string}} data
     * @param {string} type
     */
    async selectedDetail (data, type) {
        return this.overlay.selectedDetail(data, type)
    }
}

export { AppleOverlayDeviceInterface }
