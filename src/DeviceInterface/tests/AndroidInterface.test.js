import {AndroidInterface} from '../AndroidInterface.js'
import { createGlobalConfig } from '../../config.js'
import {AndroidTransport} from '../../deviceApiCalls/transports/android.transport.js'
import {Settings} from '../../Settings.js'
import {DeviceApi} from '../../../packages/device-api/index.js'

describe('AndroidInterface', function () {
    beforeEach(() => {
        require('../../requestIdleCallback.js')
    })
    it('can be instantiated without throwing', () => {
        const config = createGlobalConfig()
        const ioHandler = new DeviceApi(new AndroidTransport(config))
        const settings = new Settings(config, ioHandler)
        const device = new AndroidInterface(config, ioHandler, settings)
        device.init()
    })
})
