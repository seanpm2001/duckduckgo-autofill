import { constants } from './mocks.js'
import { expect } from '@playwright/test'
import {mockedCalls, payloadsOnly} from './harness.js'
import {addTopAutofillMouseFocus, clickOnIcon} from './utils.js'

const ATTR_AUTOFILL = 'data-ddg-autofill'

export function incontextSignupPage (page, { platform } = { platform: 'extension' }) {
    const isExtension = platform === 'extension'
    const {selectors} = constants.fields.email
    const getCallToAction = () => {
        const text = isExtension ? 'Protect My Email' : 'Hide your email and block trackers'
        return page.locator(`text=${text}`)
    }
    const getTooltip = () => page.locator('.tooltip--email, .tooltip--incontext-signup')

    class IncontextSignupPage {
        /**
         * @param {keyof typeof constants.pages} [to] - any key matching in `constants.pages`
         */
        async navigate (domain, to = 'iframeContainer') {
            const pageName = constants.pages[to]
            const pagePath = `integration-test/${pageName}`
            await page.goto(new URL(pagePath, domain).href)
        }
        async assertIsShowing () {
            await expect(getCallToAction()).toBeVisible()
            await expect(getTooltip()).toBeInViewport({ ratio: 1 })
        }
        async assertIsHidden () {
            await expect(getCallToAction()).toBeHidden()
        }
        async getEmailProtection () {
            (await getCallToAction()).click({timeout: 500})
        }
        async dismissTooltipWith (text) {
            const dismissTooltipButton = await page.locator(`text=${text}`)
            await dismissTooltipButton.click({timeout: 500})
        }
        async closeTooltip () {
            const dismissTooltipButton = await page.locator(`[aria-label=Close]`)
            await dismissTooltipButton.click({timeout: 500})
        }
        async clickDirectlyOnDax () {
            const input = page.locator(selectors.identity)
            await clickOnIcon(input)
        }
        async clickDirectlyOnDaxInIframe () {
            const input = await page.frameLocator('iframe').locator('input#email')
            await clickOnIcon(input)
        }
        async assertTooltipWithinFrame () {
            const tooltip = await page.frameLocator('iframe').locator('.tooltip--email')
            await expect(tooltip).toBeVisible()
            await expect(tooltip).toBeInViewport({ ratio: 1 })
        }
    }

    return new IncontextSignupPage()
}

export function mutatingFormPage (page) {
    class MutatingFormPage {
        async navigate () {
            await page.goto(constants.pages['mutatingForm'])
        }
        async toggleLoginOrSignup () {
            const toggleBtn = page.locator('#toggle-login-signup')
            await toggleBtn.click()
        }
        passwordFieldShowsKey () {
            return loginPage(page).passwordFieldShowsKey()
        }
        assertPasswordHasNoIcon () {
            return signupPage(page).assertPasswordHasNoIcon()
        }
    }

    return new MutatingFormPage()
}

/**
 * A wrapper around interactions for `integration-test/pages/signup.html`
 *
 * @param {import("@playwright/test").Page} page
 */
