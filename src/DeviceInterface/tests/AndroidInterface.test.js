import AndroidInterface from '../AndroidInterface'
import { createGlobalConfig } from '../../config'
import { tryCreateConfig } from '@duckduckgo/content-scope-scripts'
import { fromPlatformConfig } from '../../settings/settings'

describe('AndroidInterface', function () {
    beforeEach(() => {
        require('../../requestIdleCallback')
    })
    it('can be instantiated without throwing', () => {
        const config = createGlobalConfig()
        const device = new AndroidInterface(config)
        device.init()
    })
    it('can create platform configuration', () => {
        const {config} = tryCreateConfig({
            contentScope: {
                features: {
                    autofill: {
                        state: "enabled",
                        exceptions: [],
                    }
                },
                unprotectedTemporary: []
            },
            userPreferences: {
                debug: true,
                features: {
                    autofill: {
                        settings: {
                            featureToggles: {
                                'inputType_credentials': true,
                                'inputType_identities': true,
                                'inputType_creditCards': true,
                                'emailProtection': true,
                                'password_generation': true,
                                'credentials_saving': true,
                            }
                        }
                    }
                },
                platform: {name: "windows"}
            },
            userUnprotectedDomains: []
        });
        const settings = fromPlatformConfig(config);
        expect(settings.featureToggles.inputType_credentials).toBe(true)
    })
})