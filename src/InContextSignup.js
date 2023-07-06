import {
    StartEmailProtectionSignupCall,
    GetIncontextSignupDismissedAtCall,
    SetIncontextSignupPermanentlyDismissedAtCall,
    CloseAutofillParentCall
} from './deviceApiCalls/__generated__/deviceApiCalls.js'
import { isLocalNetwork, isValidTLD } from './autofill-utils.js'

export class InContextSignup {
    /**
     * @param {import("./DeviceInterface/InterfacePrototype").default} device
     */
    constructor (device) {
        this.device = device
    }

    async init () {
        await this.refreshData()
        this.addNativeAccessibleGlobalFunctions()
    }

    addNativeAccessibleGlobalFunctions () {
        if (!this.device.globalConfig.hasModernWebkitAPI) return

        try {
            // Set up a function which can be called from the native layer after completed sign-up or sign-in.
            Object.defineProperty(window, 'openAutofillAfterClosingEmailProtectionTab', {
                enumerable: false,
                configurable: false,
                writable: false,
                value: () => {
                    this.openAutofillTooltip()
                }
            })
        } catch (e) {
            // Ignore if function can't be set up, it's a UX enhancement not a critical flow
        }
    }

    async refreshData () {
        const incontextSignupDismissedAt = await this.device.deviceApi.request(new GetIncontextSignupDismissedAtCall(null))
        this.permanentlyDismissedAt = incontextSignupDismissedAt.permanentlyDismissedAt
        this.isInstalledRecently = incontextSignupDismissedAt.isInstalledRecently
    }

    async openAutofillTooltip () {
        // Make sure we're working with the latest data
        await this.device.refreshData()

        // Make sure the tooltip is closed before we try to open it
        await this.device.uiController?.removeTooltip('stateChange')

        // Make sure the input doesn't have focus so we can focus on it again
        const activeInput = this.device.activeForm?.activeInput
        activeInput?.blur()

        // Select the active input to open the tooltip
        const selectActiveInpout = () => {
            // On mobile, trigger a pointer down event on the input
            if (this.device.globalConfig.isMobileApp) {
                // Pretend we've never seen this input before and click on it
                if (this.device.activeForm) this.device.activeForm.touched.delete(activeInput)
                const pointerDownEvent = new Event('pointerdown', {bubbles: true})
                activeInput?.dispatchEvent(pointerDownEvent)

            // On everything else, just focus the input
            } else {
                activeInput?.focus()
            }
        }

        if (document.hasFocus()) {
            selectActiveInpout()
        } else {
            // On mobile we're not changing tabs, we're rendering an overlay on
            // top of the current tab. Therefore if the document isn't initially
            // in focus, the visibility change handler will never fire when it
            // is. So, let's try again 1 second later once the overlay has been
            // hidden.
            if (this.device.globalConfig.isMobileApp) {
                setTimeout(() => {
                    selectActiveInpout()
                }, 1000)
            } else {
                document.addEventListener('visibilitychange', () => {
                    selectActiveInpout()
                }, {once: true})
            }
        }
    }

    isPermanentlyDismissed () {
        return Boolean(this.permanentlyDismissedAt)
    }

    isOnValidDomain () {
        // Only show in-context signup if we've high confidence that the page is
        // not internally hosted or an intranet
        return isValidTLD() && !isLocalNetwork()
    }

    isAllowedByDevice () {
        if (typeof this.isInstalledRecently === 'boolean') {
            return this.isInstalledRecently
        } else {
            // Don't restrict in-context signup based on recent installation
            // if the device hasn't provided a clear indication
            return true
        }
    }

    /**
     * @param {import('./Form/matching.js').SupportedSubTypes | "unknown"} [inputType]
     * @returns {boolean}
     */
    isAvailable (inputType = 'emailAddress') {
        const isEmailInput = inputType === 'emailAddress'
        const isEmailProtectionEnabled = !!this.device.settings?.featureToggles.emailProtection
        const isIncontextSignupEnabled = !!this.device.settings?.featureToggles.emailProtection_incontext_signup
        const isNotAlreadyLoggedIn = !this.device.isDeviceSignedIn()
        const isNotDismissed = !this.isPermanentlyDismissed()
        const isOnExpectedPage = this.device.globalConfig.isTopFrame || this.isOnValidDomain()
        const isAllowedByDevice = this.isAllowedByDevice()
        return isEmailInput && isEmailProtectionEnabled && isIncontextSignupEnabled && isNotAlreadyLoggedIn && isNotDismissed && isOnExpectedPage && isAllowedByDevice
    }

    onIncontextSignup () {
        this.device.deviceApi.notify(new StartEmailProtectionSignupCall({}))
        this.device.firePixel({pixelName: 'incontext_primary_cta'})
    }

    onIncontextSignupDismissed (options = { shouldHideTooltip: true }) {
        this.permanentlyDismissedAt = new Date().getTime()
        this.device.deviceApi.notify(new SetIncontextSignupPermanentlyDismissedAtCall({ value: this.permanentlyDismissedAt }))
        this.device.firePixel({pixelName: 'incontext_dismiss_persisted'})
        if (options.shouldHideTooltip) {
            this.device.removeAutofillUIFromPage()
            this.device.deviceApi.notify(new CloseAutofillParentCall(null))
        }
    }

    // In-context signup can be closed when displayed as a stand-alone tooltip, e.g. extension
    onIncontextSignupClosed () {
        this.device.activeForm?.dismissTooltip()
        this.device.firePixel({pixelName: 'incontext_close_x'})
    }
}