export function signupPage (page) {
    const decoratedFirstInputSelector = '#email' + constants.fields.email.selectors.identity
    const decoratedSecondInputSelector = '#email-2' + constants.fields.email.selectors.identity
    const emailStyleAttr = () => page.locator('#email').first().getAttribute('style')
    const passwordStyleAttr = () => page.locator('#password' + constants.fields.password.selectors.credential).getAttribute('style')

    class SignupPage {
        /**
         * @param {keyof typeof constants.pages} [to]
         * @return {Promise<void>}
         */
        async navigate (to = 'signup') {
            await page.goto(constants.pages[to])
        }
        async clickIntoEmailField () {
            await page.getByLabel('Email').click()
        }
        async clickIntoPasswordField () {
            const input = page.locator('#password')
            await input.click()
        }
        async clickIntoPasswordConfirmationField () {
            const input = page.locator('#password-2')
            await input.click()
        }
        /**
         * @param {string} address
         */
        async selectPrivateAddress (address) {
            await page.getByRole('button', { name: `Generate Private Duck Address ${address} Block email trackers & hide address` })
                .click({force: true})
        }
        /**
         * @param {number} times
         * @return {Promise<void>}
         */
        async assertPasswordWasSuggestedTimes (times = 1) {
            const calls = await mockedCalls(page, {names: ['getAutofillData']})
            const payloads = payloadsOnly(calls)
            const suggested = payloads.filter(json => {
                return Boolean(json.generatedPassword)
            })
            expect(suggested.length).toBe(times)
        }
        async assertPasswordWasAutofilled () {
            await page.waitForFunction(() => {
                const pw = /** @type {HTMLInputElement} */ (document.querySelector('#password'))
                return pw?.value.length > 0
            })
            const input = await page.locator('#password').inputValue()
            const input2 = await page.locator('#password-2').inputValue()
            expect(input.length).toBeGreaterThan(9)
            expect(input).toEqual(input2)
        }
        async assertPasswordWasNotAutofilled () {
            // ensure there was time to autofill, otherwise it can give a false negative
            await page.waitForTimeout(100)
            const input = await page.locator('#password').inputValue()
            const input2 = await page.locator('#password-2').inputValue()
            expect(input).toEqual('')
            expect(input2).toEqual('')
        }
        /**
         * @param {string} address
         */
        async assertUsernameFieldSent (address) {
            const calls = payloadsOnly(await mockedCalls(page, { names: ['getAutofillData'] }))

            expect(/** @type {any} */(calls[0]).generatedPassword.username).toEqual(address)
            expect(calls.length).toEqual(1)
        }
        async clickDirectlyOnPasswordIcon () {
            const input = page.locator('#password')
            await clickOnIcon(input)
        }
        async selectGeneratedPassword () {
            const input = page.locator('#password')
            await input.click()

            const passwordBtn = page.locator('button:has-text("Generated password")')
            await expect(passwordBtn).toContainText('Login information will be saved for this website')

            const passwordButtonText = await passwordBtn.innerText()
            const [, generatedPassword] = passwordButtonText.split('\n')

            if (!generatedPassword.trim()) {
                throw new Error('unreachable - password must not be empty')
            }

            await passwordBtn.click({ force: true })
            return expect(input).toHaveValue(generatedPassword)
        }
        /**
         * @param {string} name
         * @return {Promise<void>}
         */
        async selectFirstName (name) {
            const input = page.locator('#firstname')
            await input.click()
            const button = await page.waitForSelector(`button:has-text("${name}")`)
            await button.click({ force: true })
        }
        async selectLastName (name) {
            const input = page.locator('#lastname')
            await input.click()
            const button = await page.waitForSelector(`button:has-text("${name}")`)
            await button.click({ force: true })
        }
        async assertEmailValue (emailAddress) {
            const {selectors} = constants.fields.email
            const email = page.locator(selectors.identity)
            await expect(email).toHaveValue(emailAddress)
        }
        async selectFirstEmailField (selector) {
            const input = page.locator(decoratedFirstInputSelector)
            await input.click()
            const button = page.locator(`button:has-text("${selector}")`)
            await button.click({ force: true })
        }
        /**
         * @param {import('../../src/deviceApiCalls/__generated__/validators-ts').SendJSPixelParams[]} pixels
         */
        async assertPixelsFired (pixels) {
            const calls = await mockedCalls(page, {names: ['sendJSPixel']})
            expect(calls.length).toBeGreaterThanOrEqual(1)
            const firedPixels = calls.map(([_, {pixelName, params}]) => params ? ({pixelName, params}) : ({pixelName}))
            expect(firedPixels).toEqual(pixels)
        }
        async addNewForm () {
            const btn = page.locator('text=Add new form')
            await btn.click()
        }
        async selectSecondEmailField (selector) {
            const input = page.locator(decoratedSecondInputSelector)
            await input.click()
            const button = page.locator(`button:has-text("${selector}")`)
            await button.click({ force: true })
        }
        /**
         * @param {Omit<CredentialsObject, "id">} credentials
         * @returns {Promise<void>}
         */
        async enterCredentials (credentials) {
            const {identity} = constants.fields.email.selectors
            const {credential} = constants.fields.password.selectors
            await page.fill(identity, credentials.username)
            await page.fill('#password' + credential, credentials.password || '')
            await page.fill('#password-2' + credential, credentials.password || '')

            /** NOTE: The next two lines are here to dismiss the auto-generated password prompt */
            await page.waitForTimeout(200)
            await page.keyboard.press('Tab')

            await page.getByRole('button', { name: 'Sign up' }).click()
        }
        /**
         * @param {string} password
         * @return {Promise<void>}
         */
        async enterPassword (password) {
            await page.getByLabel('Password', { exact: true }).fill(password)
            await page.getByLabel('Password Confirmation').fill(password)
        }
        /**
         * @param {string} email
         */
        async changeEmailFieldTo (email) {
            await page.getByLabel('Email').fill(email)
        }
        async submit () {
            await page.getByRole('button', { name: 'Sign up' }).click()
        }
        /**
         * @param {Omit<CredentialsObject, "id">} credentials
         * @returns {Promise<void>}
         */
        async assertWasPromptedToSave (credentials) {
            const calls = await mockedCalls(page, { names: ['storeFormData'] })
            const payloads = payloadsOnly(calls)
            expect(payloads[0].credentials).toEqual(credentials)
        }
        /**
         * Capture a second instance of `storeFormData`
         * @param {Omit<CredentialsObject, "id">} credentials
         * @returns {Promise<void>}
         */
        async assertWasPromptedToSaveAgain (credentials) {
            const calls = await mockedCalls(page, { names: ['storeFormData'], minCount: 2 })
            const payloads = payloadsOnly(calls)
            expect(payloads[1].credentials).toEqual(credentials)
        }
        /**
         * @param {Omit<CredentialsObject, "id">} credentials
         * @returns {Promise<void>}
         */
        async assertWasPromptedToSaveWindows (credentials) {
            const calls = await mockedCalls(page, { names: ['storeFormData'] })
            expect(calls.length).toBeGreaterThanOrEqual(1)
            const [, sent] = calls[0]
            // @ts-expect-error
            expect(sent.Data.credentials).toEqual(credentials)
        }
        /**
         * @returns {Promise<void>}
         */
        async assertWasNotPromptedToSaveWindows () {
            const calls = await mockedCalls(page, { names: ['storeFormData'], minCount: 0 })

            expect(calls.length).toBe(0)
        }
        async assertSecondEmailValue (emailAddress) {
            const input = page.locator(decoratedSecondInputSelector)
            await expect(input).toHaveValue(emailAddress)
        }
        async assertFirstEmailEmpty () {
            const input = page.locator(decoratedFirstInputSelector)
            await expect(input).toHaveValue('')
        }
        async assertEmailHasNoDaxIcon () {
            expect(await emailStyleAttr()).toBeFalsy()
        }
        async assertPasswordHasNoIcon () {
            expect(await passwordStyleAttr()).toBeFalsy()
        }
    }

    return new SignupPage()
}

