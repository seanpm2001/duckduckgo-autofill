import validateSchema from './settings.validate.cjs';

/**
 * A wrapper for Autofill settings
 */
class AutofillSettings {
    validate = validateSchema

    /** @type {Settings | null} */
    settings = null

    /**
     * @throws
     */
    from(input) {
        if (this.validate(input)) {
            this.settings = input
        } else {
            // @ts-ignore
            for (const error of this.validate.errors) {
                console.error(error.message)
                console.error(error)
            }
            throw new Error('Could not create settings from global configuration')
        }

        return this
    }

    /**
     * @returns {FeatureTogglesSettings}
     */
    get featureToggles() {
        if (!this.settings) throw new Error('unreachable');
        return this.settings.featureToggles;
    }
}

/**
 * @param {import("@duckduckgo/content-scope-scripts").Config} config
 * @returns {AutofillSettings}
 */
export function fromPlatformConfig(config) {
    const globalSettings = config.getSettings("autofill");
    const settings = (new AutofillSettings()).from(globalSettings);
    return settings;
}

export { AutofillSettings }