/**
 * A wrapper around interactions for `integration-test/pages/login.html`
 *
 * @param {import("@playwright/test").Page} page
 * @param {{overlay?: boolean, clickLabel?: boolean}} [opts]
 */
export function loginPage (page, opts = {}) {
    const { overlay = false, clickLabel = false } = opts

    class LoginPage {
        /**
         * @param {keyof typeof constants.pages} [to] - any key matching in `constants.pages`
         * @return {Promise<void>}
         */
        /**
         * @param {keyof typeof constants.pages} [to] - any key matching in `constants.pages`
         * @return {Promise<void>}
         */
        async navigate (to = 'login') {
            await page.goto(constants.pages[to])
        }
        async clickIntoUsernameInput () {
            const usernameField = page.locator('#email').first()
            // click the input field (not within Dax icon)
            await usernameField.click()
        }
        async typeIntoUsernameInput (username) {
            await page.type('#email', username)
        }
        async clickIntoPasswordInput () {
            const passwordField = page.locator('#password').first()
            // click the input field (not within Dax icon)
            await passwordField.click()
        }
        async fieldsDoNotContainIcons () {
            const styles1 = await page.locator('#email').getAttribute('style')
            const styles2 = await page.locator('#password').getAttribute('style')
            expect(styles1 || '').not.toContain('data:image/svg+xml;base64,')
            expect(styles2 || '').not.toContain('data:image/svg+xml;base64,')
        }
        async fieldsContainIcons () {
            // don't make assertions until the element is both found + has a none-empty 'style' attribute
            await page.waitForFunction(() => Boolean(document.querySelector('#email')?.getAttribute('style')))
            const styles1 = await page.locator('#email').getAttribute('style')
            const styles2 = await page.locator('#password').getAttribute('style')
            expect(styles1).toContain('data:image/svg+xml;base64,')
            expect(styles2).toContain('data:image/svg+xml;base64,')
        }
        async emailFieldShowsDax () {
            // don't make assertions until the element is both found + has a none-empty 'style' attribute
            await page.waitForFunction(() => Boolean(document.querySelector('#email')?.getAttribute('style')))
            const emailStyle = await page.locator('#email').getAttribute('style')
            expect(emailStyle).toContain(constants.iconMatchers.dax)
        }
        async passwordFieldShowsKey () {
            // don't make assertions until the element is both found + has a none-empty 'style' attribute
            await page.waitForFunction(() => Boolean(document.querySelector('#password')?.getAttribute('style')))
            const emailStyle = await page.locator('#password').getAttribute('style')
            expect(emailStyle).toContain(constants.iconMatchers.key)
        }
        async passwordHasNoIcon () {
            const passwordStyle = await page.locator('#password').getAttribute('style')
            expect(passwordStyle || '').not.toContain('data:image/svg+xml;base64,')
        }
        async emailHasDaxPasswordNoIcon () {
            await this.emailFieldShowsDax()
            await this.passwordHasNoIcon()
        }
        async onlyPasswordFieldHasIcon () {
            const styles1 = await page.locator('#email').getAttribute('style')
            expect(styles1 || '').not.toContain('data:image/svg+xml;base64,')
            await this.passwordFieldShowsKey()
        }
        /**
         * @param {string} username
         * @return {Promise<void>}
         */
        async assertTooltipNotOpen (username) {
            await expect(page.locator(`button:has-text("${username}")`)).not.toBeVisible()
        }
        /**
         * @param {string} username
         * @return {Promise<void>}
         */
        async selectFirstCredential (username) {
            if (clickLabel) {
                const label = page.locator('label[for="email"]')
                await label.click()
            } else {
                const email = page.locator('#email')
                await email.click()
            }

            if (!overlay) {
                const button = await page.waitForSelector(`button:has-text("${username}")`)
                await button.click()
            }
        }
        /**
         * @param {string} username
         * @param {string} password
         * @return {Promise<void>}
         */
        async assertBitwardenTooltipWorking (username, password) {
            await this.clickIntoUsernameInput()
            const button = await page.waitForSelector('.tooltip__button--data--bitwarden')
            expect(button).toBeDefined()
            await button.click()
            await this.assertFirstCredential(username, password)
        }
        async assertBitwardenLockedWorking () {
            await this.clickIntoUsernameInput()
            const button = await page.waitForSelector('button:has-text("Bitwarden is locked")')
            expect(button).toBeDefined()
            await button.click()
            const updatedButton = await page.waitForSelector(`button:has-text("${constants.fields.email.personalAddress}")`)
            expect(updatedButton).toBeDefined()
            await updatedButton.click()
            const autofillCalls = await mockedCalls(page, {names: ['pmHandlerGetAutofillCredentials']})
            expect(autofillCalls).toHaveLength(1)
        }
        /**
         * @param {string} username
         * @return {Promise<void>}
         */
        async assertUsernameFilled (username) {
            const emailField = page.locator('#email')
            await expect(emailField).toHaveValue(username)
        }
        /**
         * @param {string} password
         * @return {Promise<void>}
         */
        async assertPasswordFilled (password) {
            const passwordField = page.locator('#password')
            await expect(passwordField).toHaveValue(password)
        }
        /**
         * @param {string} username
         * @param {string} password
         * @return {Promise<void>}
         */
        async assertFirstCredential (username, password) {
            await this.assertUsernameFilled(username)
            await this.assertPasswordFilled((password))
        }
        async assertPasswordEmpty () {
            const passwordField = page.locator('#password')
            await expect(passwordField).toHaveValue('')
        }
        async promptWasShown () {
            const calls = await mockedCalls(page, {names: ['getAutofillData']})
            expect(calls.length).toBeGreaterThan(0)
            const payloads = payloadsOnly(calls)
            expect(payloads[0].inputType).toBe('credentials.username')
        }
        async promptWasNotShown () {
            const calls = await page.evaluate('window.__playwright_autofill.mocks.calls')
            const mockCalls = calls.filter(([name]) => name === 'getAutofillData')
            expect(mockCalls.length).toBe(0)
        }
        /**
         * Note: Checks like this are not ideal, but they exist here to prevent
         * false positives.
         * @returns {Promise<void>}
         */
        async assertParentOpened () {
            const credsCalls = await mockedCalls(page, { names: ['getSelectedCredentials'] })
            // @ts-expect-error
            const hasSucceeded = credsCalls.some((call) => call[2]?.some(({type}) => type === 'ok'))
            expect(hasSucceeded).toBe(true)
        }
        /** @param {{password: string}} data */
        async submitPasswordOnlyForm (data) {
            await page.type('#password-3', data.password)
            await page.click('#login-3 button[type="submit"]')
        }
        /** @param {string} username */
        async submitUsernameOnlyForm (username) {
            await page.type('#email-2', username)
            await page.click('#login-2 button[type="submit"]')
        }
        /** @param {{password: string, username: string}} data */
        async submitLoginForm (data) {
            await page.type('#password', data.password)
            await page.type('#email', data.username)
            await page.click('#login button[type="submit"]')
        }
        async shouldNotPromptToSave () {
            let mockCalls = []
            mockCalls = await mockedCalls(page, { names: ['storeFormData'], minCount: 0 })
            expect(mockCalls.length).toBe(0)
        }
        /**
         * This is used mostly to avoid false negatives when we check for something _not_ happening.
         * Basically, you check that a specific call hasn't happened but the rest of the script ran just fine.
         * @returns {Promise<void>}
         */
        async assertAnyMockCallOccurred () {
            const calls = await page.evaluate('window.__playwright_autofill.mocks.calls')
            expect(calls.length).toBeGreaterThan(0)
        }
        /** @param {string} mockCallName */
        async assertMockCallOccurred (mockCallName) {
            const calls = await page.evaluate('window.__playwright_autofill.mocks.calls')
            const mockCall = calls.find(([name]) => name === mockCallName)
            expect(mockCall).toBeDefined()
        }
        /**
         * @param {string} mockCallName
         * @param {number} times
         */
        async assertMockCallOccurredTimes (mockCallName, times) {
            const calls = await page.evaluate('window.__playwright_autofill.mocks.calls')
            const mockCalls = calls.filter(([name]) => name === mockCallName)
            expect(mockCalls).toHaveLength(times)
        }
        /**
         * @param {Record<string, any>} data
         */
        async assertWasPromptedToSave (data) {
            const calls = await mockedCalls(page, { names: ['storeFormData'] })
            const payloads = payloadsOnly(calls)

            expect(payloads[0].credentials).toEqual(data)
            expect(payloads[0].trigger).toEqual('formSubmission')
        }
        /**
         * @returns {Promise<void>}
         */
        async assertClickMessage () {
            const calls = await mockedCalls(page, { names: ['showAutofillParent'] })
            expect(calls.length).toBe(1)

            // each call is captured as a tuple like this: [name, params, response], which is why
            // we use `call1[1]` and `call1[2]` - we're accessing the params sent in the request
            const [call1] = calls
            expect(call1[1].wasFromClick).toBe(true)
        }
        async assertFocusMessage () {
            const calls = await mockedCalls(page, { names: ['showAutofillParent'] })
            expect(calls.length).toBe(1)

            // each call is captured as a tuple like this: [name, params, response], which is why
            // we use `call1[1]` and `call1[2]` - we're accessing the params sent in the request
            const [call1] = calls
            expect(call1[1].wasFromClick).toBe(false)
        }
        async assertFormSubmitted () {
            const submittedMsg = await page.locator('h1:has-text("Submitted!")')
            await expect(submittedMsg).toBeVisible()
        }
        async assertFormNotSubmittedAutomatically () {
            const submitButton = await page.locator('button:has-text("Log in")')
            await expect(submitButton).toBeVisible()
            await submitButton.click()
            await this.assertFormSubmitted()
        }
        async assertNoAttributesWereAdded () {
            const attrCount = page.locator('[data-ddg-inputtype]')
            const count = await attrCount.count()
            expect(count).toBe(0)
        }
        async assertNoPixelFired () {
            const mockCalls = await mockedCalls(page, { names: ['sendJSPixel'], minCount: 0 })
            expect(mockCalls).toHaveLength(0)
        }
        async openDialog () {
            const button = await page.waitForSelector(`button:has-text("Click here to Login")`)
            await button.click({ force: true })
            await this.assertDialogOpen()
        }
        async assertDialogClose () {
            const form = await page.locator('#login')
            await expect(form).toBeHidden()
        }
        async assertDialogOpen () {
            const form = await page.locator('#login')
            await expect(form).toBeVisible()
        }
        async hitEscapeKey () {
            await page.press('#login', 'Escape')
        }
        async clickOutsideTheDialog () {
            await page.click('#random-text')
        }
        async closeCookieDialog () {
            await page.click('button:has-text("Accept all cookies")')
        }
    }

    return new LoginPage()
}

/**
 * A wrapper around interactions for `integration-test/pages/email-autofill.html`
 *
 * @param {import("@playwright/test").Page} page
 */
export function emailAutofillPage (page) {
    const {selectors} = constants.fields.email

    class EmailAutofillPage {
        async navigate (domain) {
            const emailAutofillPageName = constants.pages['email-autofill']
            if (domain) {
                const pagePath = `integration-test/${emailAutofillPageName}`
                await page.goto(new URL(pagePath, domain).href)
            } else {
                await page.goto(emailAutofillPageName)
            }
        }
        async clickOnPage () {
            const heading = page.locator('h2')
            await heading.click()
        }
        async clickIntoInput () {
            const input = page.locator(selectors.identity)
            // click the input field (not within Dax icon)
            await input.click()
        }
        async clickDirectlyOnDax () {
            const input = page.locator(selectors.identity)
            await clickOnIcon(input)
        }
        async assertInputHasFocus () {
            const input = page.locator(selectors.identity)
            await expect(input).toBeFocused()
        }
        async assertInputNotFocused () {
            const input = page.locator(selectors.identity)
            await expect(input).not.toBeFocused()
        }
        async assertEmailValue (emailAddress) {
            const email = page.locator(selectors.identity)
            await expect(email).toHaveValue(emailAddress)
        }
        /**
         * @param {import('../../src/deviceApiCalls/__generated__/validators-ts').SendJSPixelParams[]} pixels
         */
        async assertPixelsFired (pixels) {
            const calls = await mockedCalls(page, { names: ['sendJSPixel'] })
            expect(calls.length).toBeGreaterThanOrEqual(1)
            const firedPixels = calls.map(([_, {pixelName, params}]) => params ? ({pixelName, params}) : ({pixelName}))
            expect(firedPixels).toEqual(pixels)
        }
        async assertNoPixelsFired () {
            const calls = await mockedCalls(page, { names: ['sendJSPixel'], minCount: 0 })
            expect(calls.length).toBe(0)
        }
        async assertExtensionPixelsCaptured (expectedPixels) {
            let [backgroundPage] = await page.context().backgroundPages()
            const backgroundPagePixels = await backgroundPage.evaluateHandle(() => {
                // eslint-disable-next-line no-undef
                return globalThis.pixels
            })

            const pixels = await backgroundPagePixels.jsonValue()
            expect(pixels).toEqual(expectedPixels)
        }
        async assertDaxIconIsShowing () {
            const input = page.locator(selectors.identity)
            expect(input).toHaveAttribute(ATTR_AUTOFILL, 'true')
        }
        async assertDaxIconIsHidden ({ checking = 'autofill' } = {}) {
            const input = await page.getByLabel('Email')
            if (checking === 'style') {
                const style = await input.getAttribute('style')
                expect(style).toBeFalsy()
            } else {
                expect(input).not.toHaveAttribute(ATTR_AUTOFILL, 'true')
            }
        }
    }

    return new EmailAutofillPage()
}

/**
 * @param {import("@playwright/test").Page} page
 */
export function overlayPage (page) {
    class OverlayPage {
        async navigate () {
            await page.goto(constants.pages['overlay'])
        }
        /**
         * @param {string} text
         * @returns {Promise<void>}
         */
        async clickButtonWithText (text) {
            const button = await page.locator(`button:has-text("${text}")`)
            await addTopAutofillMouseFocus(page, button)
            await button.click({ force: true })
        }
        /**
         * When we're in an overlay, 'closeAutofillParent' should not be called.
         * @params {string} callName
         */
        async doesNotCloseParentAfterCall (callName) {
            const callNameCalls = await mockedCalls(page, {names: [callName]})
            expect(callNameCalls.length).toBeGreaterThanOrEqual(1)
            const closeAutofillParentCalls = await mockedCalls(page, {names: ['closeAutofillParent'], minCount: 0})
            expect(closeAutofillParentCalls.length).toBe(0)
        }
        async assertCloseAutofillParent () {
            const closeAutofillParentCalls = await mockedCalls(page, {names: ['closeAutofillParent']})
            expect(closeAutofillParentCalls.length).toBe(1)
        }
        /**
         * When we're in an overlay, 'closeAutofillParent' should not be called.
         */
        async assertSelectedDetail () {
            return page.waitForFunction(() => {
                const calls = window.__playwright_autofill.mocks.calls
                return calls.some(call => call[0] === 'selectedDetail')
            })
        }
        async assertTextNotPresent (text) {
            const button = await page.locator(`button:has-text("${text}")`)
            await expect(button).toHaveCount(0)
        }
    }

    return new OverlayPage()
}
