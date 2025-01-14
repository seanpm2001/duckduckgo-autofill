(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.processConfig = processConfig;

function getTopLevelURL() {
  try {
    // FROM: https://stackoverflow.com/a/7739035/73479
    // FIX: Better capturing of top level URL so that trackers in embedded documents are not considered first party
    if (window.location !== window.parent.location) {
      return new URL(window.location.href !== 'about:blank' ? document.referrer : window.parent.location.href);
    } else {
      return new URL(window.location.href);
    }
  } catch (error) {
    return new URL(location.href);
  }
}

function isUnprotectedDomain(topLevelUrl, featureList) {
  let unprotectedDomain = false;
  const domainParts = topLevelUrl && topLevelUrl.host ? topLevelUrl.host.split('.') : []; // walk up the domain to see if it's unprotected

  while (domainParts.length > 1 && !unprotectedDomain) {
    const partialDomain = domainParts.join('.');
    unprotectedDomain = featureList.filter(domain => domain.domain === partialDomain).length > 0;
    domainParts.shift();
  }

  return unprotectedDomain;
}

function processConfig(data, userList, preferences) {
  const topLevelUrl = getTopLevelURL();
  const allowlisted = userList.filter(domain => domain === topLevelUrl.host).length > 0;
  const enabledFeatures = Object.keys(data.features).filter(featureName => {
    const feature = data.features[featureName];
    return feature.state === 'enabled' && !isUnprotectedDomain(topLevelUrl, feature.exceptions);
  });
  const isBroken = isUnprotectedDomain(topLevelUrl, data.unprotectedTemporary);
  preferences.site = {
    domain: topLevelUrl.hostname,
    isBroken,
    allowlisted,
    enabledFeatures
  }; // TODO

  preferences.cookie = {};
  return preferences;
}

},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _messaging = require("./messaging.js");

Object.keys(_messaging).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _messaging[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _messaging[key];
    }
  });
});

},{"./messaging.js":3}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MissingHandler = exports.MessagingTransport = exports.Messaging = void 0;
Object.defineProperty(exports, "WebkitMessagingConfig", {
  enumerable: true,
  get: function () {
    return _webkit.WebkitMessagingConfig;
  }
});
Object.defineProperty(exports, "WindowsMessagingConfig", {
  enumerable: true,
  get: function () {
    return _windows.WindowsMessagingConfig;
  }
});

var _windows = require("./messaging/windows.js");

var _webkit = require("./messaging/webkit.js");

/**
 * @module Messaging
 *
 * @description
 *
 * An abstraction for communications between JavaScript and host platforms.
 *
 * 1) First you construct your platform-specific configuration (eg: {@link WebkitMessagingConfig})
 * 2) Then use that to get an instance of the Messaging utility which allows
 * you to send and receive data in a unified way
 * 3) Each platform implements {@link MessagingTransport} along with its own Configuration
 *     - For example, to learn what configuration is required for Webkit, see: {@link "Webkit Messaging".WebkitMessagingConfig}
 *     - Or, to learn about how messages are sent and received in Webkit, see {@link "Webkit Messaging".WebkitMessagingTransport}
 *
 * @example Webkit Messaging
 *
 * ```js
 * import { Messaging, WebkitMessagingConfig } from "@duckduckgo/content-scope-scripts/lib/messaging.js"
 *
 * // This config would be injected into the UserScript
 * const injectedConfig = {
 *   hasModernWebkitAPI: true,
 *   webkitMessageHandlerNames: ["foo", "bar", "baz"],
 *   secret: "dax",
 * };
 *
 * // Then use that config to construct platform-specific configuration
 * const config = new WebkitMessagingConfig(injectedConfig);
 *
 * // finally, get an instance of Messaging and start sending messages in a unified way 🚀
 * const messaging = new Messaging(config);
 * messaging.notify("hello world!", {foo: "bar"})
 *
 * ```
 *
 * @example Windows Messaging
 *
 * ```js
 * import { Messaging, WindowsMessagingConfig } from "@duckduckgo/content-scope-scripts/lib/messaging.js"
 *
 * // Messaging on Windows is namespaced, so you can create multiple messaging instances
 * const autofillConfig  = new WindowsMessagingConfig({ featureName: "Autofill" });
 * const debugConfig     = new WindowsMessagingConfig({ featureName: "Debugging" });
 *
 * const autofillMessaging = new Messaging(autofillConfig);
 * const debugMessaging    = new Messaging(debugConfig);
 *
 * // Now send messages to both features as needed 🚀
 * autofillMessaging.notify("storeFormData", { "username": "dax" })
 * debugMessaging.notify("pageLoad", { time: window.performance.now() })
 * ```
 */

/**
 * @implements {MessagingTransport}
 */
class Messaging {
  /**
   * @param {WebkitMessagingConfig | WindowsMessagingConfig} config
   */
  constructor(config) {
    this.transport = getTransport(config);
  }
  /**
   * Send a 'fire-and-forget' message.
   * @throws
   * {@link MissingHandler}
   *
   * @example
   *
   * ```
   * const messaging = new Messaging(config)
   * messaging.notify("foo", {bar: "baz"})
   * ```
   * @param {string} name
   * @param {Record<string, any>} [data]
   */


  notify(name) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.transport.notify(name, data);
  }
  /**
   * Send a request, and wait for a response
   * @throws
   * {@link MissingHandler}
   *
   * @example
   * ```
   * const messaging = new Messaging(config)
   * const response = await messaging.request("foo", {bar: "baz"})
   * ```
   *
   * @param {string} name
   * @param {Record<string, any>} [data]
   * @return {Promise<any>}
   */


  request(name) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return this.transport.request(name, data);
  }

}
/**
 * @interface
 */


exports.Messaging = Messaging;

class MessagingTransport {
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   * @returns {void}
   */
  // @ts-ignore - ignoring a no-unused ts error, this is only an interface.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  notify(name) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    throw new Error("must implement 'notify'");
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   * @return {Promise<any>}
   */
  // @ts-ignore - ignoring a no-unused ts error, this is only an interface.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars


  request(name) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    throw new Error('must implement');
  }

}
/**
 * @param {WebkitMessagingConfig | WindowsMessagingConfig} config
 * @returns {MessagingTransport}
 */


exports.MessagingTransport = MessagingTransport;

function getTransport(config) {
  if (config instanceof _webkit.WebkitMessagingConfig) {
    return new _webkit.WebkitMessagingTransport(config);
  }

  if (config instanceof _windows.WindowsMessagingConfig) {
    return new _windows.WindowsMessagingTransport(config);
  }

  throw new Error('unreachable');
}
/**
 * Thrown when a handler cannot be found
 */


class MissingHandler extends Error {
  /**
   * @param {string} message
   * @param {string} handlerName
   */
  constructor(message, handlerName) {
    super(message);
    this.handlerName = handlerName;
  }

}
/**
 * Some re-exports for convenience
 */


exports.MissingHandler = MissingHandler;

},{"./messaging/webkit.js":4,"./messaging/windows.js":5}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WebkitMessagingTransport = exports.WebkitMessagingConfig = exports.SecureMessagingParams = void 0;

var _messaging = require("../messaging.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @example
 * On macOS 11+, this will just call through to `window.webkit.messageHandlers.x.postMessage`
 *
 * Eg: for a `foo` message defined in Swift that accepted the payload `{"bar": "baz"}`, the following
 * would occur:
 *
 * ```js
 * const json = await window.webkit.messageHandlers.foo.postMessage({ bar: "baz" });
 * const response = JSON.parse(json)
 * ```
 *
 * @example
 * On macOS 10 however, the process is a little more involved. A method will be appended to `window`
 * that allows the response to be delivered there instead. It's not exactly this, but you can visualize the flow
 * as being something along the lines of:
 *
 * ```js
 * // add the window method
 * window["_0123456"] = (response) => {
 *    // decrypt `response` and deliver the result to the caller here
 *    // then remove the temporary method
 *    delete window["_0123456"]
 * };
 *
 * // send the data + `messageHanding` values
 * window.webkit.messageHandlers.foo.postMessage({
 *   bar: "baz",
 *   messagingHandling: {
 *     methodName: "_0123456",
 *     secret: "super-secret",
 *     key: [1, 2, 45, 2],
 *     iv: [34, 4, 43],
 *   }
 * });
 *
 * // later in swift, the following JavaScript snippet will be executed
 * (() => {
 *   window["_0123456"]({
 *     ciphertext: [12, 13, 4],
 *     tag: [3, 5, 67, 56]
 *   })
 * })()
 * ```
 * @implements {MessagingTransport}
 */
class WebkitMessagingTransport {
  /** @type {WebkitMessagingConfig} */

  /**
   * @param {WebkitMessagingConfig} config
   */
  constructor(config) {
    _defineProperty(this, "config", void 0);

    _defineProperty(this, "globals", void 0);

    _defineProperty(this, "algoObj", {
      name: 'AES-GCM',
      length: 256
    });

    this.config = config;
    this.globals = captureGlobals();

    if (!this.config.hasModernWebkitAPI) {
      this.captureWebkitHandlers(this.config.webkitMessageHandlerNames);
    }
  }
  /**
   * Sends message to the webkit layer (fire and forget)
   * @param {String} handler
   * @param {*} data
   * @internal
   */


  wkSend(handler) {
    var _this$globals$window$, _this$globals$window$2;

    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (!(handler in this.globals.window.webkit.messageHandlers)) {
      throw new _messaging.MissingHandler("Missing webkit handler: '".concat(handler, "'"), handler);
    }

    const outgoing = { ...data,
      messageHandling: { ...data.messageHandling,
        secret: this.config.secret
      }
    };

    if (!this.config.hasModernWebkitAPI) {
      if (!(handler in this.globals.capturedWebkitHandlers)) {
        throw new _messaging.MissingHandler("cannot continue, method ".concat(handler, " not captured on macos < 11"), handler);
      } else {
        return this.globals.capturedWebkitHandlers[handler](outgoing);
      }
    }

    return (_this$globals$window$ = (_this$globals$window$2 = this.globals.window.webkit.messageHandlers[handler]).postMessage) === null || _this$globals$window$ === void 0 ? void 0 : _this$globals$window$.call(_this$globals$window$2, outgoing);
  }
  /**
   * Sends message to the webkit layer and waits for the specified response
   * @param {String} handler
   * @param {*} data
   * @returns {Promise<*>}
   * @internal
   */


  async wkSendAndWait(handler) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (this.config.hasModernWebkitAPI) {
      const response = await this.wkSend(handler, data);
      return this.globals.JSONparse(response || '{}');
    }

    try {
      const randMethodName = this.createRandMethodName();
      const key = await this.createRandKey();
      const iv = this.createRandIv();
      const {
        ciphertext,
        tag
      } = await new this.globals.Promise((
      /** @type {any} */
      resolve) => {
        this.generateRandomMethod(randMethodName, resolve);
        data.messageHandling = new SecureMessagingParams({
          methodName: randMethodName,
          secret: this.config.secret,
          key: this.globals.Arrayfrom(key),
          iv: this.globals.Arrayfrom(iv)
        });
        this.wkSend(handler, data);
      });
      const cipher = new this.globals.Uint8Array([...ciphertext, ...tag]);
      const decrypted = await this.decrypt(cipher, key, iv);
      return this.globals.JSONparse(decrypted || '{}');
    } catch (e) {
      // re-throw when the error is just a 'MissingHandler'
      if (e instanceof _messaging.MissingHandler) {
        throw e;
      } else {
        console.error('decryption failed', e);
        console.error(e);
        return {
          error: e
        };
      }
    }
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   */


  notify(name) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.wkSend(name, data);
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars


  request(name) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return this.wkSendAndWait(name, data);
  }
  /**
   * Generate a random method name and adds it to the global scope
   * The native layer will use this method to send the response
   * @param {string | number} randomMethodName
   * @param {Function} callback
   */


  generateRandomMethod(randomMethodName, callback) {
    var _this = this;

    this.globals.ObjectDefineProperty(this.globals.window, randomMethodName, {
      enumerable: false,
      // configurable, To allow for deletion later
      configurable: true,
      writable: false,

      /**
       * @param {any[]} args
       */
      value: function () {
        callback(...arguments); // @ts-ignore - we want this to throw if it fails as it would indicate a fatal error.

        delete _this.globals.window[randomMethodName];
      }
    });
  }

  randomString() {
    return '' + this.globals.getRandomValues(new this.globals.Uint32Array(1))[0];
  }

  createRandMethodName() {
    return '_' + this.randomString();
  }
  /**
   * @type {{name: string, length: number}}
   */


  /**
   * @returns {Promise<Uint8Array>}
   */
  async createRandKey() {
    const key = await this.globals.generateKey(this.algoObj, true, ['encrypt', 'decrypt']);
    const exportedKey = await this.globals.exportKey('raw', key);
    return new this.globals.Uint8Array(exportedKey);
  }
  /**
   * @returns {Uint8Array}
   */


  createRandIv() {
    return this.globals.getRandomValues(new this.globals.Uint8Array(12));
  }
  /**
   * @param {BufferSource} ciphertext
   * @param {BufferSource} key
   * @param {Uint8Array} iv
   * @returns {Promise<string>}
   */


  async decrypt(ciphertext, key, iv) {
    const cryptoKey = await this.globals.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
    const algo = {
      name: 'AES-GCM',
      iv
    };
    let decrypted = await this.globals.decrypt(algo, cryptoKey, ciphertext);
    let dec = new this.globals.TextDecoder();
    return dec.decode(decrypted);
  }
  /**
   * When required (such as on macos 10.x), capture the `postMessage` method on
   * each webkit messageHandler
   *
   * @param {string[]} handlerNames
   */


  captureWebkitHandlers(handlerNames) {
    const handlers = window.webkit.messageHandlers;
    if (!handlers) throw new _messaging.MissingHandler('window.webkit.messageHandlers was absent', 'all');

    for (let webkitMessageHandlerName of handlerNames) {
      var _handlers$webkitMessa;

      if (typeof ((_handlers$webkitMessa = handlers[webkitMessageHandlerName]) === null || _handlers$webkitMessa === void 0 ? void 0 : _handlers$webkitMessa.postMessage) === 'function') {
        var _handlers$webkitMessa2;

        /**
         * `bind` is used here to ensure future calls to the captured
         * `postMessage` have the correct `this` context
         */
        const original = handlers[webkitMessageHandlerName];
        const bound = (_handlers$webkitMessa2 = handlers[webkitMessageHandlerName].postMessage) === null || _handlers$webkitMessa2 === void 0 ? void 0 : _handlers$webkitMessa2.bind(original);
        this.globals.capturedWebkitHandlers[webkitMessageHandlerName] = bound;
        delete handlers[webkitMessageHandlerName].postMessage;
      }
    }
  }

}
/**
 * Use this configuration to create an instance of {@link Messaging} for WebKit
 *
 * ```js
 * import { fromConfig, WebkitMessagingConfig } from "@duckduckgo/content-scope-scripts/lib/messaging.js"
 *
 * const config = new WebkitMessagingConfig({
 *   hasModernWebkitAPI: true,
 *   webkitMessageHandlerNames: ["foo", "bar", "baz"],
 *   secret: "dax",
 * });
 *
 * const messaging = new Messaging(config)
 * const resp = await messaging.request("debugConfig")
 * ```
 */


exports.WebkitMessagingTransport = WebkitMessagingTransport;

class WebkitMessagingConfig {
  /**
   * @param {object} params
   * @param {boolean} params.hasModernWebkitAPI
   * @param {string[]} params.webkitMessageHandlerNames
   * @param {string} params.secret
   */
  constructor(params) {
    /**
     * Whether or not the current WebKit Platform supports secure messaging
     * by default (eg: macOS 11+)
     */
    this.hasModernWebkitAPI = params.hasModernWebkitAPI;
    /**
     * A list of WebKit message handler names that a user script can send
     */

    this.webkitMessageHandlerNames = params.webkitMessageHandlerNames;
    /**
     * A string provided by native platforms to be sent with future outgoing
     * messages
     */

    this.secret = params.secret;
  }

}
/**
 * This is the additional payload that gets appended to outgoing messages.
 * It's used in the Swift side to encrypt the response that comes back
 */


exports.WebkitMessagingConfig = WebkitMessagingConfig;

class SecureMessagingParams {
  /**
   * @param {object} params
   * @param {string} params.methodName
   * @param {string} params.secret
   * @param {number[]} params.key
   * @param {number[]} params.iv
   */
  constructor(params) {
    /**
     * The method that's been appended to `window` to be called later
     */
    this.methodName = params.methodName;
    /**
     * The secret used to ensure message sender validity
     */

    this.secret = params.secret;
    /**
     * The CipherKey as number[]
     */

    this.key = params.key;
    /**
     * The Initial Vector as number[]
     */

    this.iv = params.iv;
  }

}
/**
 * Capture some globals used for messaging handling to prevent page
 * scripts from tampering with this
 */


exports.SecureMessagingParams = SecureMessagingParams;

function captureGlobals() {
  // Creat base with null prototype
  return {
    window,
    // Methods must be bound to their interface, otherwise they throw Illegal invocation
    encrypt: window.crypto.subtle.encrypt.bind(window.crypto.subtle),
    decrypt: window.crypto.subtle.decrypt.bind(window.crypto.subtle),
    generateKey: window.crypto.subtle.generateKey.bind(window.crypto.subtle),
    exportKey: window.crypto.subtle.exportKey.bind(window.crypto.subtle),
    importKey: window.crypto.subtle.importKey.bind(window.crypto.subtle),
    getRandomValues: window.crypto.getRandomValues.bind(window.crypto),
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Uint16Array,
    Uint32Array,
    JSONstringify: window.JSON.stringify,
    JSONparse: window.JSON.parse,
    Arrayfrom: window.Array.from,
    Promise: window.Promise,
    ObjectDefineProperty: window.Object.defineProperty,
    addEventListener: window.addEventListener.bind(window),

    /** @type {Record<string, any>} */
    capturedWebkitHandlers: {}
  };
}

},{"../messaging.js":3}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WindowsMessagingTransport = exports.WindowsMessagingConfig = void 0;

var _messaging = require("../messaging.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @implements {MessagingTransport}
 */
class WindowsMessagingTransport {
  /**
   * @param {WindowsMessagingConfig} config
   */
  constructor(config) {
    _defineProperty(this, "config", void 0);

    this.config = config;
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   */
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars


  notify(name) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    throw new Error('todo: implement notify for windows');
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   * @param {{signal?: AbortSignal}} opts
   * @return {Promise<any>}
   */
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars


  request(name) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    throw new Error('todo: implement request for windows');
  }

}

exports.WindowsMessagingTransport = WindowsMessagingTransport;

class WindowsMessagingConfig {
  /**
   * @param {object} params
   * @param {string} params.featureName
   */
  constructor(params) {
    this.featureName = params.featureName;
  }

}

exports.WindowsMessagingConfig = WindowsMessagingConfig;

},{"../messaging.js":3}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "DeviceApi", {
  enumerable: true,
  get: function () {
    return _deviceApi.DeviceApi;
  }
});
Object.defineProperty(exports, "DeviceApiCall", {
  enumerable: true,
  get: function () {
    return _deviceApiCall.DeviceApiCall;
  }
});
Object.defineProperty(exports, "DeviceApiTransport", {
  enumerable: true,
  get: function () {
    return _deviceApi.DeviceApiTransport;
  }
});
Object.defineProperty(exports, "createNotification", {
  enumerable: true,
  get: function () {
    return _deviceApiCall.createNotification;
  }
});
Object.defineProperty(exports, "createRequest", {
  enumerable: true,
  get: function () {
    return _deviceApiCall.createRequest;
  }
});
Object.defineProperty(exports, "validate", {
  enumerable: true,
  get: function () {
    return _deviceApiCall.validate;
  }
});

var _deviceApiCall = require("./lib/device-api-call.js");

var _deviceApi = require("./lib/device-api.js");

},{"./lib/device-api-call.js":7,"./lib/device-api.js":8}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SchemaValidationError = exports.DeviceApiCallError = exports.DeviceApiCall = void 0;
exports.createDeviceApiCall = createDeviceApiCall;
exports.createNotification = void 0;
exports.createRequest = createRequest;
exports.validate = validate;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * This roughly follows https://www.jsonrpc.org/specification
 * @template {import("zod").ZodType} Params=import("zod").ZodType
 * @template {import("zod").ZodType} Result=import("zod").ZodType
 */
class DeviceApiCall {
  /** @type {string} */

  /**
   * An optional 'id' - used to indicate if a request requires a response.
   * @type {string|null}
   */

  /** @type {Params | null | undefined} */

  /** @type {Result | null | undefined} */

  /** @type {import("zod").infer<Params>} */

  /**
   * This is a carve-out for legacy messages that are not typed yet.
   * If you set this to 'true', then the response will not be checked to conform
   * to any shape
   * @deprecated this is here to aid migration, should be removed ASAP
   * @type {boolean}
   */

  /**
   * New messages should be in a particular format, eg: { success: T },
   * but you can set this to false if you want to access the result as-is,
   * without any unwrapping logic
   * @deprecated this is here to aid migration, should be removed ASAP
   * @type {boolean}
   */

  /**
   * @param {import("zod").infer<Params>} data
   */
  constructor(data) {
    _defineProperty(this, "method", 'unknown');

    _defineProperty(this, "id", null);

    _defineProperty(this, "paramsValidator", null);

    _defineProperty(this, "resultValidator", null);

    _defineProperty(this, "params", void 0);

    _defineProperty(this, "throwOnResultKeysMissing", true);

    _defineProperty(this, "unwrapResult", true);

    this.params = data;
  }
  /**
   * @returns {import("zod").infer<Params>|undefined}
   */


  validateParams() {
    if (this.params === undefined) {
      return undefined;
    }

    this._validate(this.params, this.paramsValidator);

    return this.params;
  }
  /**
   * @param {any|null} incoming
   * @returns {import("zod").infer<Result>}
   */


  validateResult(incoming) {
    this._validate(incoming, this.resultValidator);

    if (!incoming) {
      return incoming;
    }

    if (!this.unwrapResult) {
      return incoming;
    }

    if ('data' in incoming) {
      console.warn('response had `data` property. Please migrate to `success`');
      return incoming.data;
    }

    if ('success' in incoming) {
      return incoming.success;
    }

    if ('error' in incoming) {
      if (typeof incoming.error.message === 'string') {
        throw new DeviceApiCallError("".concat(this.method, ": ").concat(incoming.error.message));
      }
    }

    if (this.throwOnResultKeysMissing) {
      throw new Error('unreachable. Response did not contain `success` or `data`');
    }

    return incoming;
  }
  /**
   * @param {any} data
   * @param {import("zod").ZodType|undefined|null} [validator]
   * @private
   */


  _validate(data, validator) {
    if (!validator) return data;

    if (validator) {
      const result = validator === null || validator === void 0 ? void 0 : validator.safeParse(data);

      if (!result) {
        throw new Error('unreachable, data failure', data);
      }

      if (!result.success) {
        if ('error' in result) {
          this.throwError(result.error.issues);
        } else {
          console.error('unknown error from validate');
        }
      }
    }
  }
  /**
   * @param {import('zod').ZodIssue[]} errors
   */


  throwError(errors) {
    const error = SchemaValidationError.fromZodErrors(errors, this.constructor.name);
    throw error;
  }
  /**
   * Use this helper for creating stand-in response messages that are typed correctly.
   *
   * @examples
   *
   * ```js
   * const msg = new Message();
   * const response = msg.response({}) // <-- This argument will be typed correctly
   * ```
   *
   * @param {import("zod").infer<Result>} response
   * @returns {import("zod").infer<Result>}
   */


  result(response) {
    return response;
  }
  /**
   * @returns {import("zod").infer<Result>}
   */


  preResultValidation(response) {
    return response;
  }

}

exports.DeviceApiCall = DeviceApiCall;

class DeviceApiCallError extends Error {}
/**
 * Check for this error if you'd like to
 */


exports.DeviceApiCallError = DeviceApiCallError;

class SchemaValidationError extends Error {
  constructor() {
    super(...arguments);

    _defineProperty(this, "validationErrors", []);
  }

  /**
   * @param {import("zod").ZodIssue[]} errors
   * @param {string} name
   * @returns {SchemaValidationError}
   */
  static fromZodErrors(errors, name) {
    const heading = "".concat(errors.length, " SchemaValidationError(s) errors for ") + name;

    function log(issue) {
      switch (issue.code) {
        case 'invalid_literal':
        case 'invalid_type':
          {
            console.log("".concat(name, ". Path: '").concat(issue.path.join('.'), "', Error: '").concat(issue.message, "'"));
            break;
          }

        case 'invalid_union':
          {
            for (let unionError of issue.unionErrors) {
              for (let issue1 of unionError.issues) {
                log(issue1);
              }
            }

            break;
          }

        default:
          {
            console.log(name, 'other issue:', issue);
          }
      }
    }

    for (let error of errors) {
      log(error);
    }

    const message = [heading, 'please see the details above'].join('\n    ');
    const error = new SchemaValidationError(message);
    error.validationErrors = errors;
    return error;
  }

}
/**
 * Creates an instance of `DeviceApiCall` from only a name and 'params'
 * and optional validators. Use this to help migrate existing messages.
 *
 * @template {import("zod").ZodType} Params
 * @template {import("zod").ZodType} Result
 * @param {string} method
 * @param {import("zod").infer<Params>} [params]
 * @param {Params|null} [paramsValidator]
 * @param {Result|null} [resultValidator]
 * @returns {DeviceApiCall<Params, Result>}
 */


exports.SchemaValidationError = SchemaValidationError;

function createDeviceApiCall(method, params) {
  let paramsValidator = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  let resultValidator = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  /** @type {DeviceApiCall<Params, Result>} */
  const deviceApiCall = new DeviceApiCall(params);
  deviceApiCall.paramsValidator = paramsValidator;
  deviceApiCall.resultValidator = resultValidator;
  deviceApiCall.method = method;
  deviceApiCall.throwOnResultKeysMissing = false;
  deviceApiCall.unwrapResult = false;
  return deviceApiCall;
}
/**
 * Creates an instance of `DeviceApiCall` from only a name and 'params'
 * and optional validators. Use this to help migrate existing messages.
 *
 * Note: This creates a regular DeviceApiCall, but adds the 'id' as a string
 * so that transports know that it expects a response.
 *
 * @template {import("zod").ZodType} Params
 * @template {import("zod").ZodType} Result
 * @param {string} method
 * @param {import("zod").infer<Params>} [params]
 * @param {string} [id]
 * @param {Params|null} [paramsValidator]
 * @param {Result|null} [resultValidator]
 * @returns {DeviceApiCall<Params, Result>}
 */


function createRequest(method, params) {
  let id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'n/a';
  let paramsValidator = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
  let resultValidator = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
  const call = createDeviceApiCall(method, params, paramsValidator, resultValidator);
  call.id = id;
  return call;
}

const createNotification = createDeviceApiCall;
/**
 * Validate any arbitrary data with any Zod validator
 *
 * @template {import("zod").ZodType} Validator
 * @param {any} data
 * @param {Validator | null} [validator]
 * @returns {import("zod").infer<Validator>}
 */

exports.createNotification = createNotification;

function validate(data) {
  let validator = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  if (validator) {
    return validator.parse(data);
  }

  return data;
}

},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceApiTransport = exports.DeviceApi = void 0;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Platforms should only need to implement this `send` method
 */
class DeviceApiTransport {
  /**
   * @param {import("./device-api-call.js").DeviceApiCall} _deviceApiCall
   * @param {CallOptions} [_options]
   * @returns {Promise<any>}
   */
  async send(_deviceApiCall, _options) {
    return undefined;
  }

}
/**
 * This is the base Sender class that platforms can will implement.
 *
 * Note: The 'handle' method must be implemented, unless you also implement 'send'
 *
 * @typedef CallOptions
 * @property {AbortSignal} [signal]
 */


exports.DeviceApiTransport = DeviceApiTransport;

class DeviceApi {
  /** @type {DeviceApiTransport} */

  /** @param {DeviceApiTransport} transport */
  constructor(transport) {
    _defineProperty(this, "transport", void 0);

    this.transport = transport;
  }
  /**
   * @template {import("./device-api-call").DeviceApiCall} D
   * @param {D} deviceApiCall
   * @param {CallOptions} [options]
   * @returns {Promise<NonNullable<ReturnType<D['validateResult']>['success']>>}
   */


  async request(deviceApiCall, options) {
    deviceApiCall.validateParams();
    let result = await this.transport.send(deviceApiCall, options);
    let processed = deviceApiCall.preResultValidation(result);
    return deviceApiCall.validateResult(processed);
  }
  /**
   * @template {import("./device-api-call").DeviceApiCall} P
   * @param {P} deviceApiCall
   * @param {CallOptions} [options]
   * @returns {Promise<void>}
   */


  async notify(deviceApiCall, options) {
    deviceApiCall.validateParams();
    return this.transport.send(deviceApiCall, options);
  }

}

exports.DeviceApi = DeviceApi;

},{}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HostnameInputError = void 0;
Object.defineProperty(exports, "ParserError", {
  enumerable: true,
  get: function () {
    return _rulesParser.ParserError;
  }
});
exports._selectPasswordRules = _selectPasswordRules;
Object.defineProperty(exports, "constants", {
  enumerable: true,
  get: function () {
    return _constants.constants;
  }
});
exports.generate = generate;

var _applePassword = require("./lib/apple.password.js");

var _rulesParser = require("./lib/rules-parser.js");

var _constants = require("./lib/constants.js");

/**
 * @typedef {{
 *   domain?: string | null | undefined;
 *   input?: string | null | undefined;
 *   rules?: RulesFormat | null | undefined;
 *   onError?: ((error: unknown) => void) | null | undefined;
 * }} GenerateOptions
 */

/**
 * Generate a random password based on the following attempts
 *
 * 1) using `options.input` if provided -> falling back to default ruleset
 * 2) using `options.domain` if provided -> falling back to default ruleset
 * 3) using default ruleset
 *
 * Note: This API is designed to never throw - if you want to observe errors
 * during development, you can provide an `onError` callback
 *
 * @param {GenerateOptions} [options]
 */
function generate() {
  let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  try {
    if (typeof (options === null || options === void 0 ? void 0 : options.input) === 'string') {
      return _applePassword.Password.generateOrThrow(options.input);
    }

    if (typeof (options === null || options === void 0 ? void 0 : options.domain) === 'string') {
      if (options !== null && options !== void 0 && options.rules) {
        const rules = _selectPasswordRules(options.domain, options.rules);

        if (rules) {
          return _applePassword.Password.generateOrThrow(rules);
        }
      }
    }
  } catch (e) {
    // if an 'onError' callback was provided, forward all errors
    if (options !== null && options !== void 0 && options.onError && typeof (options === null || options === void 0 ? void 0 : options.onError) === 'function') {
      options.onError(e);
    } else {
      // otherwise, only console.error unknown errors (which could be implementation bugs)
      const isKnownError = e instanceof _rulesParser.ParserError || e instanceof HostnameInputError;

      if (!isKnownError) {
        console.error(e);
      }
    }
  } // At this point, we have to trust the generation will not throw
  // as it is NOT using any user/page-provided data


  return _applePassword.Password.generateDefault();
} // An extension type to differentiate between known errors


class HostnameInputError extends Error {}
/**
 * @typedef {Record<string, {"password-rules": string}>} RulesFormat
 */

/**
 * @private
 * @param {string} inputHostname
 * @param {RulesFormat} rules
 * @returns {string | undefined}
 * @throws {HostnameInputError}
 */


exports.HostnameInputError = HostnameInputError;

function _selectPasswordRules(inputHostname, rules) {
  const hostname = _safeHostname(inputHostname); // direct match


  if (rules[hostname]) {
    return rules[hostname]['password-rules'];
  } // otherwise, start chopping off subdomains and re-joining to compare


  const pieces = hostname.split('.');

  while (pieces.length > 1) {
    pieces.shift();
    const joined = pieces.join('.');

    if (rules[joined]) {
      return rules[joined]['password-rules'];
    }
  }

  return undefined;
}
/**
 * @private
 * @param {string} inputHostname;
 * @throws {HostnameInputError}
 * @returns {string}
 */


function _safeHostname(inputHostname) {
  if (inputHostname.startsWith('http:') || inputHostname.startsWith('https:')) {
    throw new HostnameInputError('invalid input, you can only provide a hostname but you gave a scheme');
  }

  if (inputHostname.includes(':')) {
    throw new HostnameInputError('invalid input, you can only provide a hostname but you gave a :port');
  }

  try {
    const asUrl = new URL('https://' + inputHostname);
    return asUrl.hostname;
  } catch (e) {
    throw new HostnameInputError("could not instantiate a URL from that hostname ".concat(inputHostname));
  }
}

},{"./lib/apple.password.js":10,"./lib/constants.js":11,"./lib/rules-parser.js":12}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Password = void 0;

var parser = _interopRequireWildcard(require("./rules-parser.js"));

var _constants = require("./constants.js");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @typedef {{
 *     PasswordAllowedCharacters?: string,
 *     PasswordRequiredCharacters?: string[],
 *     PasswordRepeatedCharacterLimit?: number,
 *     PasswordConsecutiveCharacterLimit?: number,
 *     PasswordMinLength?: number,
 *     PasswordMaxLength?: number,
 * }} Requirements
 */

/**
 * @typedef {{
 *     NumberOfRequiredRandomCharacters: number,
 *     PasswordAllowedCharacters: string,
 *     RequiredCharacterSets: string[]
 * }} PasswordParameters
 */
const defaults = Object.freeze({
  SCAN_SET_ORDER: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-~!@#$%^&*_+=`|(){}[:;\\\"'<>,.?/ ]",
  defaultUnambiguousCharacters: 'abcdefghijkmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ0123456789',
  defaultPasswordLength: _constants.constants.DEFAULT_MIN_LENGTH,
  defaultPasswordRules: _constants.constants.DEFAULT_PASSWORD_RULES,
  defaultRequiredCharacterSets: ['abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789'],

  /**
   * @type {typeof window.crypto.getRandomValues | null}
   */
  getRandomValues: null
});
/**
 * This is added here to ensure:
 *
 * 1) `getRandomValues` is called with the correct prototype chain
 * 2) `window` is not accessed when in a node environment
 * 3) `bind` is not called in a hot code path
 *
 * @type {{ getRandomValues: typeof window.crypto.getRandomValues }}
 */

const safeGlobals = {};

if (typeof window !== 'undefined') {
  safeGlobals.getRandomValues = window.crypto.getRandomValues.bind(window.crypto);
}

class Password {
  /**
   * @type {typeof defaults}
   */

  /**
   * @param {Partial<typeof defaults>} [options]
   */
  constructor() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _defineProperty(this, "options", void 0);

    this.options = { ...defaults,
      ...options
    };
    return this;
  }
  /**
   * This is here to provide external access to un-modified defaults
   * in case they are needed for tests/verifications
   * @type {typeof defaults}
   */


  /**
   * Generates a password from the given input.
   *
   * Note: This method will throw an error if parsing fails - use with caution
   *
   * @example
   *
   * ```javascript
   * const password = Password.generateOrThrow("minlength: 20")
   * ```
   * @public
   * @param {string} inputString
   * @param {Partial<typeof defaults>} [options]
   * @throws {ParserError|Error}
   * @returns {string}
   */
  static generateOrThrow(inputString) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return new Password(options).parse(inputString).generate();
  }
  /**
   * Generates a password using the default ruleset.
   *
   * @example
   *
   * ```javascript
   * const password = Password.generateDefault()
   * ```
   *
   * @public
   * @param {Partial<typeof defaults>} [options]
   * @returns {string}
   */


  static generateDefault() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return new Password(options).parse(Password.defaults.defaultPasswordRules).generate();
  }
  /**
   * Convert a ruleset into it's internally-used component pieces.
   *
   * @param {string} inputString
   * @throws {parser.ParserError|Error}
   * @returns {{
   *    requirements: Requirements;
   *    parameters: PasswordParameters;
   *    rules: parser.Rule[],
   *    get entropy(): number;
   *    generate: () => string;
   * }}
   */


  parse(inputString) {
    const rules = parser.parsePasswordRules(inputString);

    const requirements = this._requirementsFromRules(rules);

    if (!requirements) throw new Error('could not generate requirements for ' + JSON.stringify(inputString));

    const parameters = this._passwordGenerationParametersDictionary(requirements);

    return {
      requirements,
      parameters,
      rules,

      get entropy() {
        return Math.log2(parameters.PasswordAllowedCharacters.length ** parameters.NumberOfRequiredRandomCharacters);
      },

      generate: () => {
        const password = this._generatedPasswordMatchingRequirements(requirements, parameters);
        /**
         * The following is unreachable because if user input was incorrect then
         * the parsing phase would throw. The following lines is to satisfy Typescript
         */


        if (password === '') throw new Error('unreachable');
        return password;
      }
    };
  }
  /**
   * Given an array of `Rule's`, convert into `Requirements`
   *
   * @param {parser.Rule[]} passwordRules
   * @returns {Requirements | null}
   */


  _requirementsFromRules(passwordRules) {
    /** @type {Requirements} */
    const requirements = {};

    for (let rule of passwordRules) {
      if (rule.name === parser.RuleName.ALLOWED) {
        console.assert(!('PasswordAllowedCharacters' in requirements));

        const chars = this._charactersFromCharactersClasses(rule.value);

        const scanSet = this._canonicalizedScanSetFromCharacters(chars);

        if (scanSet) {
          requirements.PasswordAllowedCharacters = scanSet;
        }
      } else if (rule.name === parser.RuleName.MAX_CONSECUTIVE) {
        console.assert(!('PasswordRepeatedCharacterLimit' in requirements));
        requirements.PasswordRepeatedCharacterLimit = rule.value;
      } else if (rule.name === parser.RuleName.REQUIRED) {
        let requiredCharacters = requirements.PasswordRequiredCharacters;

        if (!requiredCharacters) {
          requiredCharacters = requirements.PasswordRequiredCharacters = [];
        }

        requiredCharacters.push(this._canonicalizedScanSetFromCharacters(this._charactersFromCharactersClasses(rule.value)));
      } else if (rule.name === parser.RuleName.MIN_LENGTH) {
        requirements.PasswordMinLength = rule.value;
      } else if (rule.name === parser.RuleName.MAX_LENGTH) {
        requirements.PasswordMaxLength = rule.value;
      }
    } // Only include an allowed rule matching SCAN_SET_ORDER (all characters) when a required rule is also present.


    if (requirements.PasswordAllowedCharacters === this.options.SCAN_SET_ORDER && !requirements.PasswordRequiredCharacters) {
      delete requirements.PasswordAllowedCharacters;
    } // Fix up PasswordRequiredCharacters, if needed.


    if (requirements.PasswordRequiredCharacters && requirements.PasswordRequiredCharacters.length === 1 && requirements.PasswordRequiredCharacters[0] === this.options.SCAN_SET_ORDER) {
      delete requirements.PasswordRequiredCharacters;
    }

    return Object.keys(requirements).length ? requirements : null;
  }
  /**
   * @param {number} range
   * @returns {number}
   */


  _randomNumberWithUniformDistribution(range) {
    const getRandomValues = this.options.getRandomValues || safeGlobals.getRandomValues; // Based on the algorithm described in https://pthree.org/2018/06/13/why-the-multiply-and-floor-rng-method-is-biased/

    const max = Math.floor(2 ** 32 / range) * range;
    let x;

    do {
      x = getRandomValues(new Uint32Array(1))[0];
    } while (x >= max);

    return x % range;
  }
  /**
   * @param {number} numberOfRequiredRandomCharacters
   * @param {string} allowedCharacters
   */


  _classicPassword(numberOfRequiredRandomCharacters, allowedCharacters) {
    const length = allowedCharacters.length;
    const randomCharArray = Array(numberOfRequiredRandomCharacters);

    for (let i = 0; i < numberOfRequiredRandomCharacters; i++) {
      const index = this._randomNumberWithUniformDistribution(length);

      randomCharArray[i] = allowedCharacters[index];
    }

    return randomCharArray.join('');
  }
  /**
   * @param {string} password
   * @param {number} consecutiveCharLimit
   * @returns {boolean}
   */


  _passwordHasNotExceededConsecutiveCharLimit(password, consecutiveCharLimit) {
    let longestConsecutiveCharLength = 1;
    let firstConsecutiveCharIndex = 0; // Both "123" or "abc" and "321" or "cba" are considered consecutive.

    let isSequenceAscending;

    for (let i = 1; i < password.length; i++) {
      const currCharCode = password.charCodeAt(i);
      const prevCharCode = password.charCodeAt(i - 1);

      if (isSequenceAscending) {
        // If `isSequenceAscending` is defined, then we know that we are in the middle of an existing
        // pattern. Check if the pattern continues based on whether the previous pattern was
        // ascending or descending.
        if (isSequenceAscending.valueOf() && currCharCode === prevCharCode + 1 || !isSequenceAscending.valueOf() && currCharCode === prevCharCode - 1) {
          continue;
        } // Take into account the case when the sequence transitions from descending
        // to ascending.


        if (currCharCode === prevCharCode + 1) {
          firstConsecutiveCharIndex = i - 1;
          isSequenceAscending = Boolean(true);
          continue;
        } // Take into account the case when the sequence transitions from ascending
        // to descending.


        if (currCharCode === prevCharCode - 1) {
          firstConsecutiveCharIndex = i - 1;
          isSequenceAscending = Boolean(false);
          continue;
        }

        isSequenceAscending = null;
      } else if (currCharCode === prevCharCode + 1) {
        isSequenceAscending = Boolean(true);
        continue;
      } else if (currCharCode === prevCharCode - 1) {
        isSequenceAscending = Boolean(false);
        continue;
      }

      const currConsecutiveCharLength = i - firstConsecutiveCharIndex;

      if (currConsecutiveCharLength > longestConsecutiveCharLength) {
        longestConsecutiveCharLength = currConsecutiveCharLength;
      }

      firstConsecutiveCharIndex = i;
    }

    if (isSequenceAscending) {
      const currConsecutiveCharLength = password.length - firstConsecutiveCharIndex;

      if (currConsecutiveCharLength > longestConsecutiveCharLength) {
        longestConsecutiveCharLength = currConsecutiveCharLength;
      }
    }

    return longestConsecutiveCharLength <= consecutiveCharLimit;
  }
  /**
   * @param {string} password
   * @param {number} repeatedCharLimit
   * @returns {boolean}
   */


  _passwordHasNotExceededRepeatedCharLimit(password, repeatedCharLimit) {
    let longestRepeatedCharLength = 1;
    let lastRepeatedChar = password.charAt(0);
    let lastRepeatedCharIndex = 0;

    for (let i = 1; i < password.length; i++) {
      const currChar = password.charAt(i);

      if (currChar === lastRepeatedChar) {
        continue;
      }

      const currRepeatedCharLength = i - lastRepeatedCharIndex;

      if (currRepeatedCharLength > longestRepeatedCharLength) {
        longestRepeatedCharLength = currRepeatedCharLength;
      }

      lastRepeatedChar = currChar;
      lastRepeatedCharIndex = i;
    }

    return longestRepeatedCharLength <= repeatedCharLimit;
  }
  /**
   * @param {string} password
   * @param {string[]} requiredCharacterSets
   * @returns {boolean}
   */


  _passwordContainsRequiredCharacters(password, requiredCharacterSets) {
    const requiredCharacterSetsLength = requiredCharacterSets.length;
    const passwordLength = password.length;

    for (let i = 0; i < requiredCharacterSetsLength; i++) {
      const requiredCharacterSet = requiredCharacterSets[i];
      let hasRequiredChar = false;

      for (let j = 0; j < passwordLength; j++) {
        const char = password.charAt(j);

        if (requiredCharacterSet.indexOf(char) !== -1) {
          hasRequiredChar = true;
          break;
        }
      }

      if (!hasRequiredChar) {
        return false;
      }
    }

    return true;
  }
  /**
   * @param {string} string1
   * @param {string} string2
   * @returns {boolean}
   */


  _stringsHaveAtLeastOneCommonCharacter(string1, string2) {
    const string2Length = string2.length;

    for (let i = 0; i < string2Length; i++) {
      const char = string2.charAt(i);

      if (string1.indexOf(char) !== -1) {
        return true;
      }
    }

    return false;
  }
  /**
   * @param {Requirements} requirements
   * @returns {PasswordParameters}
   */


  _passwordGenerationParametersDictionary(requirements) {
    let minPasswordLength = requirements.PasswordMinLength;
    const maxPasswordLength = requirements.PasswordMaxLength; // @ts-ignore

    if (minPasswordLength > maxPasswordLength) {
      // Resetting invalid value of min length to zero means "ignore min length parameter in password generation".
      minPasswordLength = 0;
    }

    const requiredCharacterArray = requirements.PasswordRequiredCharacters;
    let allowedCharacters = requirements.PasswordAllowedCharacters;
    let requiredCharacterSets = this.options.defaultRequiredCharacterSets;

    if (requiredCharacterArray) {
      const mutatedRequiredCharacterSets = [];
      const requiredCharacterArrayLength = requiredCharacterArray.length;

      for (let i = 0; i < requiredCharacterArrayLength; i++) {
        const requiredCharacters = requiredCharacterArray[i];

        if (allowedCharacters && this._stringsHaveAtLeastOneCommonCharacter(requiredCharacters, allowedCharacters)) {
          mutatedRequiredCharacterSets.push(requiredCharacters);
        }
      }

      requiredCharacterSets = mutatedRequiredCharacterSets;
    } // If requirements allow, we will generateOrThrow the password in default format: "xxx-xxx-xxx-xxx".


    let numberOfRequiredRandomCharacters = this.options.defaultPasswordLength;

    if (minPasswordLength && minPasswordLength > numberOfRequiredRandomCharacters) {
      numberOfRequiredRandomCharacters = minPasswordLength;
    }

    if (maxPasswordLength && maxPasswordLength < numberOfRequiredRandomCharacters) {
      numberOfRequiredRandomCharacters = maxPasswordLength;
    }

    if (!allowedCharacters) {
      allowedCharacters = this.options.defaultUnambiguousCharacters;
    } // In default password format, we use dashes only as separators, not as symbols you can encounter at a random position.


    if (!requiredCharacterSets) {
      requiredCharacterSets = this.options.defaultRequiredCharacterSets;
    } // If we have more requirements of the type "need a character from set" than the length of the password we want to generateOrThrow, then
    // we will never be able to meet these requirements, and we'll end up in an infinite loop generating passwords. To avoid this,
    // reset required character sets if the requirements are impossible to meet.


    if (requiredCharacterSets.length > numberOfRequiredRandomCharacters) {
      requiredCharacterSets = [];
    } // Do not require any character sets that do not contain allowed characters.


    const requiredCharacterSetsLength = requiredCharacterSets.length;
    const mutatedRequiredCharacterSets = [];
    const allowedCharactersLength = allowedCharacters.length;

    for (let i = 0; i < requiredCharacterSetsLength; i++) {
      const requiredCharacterSet = requiredCharacterSets[i];
      let requiredCharacterSetContainsAllowedCharacters = false;

      for (let j = 0; j < allowedCharactersLength; j++) {
        const character = allowedCharacters.charAt(j);

        if (requiredCharacterSet.indexOf(character) !== -1) {
          requiredCharacterSetContainsAllowedCharacters = true;
          break;
        }
      }

      if (requiredCharacterSetContainsAllowedCharacters) {
        mutatedRequiredCharacterSets.push(requiredCharacterSet);
      }
    }

    requiredCharacterSets = mutatedRequiredCharacterSets;
    return {
      NumberOfRequiredRandomCharacters: numberOfRequiredRandomCharacters,
      PasswordAllowedCharacters: allowedCharacters,
      RequiredCharacterSets: requiredCharacterSets
    };
  }
  /**
   * @param {Requirements | null} requirements
   * @param {PasswordParameters} [parameters]
   * @returns {string}
   */


  _generatedPasswordMatchingRequirements(requirements, parameters) {
    requirements = requirements || {};
    parameters = parameters || this._passwordGenerationParametersDictionary(requirements);
    const numberOfRequiredRandomCharacters = parameters.NumberOfRequiredRandomCharacters;
    const repeatedCharLimit = requirements.PasswordRepeatedCharacterLimit;
    const allowedCharacters = parameters.PasswordAllowedCharacters;
    const shouldCheckRepeatedCharRequirement = !!repeatedCharLimit;

    while (true) {
      const password = this._classicPassword(numberOfRequiredRandomCharacters, allowedCharacters);

      if (!this._passwordContainsRequiredCharacters(password, parameters.RequiredCharacterSets)) {
        continue;
      }

      if (shouldCheckRepeatedCharRequirement) {
        if (repeatedCharLimit !== undefined && repeatedCharLimit >= 1 && !this._passwordHasNotExceededRepeatedCharLimit(password, repeatedCharLimit)) {
          continue;
        }
      }

      const consecutiveCharLimit = requirements.PasswordConsecutiveCharacterLimit;

      if (consecutiveCharLimit && consecutiveCharLimit >= 1) {
        if (!this._passwordHasNotExceededConsecutiveCharLimit(password, consecutiveCharLimit)) {
          continue;
        }
      }

      return password || '';
    }
  }
  /**
   * @param {parser.CustomCharacterClass | parser.NamedCharacterClass} characterClass
   * @returns {string[]}
   */


  _scanSetFromCharacterClass(characterClass) {
    if (characterClass instanceof parser.CustomCharacterClass) {
      return characterClass.characters;
    }

    console.assert(characterClass instanceof parser.NamedCharacterClass);

    switch (characterClass.name) {
      case parser.Identifier.ASCII_PRINTABLE:
      case parser.Identifier.UNICODE:
        return this.options.SCAN_SET_ORDER.split('');

      case parser.Identifier.DIGIT:
        return this.options.SCAN_SET_ORDER.substring(this.options.SCAN_SET_ORDER.indexOf('0'), this.options.SCAN_SET_ORDER.indexOf('9') + 1).split('');

      case parser.Identifier.LOWER:
        return this.options.SCAN_SET_ORDER.substring(this.options.SCAN_SET_ORDER.indexOf('a'), this.options.SCAN_SET_ORDER.indexOf('z') + 1).split('');

      case parser.Identifier.SPECIAL:
        return this.options.SCAN_SET_ORDER.substring(this.options.SCAN_SET_ORDER.indexOf('-'), this.options.SCAN_SET_ORDER.indexOf(']') + 1).split('');

      case parser.Identifier.UPPER:
        return this.options.SCAN_SET_ORDER.substring(this.options.SCAN_SET_ORDER.indexOf('A'), this.options.SCAN_SET_ORDER.indexOf('Z') + 1).split('');
    }

    console.assert(false, parser.SHOULD_NOT_BE_REACHED);
    return [];
  }
  /**
   * @param {(parser.CustomCharacterClass | parser.NamedCharacterClass)[]} characterClasses
   */


  _charactersFromCharactersClasses(characterClasses) {
    const output = [];

    for (let characterClass of characterClasses) {
      output.push(...this._scanSetFromCharacterClass(characterClass));
    }

    return output;
  }
  /**
   * @param {string[]} characters
   * @returns {string}
   */


  _canonicalizedScanSetFromCharacters(characters) {
    if (!characters.length) {
      return '';
    }

    let shadowCharacters = Array.prototype.slice.call(characters);
    shadowCharacters.sort((a, b) => this.options.SCAN_SET_ORDER.indexOf(a) - this.options.SCAN_SET_ORDER.indexOf(b));
    let uniqueCharacters = [shadowCharacters[0]];

    for (let i = 1, length = shadowCharacters.length; i < length; ++i) {
      if (shadowCharacters[i] === shadowCharacters[i - 1]) {
        continue;
      }

      uniqueCharacters.push(shadowCharacters[i]);
    }

    return uniqueCharacters.join('');
  }

}

exports.Password = Password;

_defineProperty(Password, "defaults", defaults);

},{"./constants.js":11,"./rules-parser.js":12}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.constants = void 0;
const DEFAULT_MIN_LENGTH = 20;
const DEFAULT_MAX_LENGTH = 30;
const DEFAULT_REQUIRED_CHARS = '-!?$&#%';
const DEFAULT_UNAMBIGUOUS_CHARS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ0123456789';
const DEFAULT_PASSWORD_RULES = ["minlength: ".concat(DEFAULT_MIN_LENGTH), "maxlength: ".concat(DEFAULT_MAX_LENGTH), "required: [".concat(DEFAULT_REQUIRED_CHARS, "]"), "allowed: [".concat(DEFAULT_UNAMBIGUOUS_CHARS, "]")].join('; ');
const constants = {
  DEFAULT_MIN_LENGTH,
  DEFAULT_MAX_LENGTH,
  DEFAULT_PASSWORD_RULES,
  DEFAULT_REQUIRED_CHARS,
  DEFAULT_UNAMBIGUOUS_CHARS
};
exports.constants = constants;

},{}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SHOULD_NOT_BE_REACHED = exports.RuleName = exports.Rule = exports.ParserError = exports.NamedCharacterClass = exports.Identifier = exports.CustomCharacterClass = void 0;
exports.parsePasswordRules = parsePasswordRules;
// Copyright (c) 2019 - 2020 Apple Inc. Licensed under MIT License.

/*
 *
 * NOTE:
 *
 * This file was taken as intended from https://github.com/apple/password-manager-resources.
 *
 * The only additions from DuckDuckGo employees are
 *
 * 1) exporting some identifiers
 * 2) adding some JSDoc comments
 * 3) making this parser throw when it cannot produce any rules
 *    ^ the default implementation still returns a base-line ruleset, which we didn't want.
 *
 */
const Identifier = {
  ASCII_PRINTABLE: 'ascii-printable',
  DIGIT: 'digit',
  LOWER: 'lower',
  SPECIAL: 'special',
  UNICODE: 'unicode',
  UPPER: 'upper'
};
exports.Identifier = Identifier;
const RuleName = {
  ALLOWED: 'allowed',
  MAX_CONSECUTIVE: 'max-consecutive',
  REQUIRED: 'required',
  MIN_LENGTH: 'minlength',
  MAX_LENGTH: 'maxlength'
};
exports.RuleName = RuleName;
const CHARACTER_CLASS_START_SENTINEL = '[';
const CHARACTER_CLASS_END_SENTINEL = ']';
const PROPERTY_VALUE_SEPARATOR = ',';
const PROPERTY_SEPARATOR = ';';
const PROPERTY_VALUE_START_SENTINEL = ':';
const SPACE_CODE_POINT = ' '.codePointAt(0);
const SHOULD_NOT_BE_REACHED = 'Should not be reached';
exports.SHOULD_NOT_BE_REACHED = SHOULD_NOT_BE_REACHED;

class Rule {
  constructor(name, value) {
    this._name = name;
    this.value = value;
  }

  get name() {
    return this._name;
  }

  toString() {
    return JSON.stringify(this);
  }

}

exports.Rule = Rule;
;

class NamedCharacterClass {
  constructor(name) {
    console.assert(_isValidRequiredOrAllowedPropertyValueIdentifier(name));
    this._name = name;
  }

  get name() {
    return this._name.toLowerCase();
  }

  toString() {
    return this._name;
  }

  toHTMLString() {
    return this._name;
  }

}

exports.NamedCharacterClass = NamedCharacterClass;
;

class ParserError extends Error {}

exports.ParserError = ParserError;
;

class CustomCharacterClass {
  constructor(characters) {
    console.assert(characters instanceof Array);
    this._characters = characters;
  }

  get characters() {
    return this._characters;
  }

  toString() {
    return "[".concat(this._characters.join(''), "]");
  }

  toHTMLString() {
    return "[".concat(this._characters.join('').replace('"', '&quot;'), "]");
  }

}

exports.CustomCharacterClass = CustomCharacterClass;
; // MARK: Lexer functions

function _isIdentifierCharacter(c) {
  console.assert(c.length === 1); // eslint-disable-next-line no-mixed-operators

  return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c === '-';
}

function _isASCIIDigit(c) {
  console.assert(c.length === 1);
  return c >= '0' && c <= '9';
}

function _isASCIIPrintableCharacter(c) {
  console.assert(c.length === 1);
  return c >= ' ' && c <= '~';
}

function _isASCIIWhitespace(c) {
  console.assert(c.length === 1);
  return c === ' ' || c === '\f' || c === '\n' || c === '\r' || c === '\t';
} // MARK: ASCII printable character bit set and canonicalization functions


function _bitSetIndexForCharacter(c) {
  console.assert(c.length === 1); // @ts-ignore

  return c.codePointAt(0) - SPACE_CODE_POINT;
}

function _characterAtBitSetIndex(index) {
  return String.fromCodePoint(index + SPACE_CODE_POINT);
}

function _markBitsForNamedCharacterClass(bitSet, namedCharacterClass) {
  console.assert(bitSet instanceof Array);
  console.assert(namedCharacterClass.name !== Identifier.UNICODE);
  console.assert(namedCharacterClass.name !== Identifier.ASCII_PRINTABLE);

  if (namedCharacterClass.name === Identifier.UPPER) {
    bitSet.fill(true, _bitSetIndexForCharacter('A'), _bitSetIndexForCharacter('Z') + 1);
  } else if (namedCharacterClass.name === Identifier.LOWER) {
    bitSet.fill(true, _bitSetIndexForCharacter('a'), _bitSetIndexForCharacter('z') + 1);
  } else if (namedCharacterClass.name === Identifier.DIGIT) {
    bitSet.fill(true, _bitSetIndexForCharacter('0'), _bitSetIndexForCharacter('9') + 1);
  } else if (namedCharacterClass.name === Identifier.SPECIAL) {
    bitSet.fill(true, _bitSetIndexForCharacter(' '), _bitSetIndexForCharacter('/') + 1);
    bitSet.fill(true, _bitSetIndexForCharacter(':'), _bitSetIndexForCharacter('@') + 1);
    bitSet.fill(true, _bitSetIndexForCharacter('['), _bitSetIndexForCharacter('`') + 1);
    bitSet.fill(true, _bitSetIndexForCharacter('{'), _bitSetIndexForCharacter('~') + 1);
  } else {
    console.assert(false, SHOULD_NOT_BE_REACHED, namedCharacterClass);
  }
}

function _markBitsForCustomCharacterClass(bitSet, customCharacterClass) {
  for (let character of customCharacterClass.characters) {
    bitSet[_bitSetIndexForCharacter(character)] = true;
  }
}

function _canonicalizedPropertyValues(propertyValues, keepCustomCharacterClassFormatCompliant) {
  // @ts-ignore
  let asciiPrintableBitSet = new Array('~'.codePointAt(0) - ' '.codePointAt(0) + 1);

  for (let propertyValue of propertyValues) {
    if (propertyValue instanceof NamedCharacterClass) {
      if (propertyValue.name === Identifier.UNICODE) {
        return [new NamedCharacterClass(Identifier.UNICODE)];
      }

      if (propertyValue.name === Identifier.ASCII_PRINTABLE) {
        return [new NamedCharacterClass(Identifier.ASCII_PRINTABLE)];
      }

      _markBitsForNamedCharacterClass(asciiPrintableBitSet, propertyValue);
    } else if (propertyValue instanceof CustomCharacterClass) {
      _markBitsForCustomCharacterClass(asciiPrintableBitSet, propertyValue);
    }
  }

  let charactersSeen = [];

  function checkRange(start, end) {
    let temp = [];

    for (let i = _bitSetIndexForCharacter(start); i <= _bitSetIndexForCharacter(end); ++i) {
      if (asciiPrintableBitSet[i]) {
        temp.push(_characterAtBitSetIndex(i));
      }
    }

    let result = temp.length === _bitSetIndexForCharacter(end) - _bitSetIndexForCharacter(start) + 1;

    if (!result) {
      charactersSeen = charactersSeen.concat(temp);
    }

    return result;
  }

  let hasAllUpper = checkRange('A', 'Z');
  let hasAllLower = checkRange('a', 'z');
  let hasAllDigits = checkRange('0', '9'); // Check for special characters, accounting for characters that are given special treatment (i.e. '-' and ']')

  let hasAllSpecial = false;
  let hasDash = false;
  let hasRightSquareBracket = false;
  let temp = [];

  for (let i = _bitSetIndexForCharacter(' '); i <= _bitSetIndexForCharacter('/'); ++i) {
    if (!asciiPrintableBitSet[i]) {
      continue;
    }

    let character = _characterAtBitSetIndex(i);

    if (keepCustomCharacterClassFormatCompliant && character === '-') {
      hasDash = true;
    } else {
      temp.push(character);
    }
  }

  for (let i = _bitSetIndexForCharacter(':'); i <= _bitSetIndexForCharacter('@'); ++i) {
    if (asciiPrintableBitSet[i]) {
      temp.push(_characterAtBitSetIndex(i));
    }
  }

  for (let i = _bitSetIndexForCharacter('['); i <= _bitSetIndexForCharacter('`'); ++i) {
    if (!asciiPrintableBitSet[i]) {
      continue;
    }

    let character = _characterAtBitSetIndex(i);

    if (keepCustomCharacterClassFormatCompliant && character === ']') {
      hasRightSquareBracket = true;
    } else {
      temp.push(character);
    }
  }

  for (let i = _bitSetIndexForCharacter('{'); i <= _bitSetIndexForCharacter('~'); ++i) {
    if (asciiPrintableBitSet[i]) {
      temp.push(_characterAtBitSetIndex(i));
    }
  }

  if (hasDash) {
    temp.unshift('-');
  }

  if (hasRightSquareBracket) {
    temp.push(']');
  }

  let numberOfSpecialCharacters = _bitSetIndexForCharacter('/') - _bitSetIndexForCharacter(' ') + 1 + (_bitSetIndexForCharacter('@') - _bitSetIndexForCharacter(':') + 1) + (_bitSetIndexForCharacter('`') - _bitSetIndexForCharacter('[') + 1) + (_bitSetIndexForCharacter('~') - _bitSetIndexForCharacter('{') + 1);
  hasAllSpecial = temp.length === numberOfSpecialCharacters;

  if (!hasAllSpecial) {
    charactersSeen = charactersSeen.concat(temp);
  }

  let result = [];

  if (hasAllUpper && hasAllLower && hasAllDigits && hasAllSpecial) {
    return [new NamedCharacterClass(Identifier.ASCII_PRINTABLE)];
  }

  if (hasAllUpper) {
    result.push(new NamedCharacterClass(Identifier.UPPER));
  }

  if (hasAllLower) {
    result.push(new NamedCharacterClass(Identifier.LOWER));
  }

  if (hasAllDigits) {
    result.push(new NamedCharacterClass(Identifier.DIGIT));
  }

  if (hasAllSpecial) {
    result.push(new NamedCharacterClass(Identifier.SPECIAL));
  }

  if (charactersSeen.length) {
    result.push(new CustomCharacterClass(charactersSeen));
  }

  return result;
} // MARK: Parser functions


function _indexOfNonWhitespaceCharacter(input) {
  let position = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  console.assert(position >= 0);
  console.assert(position <= input.length);
  let length = input.length;

  while (position < length && _isASCIIWhitespace(input[position])) {
    ++position;
  }

  return position;
}

function _parseIdentifier(input, position) {
  console.assert(position >= 0);
  console.assert(position < input.length);
  console.assert(_isIdentifierCharacter(input[position]));
  let length = input.length;
  let seenIdentifiers = [];

  do {
    let c = input[position];

    if (!_isIdentifierCharacter(c)) {
      break;
    }

    seenIdentifiers.push(c);
    ++position;
  } while (position < length);

  return [seenIdentifiers.join(''), position];
}

function _isValidRequiredOrAllowedPropertyValueIdentifier(identifier) {
  return identifier && Object.values(Identifier).includes(identifier.toLowerCase());
}

function _parseCustomCharacterClass(input, position) {
  console.assert(position >= 0);
  console.assert(position < input.length);
  console.assert(input[position] === CHARACTER_CLASS_START_SENTINEL);
  let length = input.length;
  ++position;

  if (position >= length) {
    // console.error('Found end-of-line instead of character class character')
    return [null, position];
  }

  let initialPosition = position;
  let result = [];

  do {
    let c = input[position];

    if (!_isASCIIPrintableCharacter(c)) {
      ++position;
      continue;
    }

    if (c === '-' && position - initialPosition > 0) {
      // FIXME: Should this be an error?
      console.warn("Ignoring '-'; a '-' may only appear as the first character in a character class");
      ++position;
      continue;
    }

    result.push(c);
    ++position;

    if (c === CHARACTER_CLASS_END_SENTINEL) {
      break;
    }
  } while (position < length);

  if (position < length && input[position] !== CHARACTER_CLASS_END_SENTINEL) {
    // Fix up result; we over consumed.
    result.pop();
    return [result, position];
  } else if (position === length && input[position - 1] === CHARACTER_CLASS_END_SENTINEL) {
    // Fix up result; we over consumed.
    result.pop();
    return [result, position];
  }

  if (position < length && input[position] === CHARACTER_CLASS_END_SENTINEL) {
    return [result, position + 1];
  } // console.error('Found end-of-line instead of end of character class')


  return [null, position];
}

function _parsePasswordRequiredOrAllowedPropertyValue(input, position) {
  console.assert(position >= 0);
  console.assert(position < input.length);
  let length = input.length;
  let propertyValues = [];

  while (true) {
    if (_isIdentifierCharacter(input[position])) {
      let identifierStartPosition = position; // eslint-disable-next-line no-redeclare

      var [propertyValue, position] = _parseIdentifier(input, position);

      if (!_isValidRequiredOrAllowedPropertyValueIdentifier(propertyValue)) {
        // console.error('Unrecognized property value identifier: ' + propertyValue)
        return [null, identifierStartPosition];
      }

      propertyValues.push(new NamedCharacterClass(propertyValue));
    } else if (input[position] === CHARACTER_CLASS_START_SENTINEL) {
      // eslint-disable-next-line no-redeclare
      var [propertyValue, position] = _parseCustomCharacterClass(input, position);

      if (propertyValue && propertyValue.length) {
        propertyValues.push(new CustomCharacterClass(propertyValue));
      }
    } else {
      // console.error('Failed to find start of property value: ' + input.substr(position))
      return [null, position];
    }

    position = _indexOfNonWhitespaceCharacter(input, position);

    if (position >= length || input[position] === PROPERTY_SEPARATOR) {
      break;
    }

    if (input[position] === PROPERTY_VALUE_SEPARATOR) {
      position = _indexOfNonWhitespaceCharacter(input, position + 1);

      if (position >= length) {
        // console.error('Found end-of-line instead of start of next property value')
        return [null, position];
      }

      continue;
    } // console.error('Failed to find start of next property or property value: ' + input.substr(position))


    return [null, position];
  }

  return [propertyValues, position];
}
/**
 * @param input
 * @param position
 * @returns {[Rule|null, number, string|undefined]}
 * @private
 */


function _parsePasswordRule(input, position) {
  console.assert(position >= 0);
  console.assert(position < input.length);
  console.assert(_isIdentifierCharacter(input[position]));
  let length = input.length;
  var mayBeIdentifierStartPosition = position; // eslint-disable-next-line no-redeclare

  var [identifier, position] = _parseIdentifier(input, position);

  if (!Object.values(RuleName).includes(identifier)) {
    // console.error('Unrecognized property name: ' + identifier)
    return [null, mayBeIdentifierStartPosition, undefined];
  }

  if (position >= length) {
    // console.error('Found end-of-line instead of start of property value')
    return [null, position, undefined];
  }

  if (input[position] !== PROPERTY_VALUE_START_SENTINEL) {
    // console.error('Failed to find start of property value: ' + input.substr(position))
    return [null, position, undefined];
  }

  let property = {
    name: identifier,
    value: null
  };
  position = _indexOfNonWhitespaceCharacter(input, position + 1); // Empty value

  if (position >= length || input[position] === PROPERTY_SEPARATOR) {
    return [new Rule(property.name, property.value), position, undefined];
  }

  switch (identifier) {
    case RuleName.ALLOWED:
    case RuleName.REQUIRED:
      {
        // eslint-disable-next-line no-redeclare
        var [propertyValue, position] = _parsePasswordRequiredOrAllowedPropertyValue(input, position);

        if (propertyValue) {
          property.value = propertyValue;
        }

        return [new Rule(property.name, property.value), position, undefined];
      }

    case RuleName.MAX_CONSECUTIVE:
      {
        // eslint-disable-next-line no-redeclare
        var [propertyValue, position] = _parseMaxConsecutivePropertyValue(input, position);

        if (propertyValue) {
          property.value = propertyValue;
        }

        return [new Rule(property.name, property.value), position, undefined];
      }

    case RuleName.MIN_LENGTH:
    case RuleName.MAX_LENGTH:
      {
        // eslint-disable-next-line no-redeclare
        var [propertyValue, position] = _parseMinLengthMaxLengthPropertyValue(input, position);

        if (propertyValue) {
          property.value = propertyValue;
        }

        return [new Rule(property.name, property.value), position, undefined];
      }
  }

  console.assert(false, SHOULD_NOT_BE_REACHED);
  return [null, -1, undefined];
}

function _parseMinLengthMaxLengthPropertyValue(input, position) {
  return _parseInteger(input, position);
}

function _parseMaxConsecutivePropertyValue(input, position) {
  return _parseInteger(input, position);
}

function _parseInteger(input, position) {
  console.assert(position >= 0);
  console.assert(position < input.length);

  if (!_isASCIIDigit(input[position])) {
    // console.error('Failed to parse value of type integer; not a number: ' + input.substr(position))
    return [null, position];
  }

  let length = input.length; // let initialPosition = position

  let result = 0;

  do {
    result = 10 * result + parseInt(input[position], 10);
    ++position;
  } while (position < length && input[position] !== PROPERTY_SEPARATOR && _isASCIIDigit(input[position]));

  if (position >= length || input[position] === PROPERTY_SEPARATOR) {
    return [result, position];
  } // console.error('Failed to parse value of type integer; not a number: ' + input.substr(initialPosition))


  return [null, position];
}
/**
 * @param input
 * @returns {[Rule[]|null, string|undefined]}
 * @private
 */


function _parsePasswordRulesInternal(input) {
  let parsedProperties = [];
  let length = input.length;

  var position = _indexOfNonWhitespaceCharacter(input);

  while (position < length) {
    if (!_isIdentifierCharacter(input[position])) {
      // console.warn('Failed to find start of property: ' + input.substr(position))
      return [parsedProperties, undefined];
    } // eslint-disable-next-line no-redeclare


    var [parsedProperty, position, message] = _parsePasswordRule(input, position);

    if (parsedProperty && parsedProperty.value) {
      parsedProperties.push(parsedProperty);
    }

    position = _indexOfNonWhitespaceCharacter(input, position);

    if (position >= length) {
      break;
    }

    if (input[position] === PROPERTY_SEPARATOR) {
      position = _indexOfNonWhitespaceCharacter(input, position + 1);

      if (position >= length) {
        return [parsedProperties, undefined];
      }

      continue;
    } // console.error('Failed to find start of next property: ' + input.substr(position))


    return [null, message || 'Failed to find start of next property: ' + input.substr(position)];
  }

  return [parsedProperties, undefined];
}
/**
 * @param {string} input
 * @param {boolean} [formatRulesForMinifiedVersion]
 * @returns {Rule[]}
 */


function parsePasswordRules(input, formatRulesForMinifiedVersion) {
  let [passwordRules, maybeMessage] = _parsePasswordRulesInternal(input);

  if (!passwordRules) {
    throw new ParserError(maybeMessage);
  }

  if (passwordRules.length === 0) {
    throw new ParserError('No valid rules were provided');
  } // When formatting rules for minified version, we should keep the formatted rules
  // as similar to the input as possible. Avoid copying required rules to allowed rules.


  let suppressCopyingRequiredToAllowed = formatRulesForMinifiedVersion;
  let requiredRules = [];
  let newAllowedValues = [];
  let minimumMaximumConsecutiveCharacters = null;
  let maximumMinLength = 0;
  let minimumMaxLength = null;

  for (let rule of passwordRules) {
    switch (rule.name) {
      case RuleName.MAX_CONSECUTIVE:
        minimumMaximumConsecutiveCharacters = minimumMaximumConsecutiveCharacters ? Math.min(rule.value, minimumMaximumConsecutiveCharacters) : rule.value;
        break;

      case RuleName.MIN_LENGTH:
        maximumMinLength = Math.max(rule.value, maximumMinLength);
        break;

      case RuleName.MAX_LENGTH:
        minimumMaxLength = minimumMaxLength ? Math.min(rule.value, minimumMaxLength) : rule.value;
        break;

      case RuleName.REQUIRED:
        rule.value = _canonicalizedPropertyValues(rule.value, formatRulesForMinifiedVersion);
        requiredRules.push(rule);

        if (!suppressCopyingRequiredToAllowed) {
          newAllowedValues = newAllowedValues.concat(rule.value);
        }

        break;

      case RuleName.ALLOWED:
        newAllowedValues = newAllowedValues.concat(rule.value);
        break;
    }
  }

  let newPasswordRules = [];

  if (maximumMinLength > 0) {
    newPasswordRules.push(new Rule(RuleName.MIN_LENGTH, maximumMinLength));
  }

  if (minimumMaxLength !== null) {
    newPasswordRules.push(new Rule(RuleName.MAX_LENGTH, minimumMaxLength));
  }

  if (minimumMaximumConsecutiveCharacters !== null) {
    newPasswordRules.push(new Rule(RuleName.MAX_CONSECUTIVE, minimumMaximumConsecutiveCharacters));
  }

  let sortedRequiredRules = requiredRules.sort(function (a, b) {
    const namedCharacterClassOrder = [Identifier.LOWER, Identifier.UPPER, Identifier.DIGIT, Identifier.SPECIAL, Identifier.ASCII_PRINTABLE, Identifier.UNICODE];
    let aIsJustOneNamedCharacterClass = a.value.length === 1 && a.value[0] instanceof NamedCharacterClass;
    let bIsJustOneNamedCharacterClass = b.value.length === 1 && b.value[0] instanceof NamedCharacterClass;

    if (aIsJustOneNamedCharacterClass && !bIsJustOneNamedCharacterClass) {
      return -1;
    }

    if (!aIsJustOneNamedCharacterClass && bIsJustOneNamedCharacterClass) {
      return 1;
    }

    if (aIsJustOneNamedCharacterClass && bIsJustOneNamedCharacterClass) {
      let aIndex = namedCharacterClassOrder.indexOf(a.value[0].name);
      let bIndex = namedCharacterClassOrder.indexOf(b.value[0].name);
      return aIndex - bIndex;
    }

    return 0;
  });
  newPasswordRules = newPasswordRules.concat(sortedRequiredRules);
  newAllowedValues = _canonicalizedPropertyValues(newAllowedValues, suppressCopyingRequiredToAllowed);

  if (!suppressCopyingRequiredToAllowed && !newAllowedValues.length) {
    newAllowedValues = [new NamedCharacterClass(Identifier.ASCII_PRINTABLE)];
  }

  if (newAllowedValues.length) {
    newPasswordRules.push(new Rule(RuleName.ALLOWED, newAllowedValues));
  }

  return newPasswordRules;
}

},{}],13:[function(require,module,exports){
module.exports={
  "163.com": {
    "password-rules": "minlength: 6; maxlength: 16;"
  },
  "1800flowers.com": {
    "password-rules": "minlength: 6; required: lower, upper; required: digit;"
  },
  "access.service.gov.uk": {
    "password-rules": "minlength: 10; required: lower; required: upper; required: digit; required: special;"
  },
  "admiral.com": {
    "password-rules": "minlength: 8; required: digit; required: [- !\"#$&'()*+,.:;<=>?@[^_`{|}~]]; allowed: lower, upper;"
  },
  "ae.com": {
    "password-rules": "minlength: 8; maxlength: 25; required: lower; required: upper; required: digit;"
  },
  "aetna.com": {
    "password-rules": "minlength: 8; maxlength: 20; max-consecutive: 2; required: upper; required: digit; allowed: lower, [-_&#@];"
  },
  "airasia.com": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit;"
  },
  "airfrance.com": {
    "password-rules": "minlength: 8; maxlength: 12; required: lower; required: upper; required: digit; allowed: [-!#$&+/?@_];"
  },
  "airfrance.us": {
    "password-rules": "minlength: 8; maxlength: 12; required: lower; required: upper; required: digit; allowed: [-!#$&+/?@_];"
  },
  "ajisushionline.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; allowed: [ !#$%&*?@];"
  },
  "aliexpress.com": {
    "password-rules": "minlength: 6; maxlength: 20; allowed: lower, upper, digit;"
  },
  "alliantcreditunion.com": {
    "password-rules": "minlength: 8; maxlength: 20; max-consecutive: 3; required: lower, upper; required: digit; allowed: [!#$*];"
  },
  "allianz.com.br": {
    "password-rules": "minlength: 4; maxlength: 4;"
  },
  "americanexpress.com": {
    "password-rules": "minlength: 8; maxlength: 20; max-consecutive: 4; required: lower, upper; required: digit; allowed: [%&_?#=];"
  },
  "anatel.gov.br": {
    "password-rules": "minlength: 6; maxlength: 15; allowed: lower, upper, digit;"
  },
  "ancestry.com": {
    "password-rules": "minlength: 8; required: lower, upper; required: digit;"
  },
  "angieslist.com": {
    "password-rules": "minlength: 6; maxlength: 15;"
  },
  "anthem.com": {
    "password-rules": "minlength: 8; maxlength: 20; max-consecutive: 3; required: lower, upper; required: digit; allowed: [!$*?@|];"
  },
  "app.digio.in": {
    "password-rules": "minlength: 8; maxlength: 15;"
  },
  "app.parkmobile.io": {
    "password-rules": "minlength: 8; maxlength: 25; required: lower; required: upper; required: digit; required: [!@#$%^&];"
  },
  "apple.com": {
    "password-rules": "minlength: 8; maxlength: 63; required: lower; required: upper; required: digit; allowed: ascii-printable;"
  },
  "areariservata.bancaetica.it": {
    "password-rules": "minlength: 8; maxlength: 10; required: lower; required: upper; required: digit; required: [!#&*+/=@_];"
  },
  "artscyclery.com": {
    "password-rules": "minlength: 6; maxlength: 19;"
  },
  "astonmartinf1.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; allowed: special;"
  },
  "auth.readymag.com": {
    "password-rules": "minlength: 8; maxlength: 128; required: lower; required: upper; allowed: special;"
  },
  "autify.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!\"#$%&'()*+,./:;<=>?@[^_`{|}~]];"
  },
  "axa.de": {
    "password-rules": "minlength: 8; maxlength: 65; required: lower; required: upper; required: digit; allowed: [-!\"§$%&/()=?;:_+*'#];"
  },
  "baidu.com": {
    "password-rules": "minlength: 6; maxlength: 14;"
  },
  "bancochile.cl": {
    "password-rules": "minlength: 8; maxlength: 8; required: lower; required: upper; required: digit;"
  },
  "bankofamerica.com": {
    "password-rules": "minlength: 8; maxlength: 20; max-consecutive: 3; required: lower; required: upper; required: digit; allowed: [-@#*()+={}/?~;,._];"
  },
  "battle.net": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower, upper; allowed: digit, special;"
  },
  "bcassessment.ca": {
    "password-rules": "minlength: 8; maxlength: 14;"
  },
  "belkin.com": {
    "password-rules": "minlength: 8; required: lower, upper; required: digit; required: [$!@~_,%&];"
  },
  "benefitslogin.discoverybenefits.com": {
    "password-rules": "minlength: 10; required: upper; required: digit; required: [!#$%&*?@]; allowed: lower;"
  },
  "benjerry.com": {
    "password-rules": "required: upper; required: upper; required: digit; required: digit; required: special; required: special; allowed: lower;"
  },
  "bestbuy.com": {
    "password-rules": "minlength: 20; required: lower; required: upper; required: digit; required: special;"
  },
  "bhphotovideo.com": {
    "password-rules": "maxlength: 15;"
  },
  "bilibili.com": {
    "password-rules": "maxlength: 16;"
  },
  "billerweb.com": {
    "password-rules": "minlength: 8; max-consecutive: 2; required: digit; required: upper,lower;"
  },
  "biovea.com": {
    "password-rules": "maxlength: 19;"
  },
  "bitly.com": {
    "password-rules": "minlength: 6; required: lower; required: upper; required: digit; required: [`!@#$%^&*()+~{}'\";:<>?]];"
  },
  "bloomingdales.com": {
    "password-rules": "minlength: 7; maxlength: 16; required: lower, upper; required: digit; required: [`!@#$%^&*()+~{}'\";:<>?]];"
  },
  "bluesguitarunleashed.com": {
    "password-rules": "allowed: lower, upper, digit, [!$#@];"
  },
  "bochk.com": {
    "password-rules": "minlength: 8; maxlength: 12; max-consecutive: 3; required: lower; required: upper; required: digit; allowed: [#$%&()*+,.:;<=>?@_];"
  },
  "box.com": {
    "password-rules": "minlength: 6; maxlength: 20; required: lower; required: upper; required: digit; required: digit;"
  },
  "brighthorizons.com": {
    "password-rules": "minlength: 8; maxlength: 16;"
  },
  "callofduty.com": {
    "password-rules": "minlength: 8; maxlength: 20; max-consecutive: 2; required: lower, upper; required: digit;"
  },
  "capitalone.com": {
    "password-rules": "minlength: 8; maxlength: 32; required: lower, upper; required: digit; allowed: [-_./\\@$*&!#];"
  },
  "cardbenefitservices.com": {
    "password-rules": "minlength: 7; maxlength: 100; required: lower, upper; required: digit;"
  },
  "carrefour.it": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!#$%&*?@_];"
  },
  "cb2.com": {
    "password-rules": "minlength: 7; maxlength: 18; required: lower, upper; required: digit;"
  },
  "ccs-grp.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: digit; required: upper,lower; allowed: [-!#$%&'+./=?\\^_`{|}~];"
  },
  "cecredentialtrust.com": {
    "password-rules": "minlength: 12; required: lower; required: upper; required: digit; required: [!#$%&*@^];"
  },
  "chase.com": {
    "password-rules": "minlength: 8; maxlength: 32; max-consecutive: 2; required: lower, upper; required: digit; required: [!#$%+/=@~];"
  },
  "cigna.co.uk": {
    "password-rules": "minlength: 8; maxlength: 12; required: lower; required: upper; required: digit;"
  },
  "citi.com": {
    "password-rules": "minlength: 8; maxlength: 64; max-consecutive: 2; required: digit; required: upper; required: lower; required: [-~`!@#$%^&*()_\\/|];"
  },
  "claimlookup.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; required: [@#$%^&+=!];"
  },
  "claro.com.br": {
    "password-rules": "minlength: 8; required: lower; allowed: upper, digit, [-!@#$%&*_+=<>];"
  },
  "classmates.com": {
    "password-rules": "minlength: 6; maxlength: 20; allowed: lower, upper, digit, [!@#$%^&*];"
  },
  "clien.net": {
    "password-rules": "minlength: 5; required: lower, upper; required: digit;"
  },
  "collectivehealth.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit;"
  },
  "comcastpaymentcenter.com": {
    "password-rules": "minlength: 8; maxlength: 20; max-consecutive: 2;required: lower, upper; required: digit;"
  },
  "comed.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; allowed: [-~!@#$%^&*_+=`|(){}[:;\"'<>,.?/\\]];"
  },
  "commerzbank.de": {
    "password-rules": "minlength: 5; maxlength: 8; required: lower, upper; required: digit;"
  },
  "consorsbank.de": {
    "password-rules": "minlength: 5; maxlength: 5; required: lower, upper, digit;"
  },
  "consorsfinanz.de": {
    "password-rules": "minlength: 6; maxlength: 15; allowed: lower, upper, digit, [-.];"
  },
  "costco.com": {
    "password-rules": "minlength: 8; maxlength: 20; required: lower, upper; allowed: digit, [-!#$%&'()*+/:;=?@[^_`{|}~]];"
  },
  "coursera.com": {
    "password-rules": "minlength: 8; maxlength: 72;"
  },
  "cox.com": {
    "password-rules": "minlength: 8; maxlength: 24; required: digit; required: upper,lower; allowed: [!#$%()*@^];"
  },
  "crateandbarrel.com": {
    "password-rules": "minlength: 9; maxlength: 64; required: lower; required: upper; required: digit; required: [!\"#$%&()*,.:<>?@^_{|}];"
  },
  "cvs.com": {
    "password-rules": "minlength: 8; maxlength: 25; required: lower, upper; required: digit; allowed: [!@#$%^&*()];"
  },
  "dailymail.co.uk": {
    "password-rules": "minlength: 5; maxlength: 15;"
  },
  "dan.org": {
    "password-rules": "minlength: 8; maxlength: 25; required: lower; required: upper; required: digit; required: [!@$%^&*];"
  },
  "danawa.com": {
    "password-rules": "minlength: 8; maxlength: 21; required: lower, upper; required: digit; required: [!@$%^&*];"
  },
  "darty.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit;"
  },
  "dbs.com.hk": {
    "password-rules": "minlength: 8; maxlength: 30; required: lower; required: upper; required: digit;"
  },
  "decluttr.com": {
    "password-rules": "minlength: 8; maxlength: 45; required: lower; required: upper; required: digit;"
  },
  "delta.com": {
    "password-rules": "minlength: 8; maxlength: 20; required: lower; required: upper; required: digit;"
  },
  "deutsche-bank.de": {
    "password-rules": "minlength: 5; maxlength: 5; required: lower, upper, digit;"
  },
  "devstore.cn": {
    "password-rules": "minlength: 6; maxlength: 12;"
  },
  "dickssportinggoods.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!#$%&*?@^];"
  },
  "dkb.de": {
    "password-rules": "minlength: 8; maxlength: 38; required: lower, upper; required: digit; allowed: [-äüöÄÜÖß!$%&/()=?+#,.:];"
  },
  "dmm.com": {
    "password-rules": "minlength: 4; maxlength: 16; required: lower; required: upper; required: digit;"
  },
  "dowjones.com": {
    "password-rules": "maxlength: 15;"
  },
  "ea.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; allowed: special;"
  },
  "easycoop.com": {
    "password-rules": "minlength: 8; required: upper; required: special; allowed: lower, digit;"
  },
  "easyjet.com": {
    "password-rules": "minlength: 6; maxlength: 20; required: lower; required: upper; required: digit; required: [-];"
  },
  "ebrap.org": {
    "password-rules": "minlength: 15; required: lower; required: lower; required: upper; required: upper; required: digit; required: digit; required: [-!@#$%^&*()_+|~=`{}[:\";'?,./.]]; required: [-!@#$%^&*()_+|~=`{}[:\";'?,./.]];"
  },
  "ecompanystore.com": {
    "password-rules": "minlength: 8; maxlength: 16; max-consecutive: 2; required: lower; required: upper; required: digit; required: [#$%*+.=@^_];"
  },
  "eddservices.edd.ca.gov": {
    "password-rules": "minlength: 8; maxlength: 12; required: lower; required: upper; required: digit; required: [!@#$%^&*()];"
  },
  "empower-retirement.com": {
    "password-rules": "minlength: 8; maxlength: 16;"
  },
  "epicgames.com": {
    "password-rules": "minlength: 7; required: lower; required: upper; required: digit; required: [-!\"#$%&'()*+,./:;<=>?@[^_`{|}~]];"
  },
  "epicmix.com": {
    "password-rules": "minlength: 8; maxlength: 16;"
  },
  "equifax.com": {
    "password-rules": "minlength: 8; maxlength: 20; required: lower; required: upper; required: digit; required: [!$*+@];"
  },
  "essportal.excelityglobal.com": {
    "password-rules": "minlength: 6; maxlength: 8; allowed: lower, upper, digit;"
  },
  "ettoday.net": {
    "password-rules": "minlength: 6; maxlength: 12;"
  },
  "examservice.com.tw": {
    "password-rules": "minlength: 6; maxlength: 8;"
  },
  "expertflyer.com": {
    "password-rules": "minlength: 5; maxlength: 16; required: lower, upper; required: digit;"
  },
  "extraspace.com": {
    "password-rules": "minlength: 8; maxlength: 20; allowed: lower; required: upper, digit, [!#$%&*?@];"
  },
  "ezpassva.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; required: special;"
  },
  "fc2.com": {
    "password-rules": "minlength: 8; maxlength: 16;"
  },
  "fccaccessonline.com": {
    "password-rules": "minlength: 8; maxlength: 14; max-consecutive: 3; required: lower; required: upper; required: digit; required: [!#$%*^_];"
  },
  "fedex.com": {
    "password-rules": "minlength: 8; max-consecutive: 3; required: lower; required: upper; required: digit; allowed: [-!@#$%^&*_+=`|(){}[:;,.?]];"
  },
  "fidelity.com": {
    "password-rules": "minlength: 6; maxlength: 20; required: lower; allowed: upper,digit,[!$%'()+,./:;=?@^_|~];"
  },
  "flysas.com": {
    "password-rules": "minlength: 8; maxlength: 14; required: lower; required: upper; required: digit; required: [-~!@#$%^&_+=`|(){}[:\"'<>,.?]];"
  },
  "fnac.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit;"
  },
  "fuelrewards.com": {
    "password-rules": "minlength: 8; maxlength: 16; allowed: upper,lower,digit,[!#$%@];"
  },
  "gamestop.com": {
    "password-rules": "minlength: 8; maxlength: 225; required: lower; required: upper; required: digit; required: [!@#$%];"
  },
  "getflywheel.com": {
    "password-rules": "minlength: 7; maxlength: 72;"
  },
  "girlscouts.org": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; allowed: [$#!];"
  },
  "gmx.net": {
    "password-rules": "minlength: 8; maxlength: 40; allowed: lower, upper, digit, [-<=>~!|()@#{}$%,.?^'&*_+`:;\"[]];"
  },
  "google.com": {
    "password-rules": "minlength: 8; allowed: lower, upper, digit, [-!\"#$%&'()*+,./:;<=>?@[^_{|}~]];"
  },
  "guardiananytime.com": {
    "password-rules": "minlength: 8; maxlength: 50; max-consecutive: 2; required: lower; required: upper; required: digit, [-~!@#$%^&*_+=`|(){}[:;,.?]];"
  },
  "gwl.greatwestlife.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [-!#$%_=+<>];"
  },
  "hangseng.com": {
    "password-rules": "minlength: 8; maxlength: 30; required: lower; required: upper; required: digit;"
  },
  "hawaiianairlines.com": {
    "password-rules": "maxlength: 16;"
  },
  "hertz.com": {
    "password-rules": "minlength: 8; maxlength: 30; max-consecutive: 3; required: lower; required: upper; required: digit; required: [#$%^&!@];"
  },
  "hetzner.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit, special;"
  },
  "hilton.com": {
    "password-rules": "minlength: 8; maxlength: 32; required: lower; required: upper; required: digit;"
  },
  "hkbea.com": {
    "password-rules": "minlength: 8; maxlength: 12; required: lower; required: upper; required: digit;"
  },
  "hkexpress.com": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit; required: special;"
  },
  "hotels.com": {
    "password-rules": "minlength: 6; maxlength: 20; required: digit; allowed: lower, upper, [@$!#()&^*%];"
  },
  "hotwire.com": {
    "password-rules": "minlength: 6; maxlength: 30; allowed: lower, upper, digit, [-~!@#$%^&*_+=`|(){}[:;\"'<>,.?]];"
  },
  "hrblock.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [$#%!];"
  },
  "hsbc.com.hk": {
    "password-rules": "minlength: 6; maxlength: 30; required: lower; required: upper; required: digit; allowed: ['.@_];"
  },
  "hsbc.com.my": {
    "password-rules": "minlength: 8; maxlength: 30; required: lower, upper; required: digit; allowed: [-!$*.=?@_'];"
  },
  "hypovereinsbank.de": {
    "password-rules": "minlength: 6; maxlength: 10; required: lower, upper, digit; allowed: [!\"#$%&()*+:;<=>?@[{}~]];"
  },
  "hyresbostader.se": {
    "password-rules": "minlength: 6; maxlength: 20; required: lower, upper; required: digit;"
  },
  "id.sonyentertainmentnetwork.com": {
    "password-rules": "minlength: 8; maxlength: 30; required: lower, upper; required: digit; allowed: [-!@#^&*=+;:];"
  },
  "identitytheft.gov": {
    "password-rules": "allowed: lower, upper, digit, [!#%&*@^];"
  },
  "idestination.info": {
    "password-rules": "maxlength: 15;"
  },
  "impots.gouv.fr": {
    "password-rules": "minlength: 12; maxlength: 128; required: lower; required: digit; allowed: [-!#$%&*+/=?^_'.{|}];"
  },
  "indochino.com": {
    "password-rules": "minlength: 6; maxlength: 15; required: upper; required: digit; allowed: lower, special;"
  },
  "inntopia.travel": {
    "password-rules": "minlength: 7; maxlength: 19; required: digit; allowed: upper,lower,[-];"
  },
  "internationalsos.com": {
    "password-rules": "required: lower; required: upper; required: digit; required: [@#$%^&+=_];"
  },
  "irctc.co.in": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit; required: [!@#$%^&*()+];"
  },
  "irs.gov": {
    "password-rules": "minlength: 8; maxlength: 32; required: lower; required: upper; required: digit; required: [!#$%&*@];"
  },
  "jal.co.jp": {
    "password-rules": "minlength: 8; maxlength: 16;"
  },
  "japanpost.jp": {
    "password-rules": "minlength: 8; maxlength: 16; required: digit; required: upper,lower;"
  },
  "jordancu-onlinebanking.org": {
    "password-rules": "minlength: 6; maxlength: 32; allowed: upper, lower, digit,[-!\"#$%&'()*+,.:;<=>?@[^_`{|}~]];"
  },
  "keldoc.com": {
    "password-rules": "minlength: 12; required: lower; required: upper; required: digit; required: [!@#$%^&*];"
  },
  "key.harvard.edu": {
    "password-rules": "minlength: 10; maxlength: 100; required: lower; required: upper; required: digit; allowed: [-@_#!&$`%*+()./,;~:{}|?>=<^[']];"
  },
  "kfc.ca": {
    "password-rules": "minlength: 6; maxlength: 15; required: lower; required: upper; required: digit; required: [!@#$%&?*];"
  },
  "klm.com": {
    "password-rules": "minlength: 8; maxlength: 12;"
  },
  "kundenportal.edeka-smart.de": {
    "password-rules": "minlength: 8; maxlength: 16; required: digit; required: upper, lower; required: [!\"§$%&#];"
  },
  "la-z-boy.com": {
    "password-rules": "minlength: 6; maxlength: 15; required: lower, upper; required: digit;"
  },
  "labcorp.com": {
    "password-rules": "minlength: 8; maxlength: 20; required: upper; required: lower; required: digit; required: [!@#$%^&*];"
  },
  "ladwp.com": {
    "password-rules": "minlength: 8; maxlength: 20; required: digit; allowed: lower, upper;"
  },
  "launtel.net.au": {
    "password-rules": "minlength: 8; required: digit; required: digit; allowed: lower, upper;"
  },
  "leetchi.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!#$%&()*+,./:;<>?@\"_];"
  },
  "lepida.it": {
    "password-rules": "minlength: 8; maxlength: 16; max-consecutive: 2; required: lower; required: upper; required: digit; required: [-!\"#$%&'()*+,.:;<=>?@[^_`{|}~]];"
  },
  "lg.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; allowed: [-!#$%&'()*+,.:;=?@[^_{|}~]];"
  },
  "live.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; allowed: [-@_#!&$`%*+()./,;~:{}|?>=<^'[]];"
  },
  "lloydsbank.co.uk": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: digit; allowed: upper;"
  },
  "lowes.com": {
    "password-rules": "minlength: 8; maxlength: 128; max-consecutive: 3; required: lower, upper; required: digit;"
  },
  "loyalty.accor.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!#$%&=@];"
  },
  "lsacsso.b2clogin.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit, [-!#$%&*?@^_];"
  },
  "lufthansa.com": {
    "password-rules": "minlength: 8; maxlength: 32; required: lower; required: upper; required: digit; required: [!#$%&()*+,./:;<>?@\"_];"
  },
  "macys.com": {
    "password-rules": "minlength: 7; maxlength: 16; allowed: lower, upper, digit, [~!@#$%^&*+`(){}[:;\"'<>?]];"
  },
  "mailbox.org": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; allowed: [-!$\"%&/()=*+#.,;:@?{}[]];"
  },
  "makemytrip.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [@$!%*#?&];"
  },
  "marriott.com": {
    "password-rules": "minlength: 8; maxlength: 20; required: lower; required: upper; required: digit; allowed: [$!#&@?%=];"
  },
  "maybank2u.com.my": {
    "password-rules": "minlength: 8; maxlength: 12; max-consecutive: 2; required: lower; required: upper; required: digit; required: [-~!@#$%^&*_+=`|(){}[:;\"'<>,.?];"
  },
  "medicare.gov": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; required: [@!$%^*()];"
  },
  "member.everbridge.net": {
    "password-rules": "minlength: 8; required: lower, upper; required: digit; allowed: [!@#$%^&*()];"
  },
  "metlife.com": {
    "password-rules": "minlength: 6; maxlength: 20;"
  },
  "microsoft.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: special;"
  },
  "mintmobile.com": {
    "password-rules": "minlength: 8; maxlength: 20; required: lower; required: upper; required: digit; required: special; allowed: [!#$%&()*+:;=@[^_`{}~]];"
  },
  "mlb.com": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit;"
  },
  "mpv.tickets.com": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit;"
  },
  "museumofflight.org": {
    "password-rules": "minlength: 8; maxlength: 15;"
  },
  "my.konami.net": {
    "password-rules": "minlength: 8; maxlength: 32; required: lower; required: upper; required: digit;"
  },
  "myaccess.dmdc.osd.mil": {
    "password-rules": "minlength: 9; maxlength: 20; required: lower; required: upper; required: digit; allowed: [-@_#!&$`%*+()./,;~:{}|?>=<^'[]];"
  },
  "mygoodtogo.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower, upper, digit;"
  },
  "myhealthrecord.com": {
    "password-rules": "minlength: 8; maxlength: 20; allowed: lower, upper, digit, [_.!$*=];"
  },
  "mysedgwick.com": {
    "password-rules": "minlength: 8; maxlength: 16; allowed: lower; required: upper; required: digit; required: [@#%^&+=!]; allowed: [-~_$.,;]"
  },
  "mysubaru.com": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit; allowed: [!#$%()*+,./:;=?@\\^`~];"
  },
  "naver.com": {
    "password-rules": "minlength: 6; maxlength: 16;"
  },
  "nelnet.net": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit, [!@#$&*];"
  },
  "netflix.com": {
    "password-rules": "minlength: 4; maxlength: 60; required: lower, upper, digit; allowed: special;"
  },
  "netgear.com": {
    "password-rules": "minlength: 6; maxlength: 128; allowed: lower, upper, digit, [!@#$%^&*()];"
  },
  "nowinstock.net": {
    "password-rules": "minlength: 6; maxlength: 20; allowed: lower, upper, digit;"
  },
  "order.wendys.com": {
    "password-rules": "minlength: 6; maxlength: 20; required: lower; required: upper; required: digit; allowed: [!#$%&()*+/=?^_{}];"
  },
  "ototoy.jp": {
    "password-rules": "minlength: 8; allowed: upper,lower,digit,[- .=_];"
  },
  "packageconciergeadmin.com": {
    "password-rules": "minlength: 4; maxlength: 4; allowed: digit;"
  },
  "paypal.com": {
    "password-rules": "minlength: 8; maxlength: 20; max-consecutive: 3; required: lower, upper; required: digit, [!@#$%^&*()];"
  },
  "payvgm.youraccountadvantage.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: special;"
  },
  "pilotflyingj.com": {
    "password-rules": "minlength: 7; required: digit; allowed: lower, upper;"
  },
  "pixnet.cc": {
    "password-rules": "minlength: 4; maxlength: 16; allowed: lower, upper;"
  },
  "planetary.org": {
    "password-rules": "minlength: 5; maxlength: 20; required: lower; required: upper; required: digit; allowed: ascii-printable;"
  },
  "plazapremiumlounge.com": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit; allowed: [!#$%&*,@^];"
  },
  "portal.edd.ca.gov": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!#$%&()*@^];"
  },
  "portals.emblemhealth.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!#$%&'()*+,./:;<>?@\\^_`{|}~[]];"
  },
  "portlandgeneral.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; allowed: [!#$%&*?@];"
  },
  "poste.it": {
    "password-rules": "minlength: 8; maxlength: 16; max-consecutive: 2; required: lower; required: upper; required: digit; required: special;"
  },
  "posteo.de": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit, [-~!#$%&_+=|(){}[:;\"’<>,.? ]];"
  },
  "powells.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; required: [\"!@#$%^&*(){}[]];"
  },
  "preferredhotels.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!#$%&()*+@^_];"
  },
  "premier.ticketek.com.au": {
    "password-rules": "minlength: 6; maxlength: 16;"
  },
  "premierinn.com": {
    "password-rules": "minlength: 8; required: upper; required: digit; allowed: lower;"
  },
  "prepaid.bankofamerica.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; required: [!@#$%^&*()+~{}'\";:<>?];"
  },
  "prestocard.ca": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit,[!\"#$%&'()*+,<>?@];"
  },
  "propelfuels.com": {
    "password-rules": "minlength: 6; maxlength: 16;"
  },
  "qdosstatusreview.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!#$%&@^];"
  },
  "questdiagnostics.com": {
    "password-rules": "minlength: 8; maxlength: 30; required: upper, lower; required: digit, [!#$%&()*+<>?@^_~];"
  },
  "rejsekort.dk": {
    "password-rules": "minlength: 7; maxlength: 15; required: lower; required: upper; required: digit;"
  },
  "renaud-bray.com": {
    "password-rules": "minlength: 8; maxlength: 38; allowed: upper,lower,digit;"
  },
  "ring.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!@#$%^&*<>?];"
  },
  "riteaid.com": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit;"
  },
  "robinhood.com": {
    "password-rules": "minlength: 10;"
  },
  "rogers.com": {
    "password-rules": "minlength: 8; required: lower, upper; required: digit; required: [!@#$];"
  },
  "ruc.dk": {
    "password-rules": "minlength: 6; maxlength: 8; required: lower, upper; required: [-!#%&(){}*+;%/<=>?_];"
  },
  "runescape.com": {
    "password-rules": "minlength: 5; maxlength: 20; required: lower; required: upper; required: digit;"
  },
  "ruten.com.tw": {
    "password-rules": "minlength: 6; maxlength: 15; required: lower, upper;"
  },
  "salslimo.com": {
    "password-rules": "minlength: 8; maxlength: 50; required: upper; required: lower; required: digit; required: [!@#$&*];"
  },
  "santahelenasaude.com.br": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit; required: [-!@#$%&*_+=<>];"
  },
  "santander.de": {
    "password-rules": "minlength: 8; maxlength: 12; required: lower, upper; required: digit; allowed: [-!#$%&'()*,.:;=?^{}];"
  },
  "sbisec.co.jp": {
    "password-rules": "minlength: 10; maxlength: 20; allowed: upper,lower,digit;"
  },
  "secure-arborfcu.org": {
    "password-rules": "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit; required: [!#$%&'()+,.:?@[_`~]];"
  },
  "secure.orclinic.com": {
    "password-rules": "minlength: 6; maxlength: 15; required: lower; required: digit; allowed: ascii-printable;"
  },
  "secure.snnow.ca": {
    "password-rules": "minlength: 7; maxlength: 16; required: digit; allowed: lower, upper;"
  },
  "sephora.com": {
    "password-rules": "minlength: 6; maxlength: 12;"
  },
  "serviziconsolari.esteri.it": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; required: special;"
  },
  "servizioelettriconazionale.it": {
    "password-rules": "minlength: 8; maxlength: 20; required: lower; required: upper; required: digit; required: [!#$%&*?@^_~];"
  },
  "sfwater.org": {
    "password-rules": "minlength: 10; maxlength: 30; required: digit; allowed: lower, upper, [!@#$%*()_+^}{:;?.];"
  },
  "signin.ea.com": {
    "password-rules": "minlength: 8; maxlength: 64; required: lower, upper; required: digit; allowed: [-!@#^&*=+;:];"
  },
  "southwest.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: upper; required: digit; allowed: lower, [!@#$%^*(),.;:/\\];"
  },
  "speedway.com": {
    "password-rules": "minlength: 4; maxlength: 8; required: digit;"
  },
  "spirit.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; required: [!@#$%^&*()];"
  },
  "splunk.com": {
    "password-rules": "minlength: 8; maxlength: 64; required: lower; required: upper; required: digit; required: [-!@#$%&*_+=<>];"
  },
  "ssa.gov": {
    "password-rules": "required: lower; required: upper; required: digit; required: [~!@#$%^&*];"
  },
  "store.nintendo.co.uk": {
    "password-rules": "minlength: 8; maxlength: 20;"
  },
  "store.nvidia.com": {
    "password-rules": "minlength: 8; maxlength: 32; required: lower; required: upper; required: digit; required: [-!@#$%^*~:;&><[{}|_+=?]];"
  },
  "store.steampowered.com": {
    "password-rules": "minlength: 6; required: lower; required: upper; required: digit; allowed: [~!@#$%^&*];"
  },
  "successfactors.eu": {
    "password-rules": "minlength: 8; maxlength: 18; required: lower; required: upper; required: digit,[-!\"#$%&'()*+,.:;<=>?@[^_`{|}~]];"
  },
  "sulamericaseguros.com.br": {
    "password-rules": "minlength: 6; maxlength: 6;"
  },
  "sunlife.com": {
    "password-rules": "minlength: 8; maxlength: 10; required: digit; required: lower, upper;"
  },
  "t-mobile.net": {
    "password-rules": "minlength: 8; maxlength: 16;"
  },
  "target.com": {
    "password-rules": "minlength: 8; maxlength: 20; required: lower, upper; required: digit, [-!\"#$%&'()*+,./:;=?@[\\^_`{|}~];"
  },
  "telekom-dienste.de": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; required: [#$%&()*+,./<=>?@_{|}~];"
  },
  "thameswater.co.uk": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; required: special;"
  },
  "tix.soundrink.com": {
    "password-rules": "minlength: 6; maxlength: 16;"
  },
  "training.confluent.io": {
    "password-rules": "minlength: 6; maxlength: 16; required: lower; required: upper; required: digit; allowed: [!#$%*@^_~];"
  },
  "treasurer.mo.gov": {
    "password-rules": "minlength: 8; maxlength: 26; required: lower; required: upper; required: digit; required: [!#$&];"
  },
  "twitch.tv": {
    "password-rules": "minlength: 8; maxlength: 71;"
  },
  "twitter.com": {
    "password-rules": "minlength: 8;"
  },
  "ubisoft.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; required: [-]; required: [!@#$%^&*()+];"
  },
  "udel.edu": {
    "password-rules": "minlength: 12; maxlength: 30; required: lower; required: upper; required: digit; required: [!@#$%^&*()+];"
  },
  "user.ornl.gov": {
    "password-rules": "minlength: 8; maxlength: 30; max-consecutive: 3; required: lower, upper; required: digit; allowed: [!#$%./_];"
  },
  "usps.com": {
    "password-rules": "minlength: 8; maxlength: 50; max-consecutive: 2; required: lower; required: upper; required: digit; allowed: [-!\"#&'()+,./?@];"
  },
  "vanguard.com": {
    "password-rules": "minlength: 6; maxlength: 20; required: lower; required: upper; required: digit; required: digit;"
  },
  "vanguardinvestor.co.uk": {
    "password-rules": "minlength: 8; maxlength: 50; required: lower; required: upper; required: digit; required: digit;"
  },
  "ventrachicago.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit, [!@#$%^];"
  },
  "verizonwireless.com": {
    "password-rules": "minlength: 8; maxlength: 20; required: lower, upper; required: digit; allowed: unicode;"
  },
  "vetsfirstchoice.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; allowed: [?!@$%^+=&];"
  },
  "virginmobile.ca": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!#$@];"
  },
  "visa.com": {
    "password-rules": "minlength: 6; maxlength: 32;"
  },
  "visabenefits-auth.axa-assistance.us": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!\"#$%&()*,.:<>?@^{|}];"
  },
  "vivo.com.br": {
    "password-rules": "maxlength: 6; max-consecutive: 3; allowed: digit;"
  },
  "wa.aaa.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower; required: upper; required: digit; allowed: ascii-printable;"
  },
  "walkhighlands.co.uk": {
    "password-rules": "minlength: 9; maxlength: 15; required: lower; required: upper; required: digit; allowed: special;"
  },
  "walmart.com": {
    "password-rules": "allowed: lower, upper, digit, [-(~!@#$%^&*_+=`|(){}[:;\"'<>,.?]];"
  },
  "waze.com": {
    "password-rules": "minlength: 8; maxlength: 64; required: lower, upper, digit;"
  },
  "wccls.org": {
    "password-rules": "minlength: 4; maxlength: 16; allowed: lower, upper, digit;"
  },
  "web.de": {
    "password-rules": "minlength: 8; maxlength: 40; allowed: lower, upper, digit, [-<=>~!|()@#{}$%,.?^'&*_+`:;\"[]];"
  },
  "wegmans.com": {
    "password-rules": "minlength: 8; required: digit; required: upper,lower; required: [!#$%&*+=?@^];"
  },
  "weibo.com": {
    "password-rules": "minlength: 6; maxlength: 16;"
  },
  "wellsfargo.com": {
    "password-rules": "minlength: 8; maxlength: 32; required: lower; required: upper; required: digit;"
  },
  "wmata.com": {
    "password-rules": "minlength: 8; required: lower, upper; required: digit; required: digit; required: [-!@#$%^&*~/\"()_=+\\|,.?[]];"
  },
  "wsj.com": {
    "password-rules": "minlength: 5; maxlength: 15; required: digit; allowed: lower, upper, [-~!@#$^*_=`|(){}[:;\"'<>,.?]];"
  },
  "xfinity.com": {
    "password-rules": "minlength: 8; maxlength: 16; required: lower, upper; required: digit;"
  },
  "xvoucher.com": {
    "password-rules": "minlength: 11; required: upper; required: digit; required: [!@#$%&_];"
  },
  "yatra.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit; required: [!#$%&'()+,.:?@[_`~]];"
  },
  "zara.com": {
    "password-rules": "minlength: 8; required: lower; required: upper; required: digit;"
  },
  "zdf.de": {
    "password-rules": "minlength: 8; required: upper; required: digit; allowed: lower, special;"
  },
  "zoom.us": {
    "password-rules": "minlength: 8; maxlength: 32; max-consecutive: 6; required: lower; required: upper; required: digit;"
  }
}
},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createDevice = createDevice;

var _config = require("./config.js");

var _AndroidInterface = require("./DeviceInterface/AndroidInterface.js");

var _ExtensionInterface = require("./DeviceInterface/ExtensionInterface.js");

var _AppleDeviceInterface = require("./DeviceInterface/AppleDeviceInterface.js");

var _AppleOverlayDeviceInterface = require("./DeviceInterface/AppleOverlayDeviceInterface.js");

var _transports = require("./deviceApiCalls/transports/transports.js");

var _index = require("../packages/device-api/index.js");

var _Settings = require("./Settings.js");

var _WindowsInterface = require("./DeviceInterface/WindowsInterface.js");

var _WindowsOverlayDeviceInterface = require("./DeviceInterface/WindowsOverlayDeviceInterface.js");

function createDevice() {
  const globalConfig = (0, _config.createGlobalConfig)();
  const transport = (0, _transports.createTransport)(globalConfig);
  /**
   * A wrapper around transports to assist in debugging/integrations
   * @type {import("../packages/device-api").DeviceApiTransport}
   */

  const loggingTransport = {
    async send(deviceApiCall) {
      console.log('[->outgoing]', 'id:', deviceApiCall.method, deviceApiCall.params || null);
      const result = await transport.send(deviceApiCall);
      console.log('[<-incoming]', 'id:', deviceApiCall.method, result || null);
      return result;
    }

  }; // Create the DeviceAPI + Setting

  let deviceApi = new _index.DeviceApi(globalConfig.isDDGTestMode ? loggingTransport : transport);
  const settings = new _Settings.Settings(globalConfig, deviceApi);

  if (globalConfig.isWindows) {
    if (globalConfig.isTopFrame) {
      return new _WindowsOverlayDeviceInterface.WindowsOverlayDeviceInterface(globalConfig, deviceApi, settings);
    }

    return new _WindowsInterface.WindowsInterface(globalConfig, deviceApi, settings);
  }

  if (globalConfig.isDDGApp) {
    if (globalConfig.isAndroid) {
      return new _AndroidInterface.AndroidInterface(globalConfig, deviceApi, settings);
    }

    if (globalConfig.isTopFrame) {
      return new _AppleOverlayDeviceInterface.AppleOverlayDeviceInterface(globalConfig, deviceApi, settings);
    }

    return new _AppleDeviceInterface.AppleDeviceInterface(globalConfig, deviceApi, settings);
  }

  globalConfig.isExtension = true;
  return new _ExtensionInterface.ExtensionInterface(globalConfig, deviceApi, settings);
}

},{"../packages/device-api/index.js":6,"./DeviceInterface/AndroidInterface.js":15,"./DeviceInterface/AppleDeviceInterface.js":16,"./DeviceInterface/AppleOverlayDeviceInterface.js":17,"./DeviceInterface/ExtensionInterface.js":18,"./DeviceInterface/WindowsInterface.js":20,"./DeviceInterface/WindowsOverlayDeviceInterface.js":21,"./Settings.js":44,"./config.js":57,"./deviceApiCalls/transports/transports.js":65}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AndroidInterface = void 0;

var _InterfacePrototype = _interopRequireDefault(require("./InterfacePrototype.js"));

var _autofillUtils = require("../autofill-utils.js");

var _NativeUIController = require("../UI/controllers/NativeUIController.js");

var _appleUtils = require("@duckduckgo/content-scope-scripts/src/apple-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class AndroidInterface extends _InterfacePrototype.default {
  async isEnabled() {
    return (0, _autofillUtils.autofillEnabled)(this.globalConfig, _appleUtils.processConfig);
  }
  /**
   * @returns {Promise<string|undefined>}
   */


  async getAlias() {
    const {
      alias
    } = await (0, _autofillUtils.sendAndWaitForAnswer)(() => {
      return window.EmailInterface.showTooltip();
    }, 'getAliasResponse');
    return alias;
  }
  /**
   * @override
   */


  createUIController() {
    return new _NativeUIController.NativeUIController();
  }
  /**
   * @deprecated use `this.settings.availableInputTypes.email` in the future
   * @returns {boolean}
   */


  isDeviceSignedIn() {
    var _this$globalConfig$av;

    // on DDG domains, always check via `window.EmailInterface.isSignedIn()`
    if (this.globalConfig.isDDGDomain) {
      return window.EmailInterface.isSignedIn() === 'true';
    } // on non-DDG domains, where `availableInputTypes.email` is present, use it


    if (typeof ((_this$globalConfig$av = this.globalConfig.availableInputTypes) === null || _this$globalConfig$av === void 0 ? void 0 : _this$globalConfig$av.email) === 'boolean') {
      return this.globalConfig.availableInputTypes.email;
    } // ...on other domains we assume true because the script wouldn't exist otherwise


    return true;
  }

  async setupAutofill() {}
  /**
   * Used by the email web app
   * Settings page displays data of the logged in user data
   */


  getUserData() {
    let userData = null;

    try {
      userData = JSON.parse(window.EmailInterface.getUserData());
    } catch (e) {
      if (this.globalConfig.isDDGTestMode) {
        console.error(e);
      }
    }

    return Promise.resolve(userData);
  }
  /**
   * Used by the email web app
   * Device capabilities determine which functionality is available to the user
   */


  getEmailProtectionCapabilities() {
    let deviceCapabilities = null;

    try {
      deviceCapabilities = JSON.parse(window.EmailInterface.getDeviceCapabilities());
    } catch (e) {
      if (this.globalConfig.isDDGTestMode) {
        console.error(e);
      }
    }

    return Promise.resolve(deviceCapabilities);
  }

  storeUserData(_ref) {
    let {
      addUserData: {
        token,
        userName,
        cohort
      }
    } = _ref;
    return window.EmailInterface.storeCredentials(token, userName, cohort);
  }
  /**
    * Used by the email web app
    * Provides functionality to log the user out
    */


  removeUserData() {
    try {
      return window.EmailInterface.removeCredentials();
    } catch (e) {
      if (this.globalConfig.isDDGTestMode) {
        console.error(e);
      }
    }
  }

  addLogoutListener(handler) {
    // Only deal with logging out if we're in the email web app
    if (!this.globalConfig.isDDGDomain) return;
    window.addEventListener('message', e => {
      if (this.globalConfig.isDDGDomain && e.data.emailProtectionSignedOut) {
        handler();
      }
    });
  }
  /** Noop */


  firePixel(_pixelParam) {}

}

exports.AndroidInterface = AndroidInterface;

},{"../UI/controllers/NativeUIController.js":50,"../autofill-utils.js":55,"./InterfacePrototype.js":19,"@duckduckgo/content-scope-scripts/src/apple-utils":1}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AppleDeviceInterface = void 0;

var _InterfacePrototype = _interopRequireDefault(require("./InterfacePrototype.js"));

var _autofillUtils = require("../autofill-utils.js");

var _appleUtils = require("@duckduckgo/content-scope-scripts/src/apple-utils");

var _HTMLTooltip = require("../UI/HTMLTooltip.js");

var _HTMLTooltipUIController = require("../UI/controllers/HTMLTooltipUIController.js");

var _OverlayUIController = require("../UI/controllers/OverlayUIController.js");

var _index = require("../../packages/device-api/index.js");

var _additionalDeviceApiCalls = require("../deviceApiCalls/additionalDeviceApiCalls.js");

var _NativeUIController = require("../UI/controllers/NativeUIController.js");

var _deviceApiCalls = require("../deviceApiCalls/__generated__/deviceApiCalls.js");

var _matching = require("../Form/matching.js");

var _InContextSignup = require("../InContextSignup.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @typedef {import('../deviceApiCalls/__generated__/validators-ts').GetAutofillDataRequest} GetAutofillDataRequest
 */
class AppleDeviceInterface extends _InterfacePrototype.default {
  constructor() {
    super(...arguments);

    _defineProperty(this, "inContextSignup", new _InContextSignup.InContextSignup(this));

    _defineProperty(this, "initialSetupDelayMs", 300);

    _defineProperty(this, "pollingTimeout", null);
  }

  async isEnabled() {
    return (0, _autofillUtils.autofillEnabled)(this.globalConfig, _appleUtils.processConfig);
  }
  /**
   * The default functionality of this class is to operate as an 'overlay controller' -
   * which means it's purpose is to message the native layer about when to open/close the overlay.
   *
   * There is an additional use-case though, when running on older macOS versions, we just display the
   * HTMLTooltip in-page (like the extension does). This is why the `!this.globalConfig.supportsTopFrame`
   * check exists below - if we know we don't support the overlay, we fall back to in-page.
   *
   * @override
   * @returns {import("../UI/controllers/UIController.js").UIController}
   */


  createUIController() {
    var _this$globalConfig$us, _this$globalConfig$us2;

    if (((_this$globalConfig$us = this.globalConfig.userPreferences) === null || _this$globalConfig$us === void 0 ? void 0 : (_this$globalConfig$us2 = _this$globalConfig$us.platform) === null || _this$globalConfig$us2 === void 0 ? void 0 : _this$globalConfig$us2.name) === 'ios') {
      return new _NativeUIController.NativeUIController();
    }

    if (!this.globalConfig.supportsTopFrame) {
      const options = { ..._HTMLTooltip.defaultOptions,
        testMode: this.isTestMode()
      };
      return new _HTMLTooltipUIController.HTMLTooltipUIController({
        device: this,
        tooltipKind: 'modern'
      }, options);
    }
    /**
     * If we get here, we're just a controller for an overlay
     */


    return new _OverlayUIController.OverlayUIController({
      remove: async () => this._closeAutofillParent(),
      show: async details => this._show(details)
    });
  }
  /**
   * For now, this could be running
   *  1) on iOS
   *  2) on macOS + Overlay
   *  3) on macOS + in-page HTMLTooltip
   *
   * @override
   * @returns {Promise<void>}
   */


  async setupAutofill() {
    if (!this.globalConfig.supportsTopFrame) {
      await this._getAutofillInitData();
    }

    await this.inContextSignup.init();
    const signedIn = await this._checkDeviceSignedIn();

    if (signedIn) {
      if (this.globalConfig.isApp) {
        await this.getAddresses();
      }
    }
  }
  /**
   * Used by the email web app
   * Settings page displays data of the logged in user data
   */


  getUserData() {
    return this.deviceApi.request((0, _index.createRequest)('emailHandlerGetUserData'));
  }
  /**
   * Used by the email web app
   * Device capabilities determine which functionality is available to the user
   */


  getEmailProtectionCapabilities() {
    return this.deviceApi.request((0, _index.createRequest)('emailHandlerGetCapabilities'));
  }
  /**
   */


  async getSelectedCredentials() {
    return this.deviceApi.request((0, _index.createRequest)('getSelectedCredentials'));
  }
  /**
   * The data format provided here for `parentArgs` matches Window now.
   * @param {GetAutofillDataRequest} parentArgs
   */


  async _showAutofillParent(parentArgs) {
    const applePayload = { ...parentArgs.triggerContext,
      serializedInputContext: parentArgs.serializedInputContext
    };
    return this.deviceApi.notify((0, _index.createNotification)('showAutofillParent', applePayload));
  }
  /**
   * @returns {Promise<any>}
   */


  async _closeAutofillParent() {
    return this.deviceApi.notify((0, _index.createNotification)('closeAutofillParent', {}));
  }
  /**
   * @param {GetAutofillDataRequest} details
   */


  async _show(details) {
    await this._showAutofillParent(details);

    this._listenForSelectedCredential(async response => {
      if (!response) return;

      if ('configType' in response) {
        this.selectedDetail(response.data, response.configType);
      } else if ('stop' in response) {
        await this.onFinishedAutofill();
      } else if ('stateChange' in response) {
        await this.updateForStateChange();
      }
    });
  }

  async refreshData() {
    await super.refreshData();
    await this._checkDeviceSignedIn();
  }

  async getAddresses() {
    if (!this.globalConfig.isApp) return this.getAlias();
    const {
      addresses
    } = await this.deviceApi.request((0, _index.createRequest)('emailHandlerGetAddresses'));
    this.storeLocalAddresses(addresses);
    return addresses;
  }

  async refreshAlias() {
    await this.deviceApi.notify((0, _index.createNotification)('emailHandlerRefreshAlias')); // On macOS we also update the addresses stored locally

    if (this.globalConfig.isApp) this.getAddresses();
  }

  async _checkDeviceSignedIn() {
    const {
      isAppSignedIn
    } = await this.deviceApi.request((0, _index.createRequest)('emailHandlerCheckAppSignedInStatus'));

    this.isDeviceSignedIn = () => !!isAppSignedIn;

    return !!isAppSignedIn;
  }

  storeUserData(_ref) {
    let {
      addUserData: {
        token,
        userName,
        cohort
      }
    } = _ref;
    return this.deviceApi.notify((0, _index.createNotification)('emailHandlerStoreToken', {
      token,
      username: userName,
      cohort
    }));
  }
  /**
   * Used by the email web app
   * Provides functionality to log the user out
   */


  removeUserData() {
    this.deviceApi.notify((0, _index.createNotification)('emailHandlerRemoveToken'));
  }
  /**
   * Used by the email web app
   * Provides functionality to close the window after in-context sign-up or sign-in
   */


  closeEmailProtection() {
    this.deviceApi.request(new _deviceApiCalls.CloseEmailProtectionTabCall(null));
  }
  /**
   * PM endpoints
   */

  /**
   * Gets the init data from the device
   * @returns {APIResponse<PMData>}
   */


  async _getAutofillInitData() {
    const response = await this.deviceApi.request((0, _index.createRequest)('pmHandlerGetAutofillInitData'));
    this.storeLocalData(response.success);
    return response;
  }
  /**
   * Gets credentials ready for autofill
   * @param {CredentialsObject['id']} id - the credential id
   * @returns {APIResponseSingle<CredentialsObject>}
   */


  getAutofillCredentials(id) {
    return this.deviceApi.request((0, _index.createRequest)('pmHandlerGetAutofillCredentials', {
      id
    }));
  }
  /**
   * Opens the native UI for managing passwords
   */


  openManagePasswords() {
    return this.deviceApi.notify((0, _index.createNotification)('pmHandlerOpenManagePasswords'));
  }
  /**
   * Opens the native UI for managing identities
   */


  openManageIdentities() {
    return this.deviceApi.notify((0, _index.createNotification)('pmHandlerOpenManageIdentities'));
  }
  /**
   * Opens the native UI for managing credit cards
   */


  openManageCreditCards() {
    return this.deviceApi.notify((0, _index.createNotification)('pmHandlerOpenManageCreditCards'));
  }
  /**
   * Gets a single identity obj once the user requests it
   * @param {IdentityObject['id']} id
   * @returns {Promise<{success: IdentityObject|undefined}>}
   */


  getAutofillIdentity(id) {
    const identity = this.getLocalIdentities().find(_ref2 => {
      let {
        id: identityId
      } = _ref2;
      return "".concat(identityId) === "".concat(id);
    });
    return Promise.resolve({
      success: identity
    });
  }
  /**
   * Gets a single complete credit card obj once the user requests it
   * @param {CreditCardObject['id']} id
   * @returns {APIResponse<CreditCardObject>}
   */


  getAutofillCreditCard(id) {
    return this.deviceApi.request((0, _index.createRequest)('pmHandlerGetCreditCard', {
      id
    }));
  }

  getCurrentInputType() {
    var _this$activeForm;

    const topContextData = this.getTopContextData();
    return topContextData !== null && topContextData !== void 0 && topContextData.inputType ? topContextData.inputType : (0, _matching.getInputType)((_this$activeForm = this.activeForm) === null || _this$activeForm === void 0 ? void 0 : _this$activeForm.activeInput);
  }
  /**
   * @returns {Promise<string|undefined>}
   */


  async getAlias() {
    const {
      alias
    } = await this.deviceApi.request(new _additionalDeviceApiCalls.GetAlias({
      requiresUserPermission: !this.globalConfig.isApp,
      shouldConsumeAliasIfProvided: !this.globalConfig.isApp,
      isIncontextSignupAvailable: this.inContextSignup.isAvailable()
    }));
    return alias ? (0, _autofillUtils.formatDuckAddress)(alias) : alias;
  }

  addLogoutListener(handler) {
    // Only deal with logging out if we're in the email web app
    if (!this.globalConfig.isDDGDomain) return;
    window.addEventListener('message', e => {
      if (this.globalConfig.isDDGDomain && e.data.emailProtectionSignedOut) {
        handler();
      }
    });
  }

  async addDeviceListeners() {
    if (this.settings.featureToggles.third_party_credentials_provider) {
      if (this.globalConfig.hasModernWebkitAPI) {
        Object.defineProperty(window, 'providerStatusUpdated', {
          enumerable: false,
          configurable: false,
          writable: false,
          value: data => {
            this.providerStatusUpdated(data);
          }
        });
      } else {
        // On Catalina we poll the native layer
        setTimeout(() => this._pollForUpdatesToCredentialsProvider(), 2000);
      }
    }
  } // Only used on Catalina


  async _pollForUpdatesToCredentialsProvider() {
    try {
      const response = await this.deviceApi.request(new _deviceApiCalls.CheckCredentialsProviderStatusCall(null));

      if (response.availableInputTypes.credentialsProviderStatus !== this.settings.availableInputTypes.credentialsProviderStatus) {
        this.providerStatusUpdated(response);
      }

      setTimeout(() => this._pollForUpdatesToCredentialsProvider(), 2000);
    } catch (e) {
      if (this.globalConfig.isDDGTestMode) {
        console.log('isDDGTestMode: _pollForUpdatesToCredentialsProvider: ❌', e);
      }
    }
  }
  /** @type {any} */


  /**
   * Poll the native listener until the user has selected a credential.
   * Message return types are:
   * - 'stop' is returned whenever the message sent doesn't match the native last opened tooltip.
   *     - This also is triggered when the close event is called and prevents any edge case continued polling.
   * - 'ok' is when the user has selected a credential and the value can be injected into the page.
   * - 'none' is when the tooltip is open in the native window however hasn't been entered.
   * @param {(response: {data:IdentityObject|CreditCardObject|CredentialsObject, configType: string} | {stateChange: boolean} | {stop: boolean} | null) => void} callback
   */
  async _listenForSelectedCredential(callback) {
    // Prevent two timeouts from happening
    const poll = async () => {
      clearTimeout(this.pollingTimeout);
      const response = await this.getSelectedCredentials();

      switch (response.type) {
        case 'none':
          // Parent hasn't got a selected credential yet
          this.pollingTimeout = setTimeout(() => poll(), 100);
          return;

        case 'ok':
          {
            await callback({
              data: response.data,
              configType: response.configType
            });
            return;
          }

        case 'state':
          {
            // Inform that state has changed, but continue polling
            // e.g. in-context signup has been dismissed
            await callback({
              stateChange: true
            });
            this.pollingTimeout = setTimeout(() => poll(), 100);
            return;
          }

        case 'stop':
          // Parent wants us to stop polling
          await callback({
            stop: true
          });
      }
    };

    poll();
  }

}

exports.AppleDeviceInterface = AppleDeviceInterface;

},{"../../packages/device-api/index.js":6,"../Form/matching.js":35,"../InContextSignup.js":38,"../UI/HTMLTooltip.js":48,"../UI/controllers/HTMLTooltipUIController.js":49,"../UI/controllers/NativeUIController.js":50,"../UI/controllers/OverlayUIController.js":51,"../autofill-utils.js":55,"../deviceApiCalls/__generated__/deviceApiCalls.js":59,"../deviceApiCalls/additionalDeviceApiCalls.js":61,"./InterfacePrototype.js":19,"@duckduckgo/content-scope-scripts/src/apple-utils":1}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AppleOverlayDeviceInterface = void 0;

var _AppleDeviceInterface = require("./AppleDeviceInterface.js");

var _HTMLTooltipUIController = require("../UI/controllers/HTMLTooltipUIController.js");

var _overlayApi = require("./overlayApi.js");

var _index = require("../../packages/device-api/index.js");

var _deviceApiCalls = require("../deviceApiCalls/__generated__/deviceApiCalls.js");

var _validatorsZod = require("../deviceApiCalls/__generated__/validators.zod.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * This subclass is designed to separate code that *only* runs inside the
 * Overlay into a single place.
 *
 * It will only run inside the macOS overlay, therefor all code here
 * can be viewed as *not* executing within a regular page context.
 */
class AppleOverlayDeviceInterface extends _AppleDeviceInterface.AppleDeviceInterface {
  constructor() {
    super(...arguments);

    _defineProperty(this, "stripCredentials", false);

    _defineProperty(this, "overlay", (0, _overlayApi.overlayApi)(this));

    _defineProperty(this, "previousX", 0);

    _defineProperty(this, "previousY", 0);
  }

  /**
   * Because we're running inside the Overlay, we always create the HTML
   * Tooltip controller.
   *
   * @override
   * @returns {import("../UI/controllers/UIController.js").UIController}
   */
  createUIController() {
    return new _HTMLTooltipUIController.HTMLTooltipUIController({
      tooltipKind:
      /** @type {const} */
      'modern',
      device: this
    }, {
      wrapperClass: 'top-autofill',
      tooltipPositionClass: () => '.wrapper { transform: none; }',
      setSize: details => this.deviceApi.notify((0, _index.createNotification)('setSize', details)),
      remove: async () => this._closeAutofillParent(),
      testMode: this.isTestMode()
    });
  }

  addDeviceListeners() {
    /**
     * The native side will send a custom event 'mouseMove' to indicate
     * that the HTMLTooltip should fake an element being focused.
     *
     * Note: There's no cleanup required here since the Overlay has a fresh
     * page load every time it's opened.
     */
    window.addEventListener('mouseMove', event => {
      var _this$uiController, _this$uiController$ge;

      // Don't set focus if the mouse hasn't moved ever
      // This is to avoid clickjacking where an attacker puts the pulldown under the cursor
      // and tricks the user into clicking
      if (!this.previousX && !this.previousY || // if no previous coords
      this.previousX === event.detail.x && this.previousY === event.detail.y // or the mouse hasn't moved
      ) {
        this.previousX = event.detail.x;
        this.previousY = event.detail.y;
        return;
      }

      const activeTooltip = (_this$uiController = this.uiController) === null || _this$uiController === void 0 ? void 0 : (_this$uiController$ge = _this$uiController.getActiveTooltip) === null || _this$uiController$ge === void 0 ? void 0 : _this$uiController$ge.call(_this$uiController);
      activeTooltip === null || activeTooltip === void 0 ? void 0 : activeTooltip.focus(event.detail.x, event.detail.y);
      this.previousX = event.detail.x;
      this.previousY = event.detail.y;
    });
    return super.addDeviceListeners();
  }
  /**
   * Since we're running inside the Overlay we can limit what happens here to
   * be only things that are needed to power the HTML Tooltip
   *
   * @override
   * @returns {Promise<void>}
   */


  async setupAutofill() {
    await this._getAutofillInitData();
    await this.inContextSignup.init();
    const signedIn = await this._checkDeviceSignedIn();

    if (signedIn) {
      await this.getAddresses();
    }
  }

  async postInit() {
    // setup overlay API pieces
    this.overlay.showImmediately();
    super.postInit();
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


  async selectedDetail(data, type) {
    return this.overlay.selectedDetail(data, type);
  }

  async askToUnlockProvider() {
    const response = await this.deviceApi.request(new _deviceApiCalls.AskToUnlockProviderCall(null));
    this.providerStatusUpdated(response);
  }

  providerStatusUpdated(data) {
    var _this$uiController2;

    const {
      credentials,
      availableInputTypes
    } = (0, _index.validate)(data, _validatorsZod.providerStatusUpdatedSchema); // Update local settings and data

    this.settings.setAvailableInputTypes(availableInputTypes);
    this.storeLocalCredentials(credentials); // rerender the tooltip

    (_this$uiController2 = this.uiController) === null || _this$uiController2 === void 0 ? void 0 : _this$uiController2.updateItems(credentials);
  }

}

exports.AppleOverlayDeviceInterface = AppleOverlayDeviceInterface;

},{"../../packages/device-api/index.js":6,"../UI/controllers/HTMLTooltipUIController.js":49,"../deviceApiCalls/__generated__/deviceApiCalls.js":59,"../deviceApiCalls/__generated__/validators.zod.js":60,"./AppleDeviceInterface.js":16,"./overlayApi.js":23}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ExtensionInterface = void 0;

var _InterfacePrototype = _interopRequireDefault(require("./InterfacePrototype.js"));

var _autofillUtils = require("../autofill-utils.js");

var _HTMLTooltipUIController = require("../UI/controllers/HTMLTooltipUIController.js");

var _HTMLTooltip = require("../UI/HTMLTooltip.js");

var _InContextSignup = require("../InContextSignup.js");

var _matching = require("../Form/matching.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const TOOLTIP_TYPES = {
  EmailProtection: 'EmailProtection',
  EmailSignup: 'EmailSignup'
};

class ExtensionInterface extends _InterfacePrototype.default {
  constructor() {
    super(...arguments);

    _defineProperty(this, "inContextSignup", new _InContextSignup.InContextSignup(this));
  }

  /**
   * @override
   */
  createUIController() {
    /** @type {import('../UI/HTMLTooltip.js').HTMLTooltipOptions} */
    const htmlTooltipOptions = { ..._HTMLTooltip.defaultOptions,
      css: "<link rel=\"stylesheet\" href=\"".concat(chrome.runtime.getURL('public/css/autofill.css'), "\" crossOrigin=\"anonymous\">"),
      testMode: this.isTestMode(),
      hasCaret: true
    };
    const tooltipKinds = {
      [TOOLTIP_TYPES.EmailProtection]: 'legacy',
      [TOOLTIP_TYPES.EmailSignup]: 'emailsignup'
    };
    const tooltipKind = tooltipKinds[this.getActiveTooltipType()] || tooltipKinds[TOOLTIP_TYPES.EmailProtection];
    return new _HTMLTooltipUIController.HTMLTooltipUIController({
      tooltipKind,
      device: this
    }, htmlTooltipOptions);
  }

  getActiveTooltipType() {
    var _this$activeForm, _this$inContextSignup;

    if (this.hasLocalAddresses) {
      return TOOLTIP_TYPES.EmailProtection;
    }

    const inputType = (_this$activeForm = this.activeForm) !== null && _this$activeForm !== void 0 && _this$activeForm.activeInput ? (0, _matching.getInputSubtype)(this.activeForm.activeInput) : undefined;

    if ((_this$inContextSignup = this.inContextSignup) !== null && _this$inContextSignup !== void 0 && _this$inContextSignup.isAvailable(inputType)) {
      return TOOLTIP_TYPES.EmailSignup;
    }

    return null;
  }

  async resetAutofillUI(callback) {
    this.removeAutofillUIFromPage('Resetting autofill.');
    await this.setupAutofill();
    if (callback) await callback();
    this.uiController = this.createUIController();
    await this.postInit();
  }

  async isEnabled() {
    return new Promise(resolve => {
      var _chrome, _chrome$runtime;

      (_chrome = chrome) === null || _chrome === void 0 ? void 0 : (_chrome$runtime = _chrome.runtime) === null || _chrome$runtime === void 0 ? void 0 : _chrome$runtime.sendMessage({
        registeredTempAutofillContentScript: true,
        documentUrl: window.location.href
      }, response => {
        if (response && 'site' in response) {
          resolve((0, _autofillUtils.isAutofillEnabledFromProcessedConfig)(response));
        }
      });
    });
  }

  isDeviceSignedIn() {
    return this.hasLocalAddresses;
  }

  async setupAutofill() {
    /**
     * In the extension, we must resolve `inContextSignup` data as part of setup
     */
    await this.inContextSignup.init();
    return this.getAddresses();
  }

  postInit() {
    switch (this.getActiveTooltipType()) {
      case TOOLTIP_TYPES.EmailProtection:
        {
          var _this$activeForm2;

          this._scannerCleanup = this.scanner.init();
          this.addLogoutListener(() => {
            this.resetAutofillUI();

            if (this.globalConfig.isDDGDomain) {
              (0, _autofillUtils.notifyWebApp)({
                deviceSignedIn: {
                  value: false
                }
              });
            }
          });

          if ((_this$activeForm2 = this.activeForm) !== null && _this$activeForm2 !== void 0 && _this$activeForm2.activeInput) {
            var _this$activeForm3;

            this.attachTooltip({
              form: this.activeForm,
              input: (_this$activeForm3 = this.activeForm) === null || _this$activeForm3 === void 0 ? void 0 : _this$activeForm3.activeInput,
              click: null,
              trigger: 'postSignup',
              triggerMetaData: {
                type: 'transactional'
              }
            });
          }

          break;
        }

      case TOOLTIP_TYPES.EmailSignup:
        {
          this._scannerCleanup = this.scanner.init();
          break;
        }

      default:
        {
          // Don't do anyhing if we don't have a tooltip to show
          break;
        }
    }
  }

  getAddresses() {
    return new Promise(resolve => chrome.runtime.sendMessage({
      getAddresses: true
    }, data => {
      this.storeLocalAddresses(data);
      return resolve(data);
    }));
  }
  /**
   * Used by the email web app
   * Settings page displays data of the logged in user data
   */


  getUserData() {
    return new Promise(resolve => chrome.runtime.sendMessage({
      getUserData: true
    }, data => resolve(data)));
  }
  /**
   * Used by the email web app
   * Device capabilities determine which functionality is available to the user
   */


  getEmailProtectionCapabilities() {
    return new Promise(resolve => chrome.runtime.sendMessage({
      getEmailProtectionCapabilities: true
    }, data => resolve(data)));
  }

  refreshAlias() {
    return chrome.runtime.sendMessage({
      refreshAlias: true
    }, addresses => this.storeLocalAddresses(addresses));
  }

  async trySigningIn() {
    if (this.globalConfig.isDDGDomain) {
      const data = await (0, _autofillUtils.sendAndWaitForAnswer)(_autofillUtils.SIGN_IN_MSG, 'addUserData');
      this.storeUserData(data);
    }
  }
  /**
   * @param {object} message
   * @param {object} message.addUserData
   * @param {string} message.addUserData.token
   * @param {string} message.addUserData.userName
   * @param {string} message.addUserData.cohort
   */


  storeUserData(message) {
    return chrome.runtime.sendMessage(message);
  }
  /**
   * Used by the email web app
   * Provides functionality to log the user out
   */


  removeUserData() {
    return chrome.runtime.sendMessage({
      removeUserData: true
    });
  }

  addDeviceListeners() {
    // Add contextual menu listeners
    let activeEl = null;
    document.addEventListener('contextmenu', e => {
      activeEl = e.target;
    });
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (sender.id !== chrome.runtime.id) return;

      switch (message.type) {
        case 'ddgUserReady':
          this.resetAutofillUI(() => this.setupSettingsPage({
            shouldLog: true
          }));
          break;

        case 'contextualAutofill':
          (0, _autofillUtils.setValue)(activeEl, (0, _autofillUtils.formatDuckAddress)(message.alias), this.globalConfig);
          activeEl.classList.add('ddg-autofilled');
          this.refreshAlias(); // If the user changes the alias, remove the decoration

          activeEl.addEventListener('input', e => e.target.classList.remove('ddg-autofilled'), {
            once: true
          });
          break;

        default:
          break;
      }
    });
  }

  addLogoutListener(handler) {
    // Make sure there's only one log out listener attached by removing the
    // previous logout listener first, if it exists.
    if (this._logoutListenerHandler) {
      chrome.runtime.onMessage.removeListener(this._logoutListenerHandler);
    } // Cleanup on logout events


    this._logoutListenerHandler = (message, sender) => {
      if (sender.id === chrome.runtime.id && message.type === 'logout') {
        handler();
      }
    };

    chrome.runtime.onMessage.addListener(this._logoutListenerHandler);
  }

}

exports.ExtensionInterface = ExtensionInterface;

},{"../Form/matching.js":35,"../InContextSignup.js":38,"../UI/HTMLTooltip.js":48,"../UI/controllers/HTMLTooltipUIController.js":49,"../autofill-utils.js":55,"./InterfacePrototype.js":19}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _autofillUtils = require("../autofill-utils.js");

var _matching = require("../Form/matching.js");

var _formatters = require("../Form/formatters.js");

var _Credentials = require("../InputTypes/Credentials.js");

var _PasswordGenerator = require("../PasswordGenerator.js");

var _Scanner = require("../Scanner.js");

var _config = require("../config.js");

var _NativeUIController = require("../UI/controllers/NativeUIController.js");

var _transports = require("../deviceApiCalls/transports/transports.js");

var _Settings = require("../Settings.js");

var _index = require("../../packages/device-api/index.js");

var _deviceApiCalls = require("../deviceApiCalls/__generated__/deviceApiCalls.js");

var _initFormSubmissionsApi = require("./initFormSubmissionsApi.js");

var _validatorsZod = require("../deviceApiCalls/__generated__/validators.zod.js");

var _EmailProtection = require("../EmailProtection.js");

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }

function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

var _addresses = /*#__PURE__*/new WeakMap();

var _data2 = /*#__PURE__*/new WeakMap();

/**
 * @typedef {import('../deviceApiCalls/__generated__/validators-ts').StoreFormData} StoreFormData
 */

/**
 * @implements {GlobalConfigImpl}
 * @implements {FormExtensionPoints}
 * @implements {DeviceExtensionPoints}
 */
class InterfacePrototype {
  /** @type {import("../Form/Form").Form | null} */

  /** @type {import("../UI/HTMLTooltip.js").default | null} */

  /** @type {number} */

  /** @type {PasswordGenerator} */

  /** @type {import("../InContextSignup.js").InContextSignup | null} */

  /** @type {{privateAddress: string, personalAddress: string}} */

  /** @type {GlobalConfig} */

  /** @type {import('../Scanner').Scanner} */

  /** @type {import("../UI/controllers/UIController.js").UIController | null} */

  /** @type {import("../../packages/device-api").DeviceApi} */

  /** @type {boolean} */

  /** @type {((reason, ...rest) => void) | null} */

  /**
   * @param {GlobalConfig} config
   * @param {import("../../packages/device-api").DeviceApi} deviceApi
   * @param {Settings} settings
   */
  constructor(config, deviceApi, settings) {
    _defineProperty(this, "attempts", 0);

    _defineProperty(this, "activeForm", null);

    _defineProperty(this, "currentTooltip", null);

    _defineProperty(this, "initialSetupDelayMs", 0);

    _defineProperty(this, "autopromptFired", false);

    _defineProperty(this, "passwordGenerator", new _PasswordGenerator.PasswordGenerator());

    _defineProperty(this, "emailProtection", new _EmailProtection.EmailProtection(this));

    _defineProperty(this, "inContextSignup", null);

    _classPrivateFieldInitSpec(this, _addresses, {
      writable: true,
      value: {
        privateAddress: '',
        personalAddress: ''
      }
    });

    _defineProperty(this, "globalConfig", void 0);

    _defineProperty(this, "scanner", void 0);

    _defineProperty(this, "uiController", void 0);

    _defineProperty(this, "deviceApi", void 0);

    _defineProperty(this, "isInitializationStarted", void 0);

    _defineProperty(this, "_scannerCleanup", null);

    _classPrivateFieldInitSpec(this, _data2, {
      writable: true,
      value: {
        credentials: [],
        creditCards: [],
        identities: [],
        topContextData: undefined
      }
    });

    this.globalConfig = config;
    this.deviceApi = deviceApi;
    this.settings = settings;
    this.uiController = null;
    this.scanner = (0, _Scanner.createScanner)(this, {
      initialDelay: this.initialSetupDelayMs
    });
    this.isInitializationStarted = false;
  }
  /**
   * Implementors should override this with a UI controller that suits
   * their platform.
   *
   * @returns {import("../UI/controllers/UIController.js").UIController}
   */


  createUIController() {
    return new _NativeUIController.NativeUIController();
  }
  /**
   * @param {string} reason
   */


  removeAutofillUIFromPage(reason) {
    var _this$uiController, _this$_scannerCleanup;

    (_this$uiController = this.uiController) === null || _this$uiController === void 0 ? void 0 : _this$uiController.destroy();
    (_this$_scannerCleanup = this._scannerCleanup) === null || _this$_scannerCleanup === void 0 ? void 0 : _this$_scannerCleanup.call(this, reason);
  }

  get hasLocalAddresses() {
    var _classPrivateFieldGet2, _classPrivateFieldGet3;

    return !!((_classPrivateFieldGet2 = _classPrivateFieldGet(this, _addresses)) !== null && _classPrivateFieldGet2 !== void 0 && _classPrivateFieldGet2.privateAddress && (_classPrivateFieldGet3 = _classPrivateFieldGet(this, _addresses)) !== null && _classPrivateFieldGet3 !== void 0 && _classPrivateFieldGet3.personalAddress);
  }

  getLocalAddresses() {
    return _classPrivateFieldGet(this, _addresses);
  }

  storeLocalAddresses(addresses) {
    _classPrivateFieldSet(this, _addresses, addresses); // When we get new duck addresses, add them to the identities list


    const identities = this.getLocalIdentities();
    const privateAddressIdentity = identities.find(_ref => {
      let {
        id
      } = _ref;
      return id === 'privateAddress';
    }); // If we had previously stored them, just update the private address

    if (privateAddressIdentity) {
      privateAddressIdentity.emailAddress = (0, _autofillUtils.formatDuckAddress)(addresses.privateAddress);
    } else {
      // Otherwise, add both addresses
      _classPrivateFieldGet(this, _data2).identities = this.addDuckAddressesToIdentities(identities);
    }
  }
  /** @type { PMData } */


  /**
   * @returns {import('../Form/matching').SupportedTypes}
   */
  getCurrentInputType() {
    throw new Error('Not implemented');
  }

  addDuckAddressesToIdentities(identities) {
    if (!this.hasLocalAddresses) return identities;
    const newIdentities = [];
    let {
      privateAddress,
      personalAddress
    } = this.getLocalAddresses();
    privateAddress = (0, _autofillUtils.formatDuckAddress)(privateAddress);
    personalAddress = (0, _autofillUtils.formatDuckAddress)(personalAddress); // Get the duck addresses in identities

    const duckEmailsInIdentities = identities.reduce((duckEmails, _ref2) => {
      let {
        emailAddress: email
      } = _ref2;
      return email !== null && email !== void 0 && email.includes(_autofillUtils.ADDRESS_DOMAIN) ? duckEmails.concat(email) : duckEmails;
    }, []); // Only add the personal duck address to identities if the user hasn't
    // already manually added it

    if (!duckEmailsInIdentities.includes(personalAddress)) {
      newIdentities.push({
        id: 'personalAddress',
        emailAddress: personalAddress,
        title: 'Block email trackers'
      });
    }

    newIdentities.push({
      id: 'privateAddress',
      emailAddress: privateAddress,
      title: 'Block email trackers & hide address'
    });
    return [...identities, ...newIdentities];
  }
  /**
   * Stores init data coming from the tooltipHandler
   * @param { InboundPMData } data
   */


  storeLocalData(data) {
    this.storeLocalCredentials(data.credentials);
    data.creditCards.forEach(cc => delete cc.cardNumber && delete cc.cardSecurityCode); // Store the full name as a separate field to simplify autocomplete

    const updatedIdentities = data.identities.map(identity => ({ ...identity,
      fullName: (0, _formatters.formatFullName)(identity)
    })); // Add addresses

    _classPrivateFieldGet(this, _data2).identities = this.addDuckAddressesToIdentities(updatedIdentities);
    _classPrivateFieldGet(this, _data2).creditCards = data.creditCards; // Top autofill only

    if (data.serializedInputContext) {
      try {
        _classPrivateFieldGet(this, _data2).topContextData = JSON.parse(data.serializedInputContext);
      } catch (e) {
        console.error(e);
        this.removeTooltip();
      }
    }
  }
  /**
   * Stores credentials locally
   * @param {CredentialsObject[]} credentials
   */


  storeLocalCredentials(credentials) {
    credentials.forEach(cred => delete cred.password);
    _classPrivateFieldGet(this, _data2).credentials = credentials;
  }

  getTopContextData() {
    return _classPrivateFieldGet(this, _data2).topContextData;
  }
  /**
   * @deprecated use `availableInputTypes.credentials` directly instead
   * @returns {boolean}
   */


  get hasLocalCredentials() {
    return _classPrivateFieldGet(this, _data2).credentials.length > 0;
  }

  getLocalCredentials() {
    return _classPrivateFieldGet(this, _data2).credentials.map(cred => {
      const {
        password,
        ...rest
      } = cred;
      return rest;
    });
  }
  /**
   * @deprecated use `availableInputTypes.identities` directly instead
   * @returns {boolean}
   */


  get hasLocalIdentities() {
    return _classPrivateFieldGet(this, _data2).identities.length > 0;
  }

  getLocalIdentities() {
    return _classPrivateFieldGet(this, _data2).identities;
  }
  /**
   * @deprecated use `availableInputTypes.creditCards` directly instead
   * @returns {boolean}
   */


  get hasLocalCreditCards() {
    return _classPrivateFieldGet(this, _data2).creditCards.length > 0;
  }
  /** @return {CreditCardObject[]} */


  getLocalCreditCards() {
    return _classPrivateFieldGet(this, _data2).creditCards;
  }

  async startInit() {
    if (this.isInitializationStarted) return;
    this.alreadyInitialized = true;
    await this.refreshSettings();
    this.addDeviceListeners();
    await this.setupAutofill();
    this.uiController = this.createUIController(); // this is the temporary measure to support windows whilst we still have 'setupAutofill'
    // eventually all interfaces will use this

    if (!this.isEnabledViaSettings()) {
      return;
    }

    await this.setupSettingsPage();
    await this.postInit();

    if (this.settings.featureToggles.credentials_saving) {
      (0, _initFormSubmissionsApi.initFormSubmissionsApi)(this.scanner.forms, this.scanner.matching);
    }
  }
  /**
   * This is to aid the migration to all platforms using Settings.enabled.
   *
   * For now, Windows is the only platform that can be 'enabled' or 'disabled' via
   * the new Settings - which is why in that interface it has `return this.settings.enabled`
   *
   * Whilst we wait for other platforms to catch up, we offer this default implementation
   * of just returning true.
   *
   * @returns {boolean}
   */


  isEnabledViaSettings() {
    return true;
  }
  /**
   * This is a fall-back situation for macOS since it was the only
   * platform to support anything none-email based in the past.
   *
   * Once macOS fully supports 'getAvailableInputTypes' this can be removed
   *
   * @returns {Promise<void>}
   */


  async refreshSettings() {
    await this.settings.refresh();
  }

  async isEnabled() {
    return (0, _autofillUtils.autofillEnabled)(this.globalConfig);
  }

  async init() {
    const isEnabled = await this.isEnabled();
    if (!isEnabled) return;

    const handler = async () => {
      if (document.readyState === 'complete') {
        window.removeEventListener('load', handler);
        document.removeEventListener('readystatechange', handler);
        await this.startInit();
      }
    };

    if (document.readyState === 'complete') {
      await this.startInit();
    } else {
      window.addEventListener('load', handler);
      document.addEventListener('readystatechange', handler);
    }
  }

  postInit() {
    const cleanup = this.scanner.init();
    this.addLogoutListener(() => {
      cleanup('Logged out');

      if (this.globalConfig.isDDGDomain) {
        (0, _autofillUtils.notifyWebApp)({
          deviceSignedIn: {
            value: false
          }
        });
      }
    });
  }
  /**
   * @deprecated This was a port from the macOS implementation so the API may not be suitable for all
   * @returns {Promise<any>}
   */


  async getSelectedCredentials() {
    throw new Error('`getSelectedCredentials` not implemented');
  }

  isTestMode() {
    return this.globalConfig.isDDGTestMode;
  }
  /**
   * This indicates an item was selected on Desktop, and we should try to autofill
   *
   * Note: When we're in a top-frame scenario, like on like macOS & Windows in the webview,
   * this method gets overridden {@see WindowsOverlayDeviceInterface} {@see AppleOverlayDeviceInterface}
   *
   * @param {IdentityObject|CreditCardObject|CredentialsObject|{email:string, id: string}} data
   * @param {string} type
   */


  async selectedDetail(data, type) {
    const form = this.activeForm;

    if (!form) {
      return;
    } // are we autofilling email?


    if (type === 'email' && 'email' in data) {
      form.autofillEmail(data.email);
    } else {
      form.autofillData(data, type);
    }

    const isPrivateAddress = data.id === 'privateAddress';
    /**
     * This is desktop only: was  it a private address? if so, save it with
     * the trigger 'emailProtection' so that native sides can use it
     */

    if (isPrivateAddress) {
      this.refreshAlias();

      if ('emailAddress' in data && data.emailAddress) {
        this.emailProtection.storeReceived(data.emailAddress);
        /** @type {DataStorageObject} */

        const formValues = {
          credentials: {
            username: data.emailAddress,
            autogenerated: true
          }
        };
        this.storeFormData(formValues, 'emailProtection');
      }
    }

    await this.removeTooltip();
  }
  /**
   * Before the DataWebTooltip opens, we collect the data based on the config.type
   * @param {InputTypeConfigs} config
   * @param {import('../Form/matching').SupportedTypes} inputType
   * @param {TopContextData} [data]
   * @returns {(CredentialsObject|CreditCardObject|IdentityObject)[]}
   */


  dataForAutofill(config, inputType, data) {
    const subtype = (0, _matching.getSubtypeFromType)(inputType);

    if (config.type === 'identities') {
      return this.getLocalIdentities().filter(identity => !!identity[subtype]);
    }

    if (config.type === 'creditCards') {
      return this.getLocalCreditCards();
    }

    if (config.type === 'credentials') {
      if (data) {
        if (Array.isArray(data.credentials) && data.credentials.length > 0) {
          return data.credentials;
        } else {
          return this.getLocalCredentials().filter(cred => !!cred[subtype] || subtype === 'password' || cred.id === _Credentials.PROVIDER_LOCKED);
        }
      }
    }

    return [];
  }
  /**
   * @param {object} params
   * @param {import("../Form/Form").Form} params.form
   * @param {HTMLInputElement} params.input
   * @param {{ x: number; y: number; } | null} params.click
   * @param {import('../deviceApiCalls/__generated__/validators-ts').GetAutofillDataRequest['trigger']} params.trigger
   * @param {import('../UI/controllers/UIController.js').AttachArgs["triggerMetaData"]} params.triggerMetaData
   */


  attachTooltip(params) {
    var _this$uiController2;

    const {
      form,
      input,
      click,
      trigger
    } = params; // Avoid flashing tooltip from background tabs on macOS

    if (document.visibilityState !== 'visible' && trigger !== 'postSignup') return; // Only autoprompt on mobile devices

    if (trigger === 'autoprompt' && !this.globalConfig.isMobileApp) return; // Only fire autoprompt once

    if (trigger === 'autoprompt' && this.autopromptFired) return;
    form.activeInput = input;
    this.activeForm = form;
    const inputType = (0, _matching.getInputType)(input);
    /** @type {PosFn} */

    const getPosition = () => {
      // In extensions, the tooltip is centered on the Dax icon
      const alignLeft = this.globalConfig.isApp || this.globalConfig.isWindows;
      return alignLeft ? input.getBoundingClientRect() : (0, _autofillUtils.getDaxBoundingBox)(input);
    }; // todo: this will be migrated to use NativeUIController soon


    if (this.globalConfig.isMobileApp && inputType === 'identities.emailAddress') {
      this.getAlias().then(alias => {
        if (alias) {
          form.autofillEmail(alias);
          /**
           * We're on mobile here, so we just record the email received.
           * Then later in the form submission we can compare the values
           */

          this.emailProtection.storeReceived(alias);
        } else {
          var _form$activeInput;

          (_form$activeInput = form.activeInput) === null || _form$activeInput === void 0 ? void 0 : _form$activeInput.focus();
        } // Update data from native-side in case the `getAlias` call
        // has included a successful in-context signup


        this.updateForStateChange();
        this.onFinishedAutofill();
      });
      return;
    }
    /** @type {TopContextData} */


    const topContextData = {
      inputType
    }; // Allow features to append/change top context data
    // for example, generated passwords may get appended here

    const processedTopContext = this.preAttachTooltip(topContextData, input, form);
    (_this$uiController2 = this.uiController) === null || _this$uiController2 === void 0 ? void 0 : _this$uiController2.attach({
      input,
      form,
      click,
      getPosition,
      topContextData: processedTopContext,
      device: this,
      trigger,
      triggerMetaData: params.triggerMetaData
    });

    if (trigger === 'autoprompt') {
      this.autopromptFired = true;
    }
  }
  /**
   * When an item was selected, we then call back to the device
   * to fetch the full suite of data needed to complete the autofill
   *
   * @param {import('../Form/matching').SupportedTypes} inputType
   * @param {(CreditCardObject|IdentityObject|CredentialsObject)[]} items
   * @param {CreditCardObject['id']|IdentityObject['id']|CredentialsObject['id']} id
   */


  onSelect(inputType, items, id) {
    id = String(id);
    const mainType = (0, _matching.getMainTypeFromType)(inputType);
    const subtype = (0, _matching.getSubtypeFromType)(inputType);

    if (id === _Credentials.PROVIDER_LOCKED) {
      return this.askToUnlockProvider();
    }

    const matchingData = items.find(item => String(item.id) === id);
    if (!matchingData) throw new Error('unreachable (fatal)');

    const dataPromise = (() => {
      switch (mainType) {
        case 'creditCards':
          return this.getAutofillCreditCard(id);

        case 'identities':
          return this.getAutofillIdentity(id);

        case 'credentials':
          {
            if (_Credentials.AUTOGENERATED_KEY in matchingData) {
              const autogeneratedPayload = { ...matchingData,
                username: ''
              };
              return Promise.resolve({
                success: autogeneratedPayload
              });
            }

            return this.getAutofillCredentials(id);
          }

        default:
          throw new Error('unreachable!');
      }
    })(); // wait for the data back from the device


    dataPromise.then(response => {
      if (response) {
        const data = response.success || response;

        if (mainType === 'identities') {
          this.firePixel({
            pixelName: 'autofill_identity',
            params: {
              fieldType: subtype
            }
          });

          switch (id) {
            case 'personalAddress':
              this.firePixel({
                pixelName: 'autofill_personal_address'
              });
              break;

            case 'privateAddress':
              this.firePixel({
                pixelName: 'autofill_private_address'
              });
              break;

            default:
              // Also fire pixel when filling an identity with the personal duck address from an email field
              const checks = [subtype === 'emailAddress', this.hasLocalAddresses, (data === null || data === void 0 ? void 0 : data.emailAddress) === (0, _autofillUtils.formatDuckAddress)(_classPrivateFieldGet(this, _addresses).personalAddress)];

              if (checks.every(Boolean)) {
                this.firePixel({
                  pixelName: 'autofill_personal_address'
                });
              }

              break;
          }
        } // some platforms do not include a `success` object, why?


        return this.selectedDetail(data, mainType);
      } else {
        return Promise.reject(new Error('none-success response'));
      }
    }).catch(e => {
      console.error(e);
      return this.removeTooltip();
    });
  }

  async askToUnlockProvider() {
    const response = await this.deviceApi.request(new _deviceApiCalls.AskToUnlockProviderCall(null));
    this.providerStatusUpdated(response);
  }

  isTooltipActive() {
    var _this$uiController$is, _this$uiController3, _this$uiController3$i;

    return (_this$uiController$is = (_this$uiController3 = this.uiController) === null || _this$uiController3 === void 0 ? void 0 : (_this$uiController3$i = _this$uiController3.isActive) === null || _this$uiController3$i === void 0 ? void 0 : _this$uiController3$i.call(_this$uiController3)) !== null && _this$uiController$is !== void 0 ? _this$uiController$is : false;
  }

  removeTooltip() {
    var _this$uiController4, _this$uiController4$r;

    return (_this$uiController4 = this.uiController) === null || _this$uiController4 === void 0 ? void 0 : (_this$uiController4$r = _this$uiController4.removeTooltip) === null || _this$uiController4$r === void 0 ? void 0 : _this$uiController4$r.call(_this$uiController4, 'interface');
  }

  onFinishedAutofill() {
    var _this$activeForm, _this$activeForm$acti;

    // Let input handlers know we've stopped autofilling
    (_this$activeForm = this.activeForm) === null || _this$activeForm === void 0 ? void 0 : (_this$activeForm$acti = _this$activeForm.activeInput) === null || _this$activeForm$acti === void 0 ? void 0 : _this$activeForm$acti.dispatchEvent(new Event('mouseleave'));
  }

  async updateForStateChange() {
    var _this$activeForm2, _this$activeForm3;

    // Remove decorations before refreshing data to make sure we
    // remove the currently set icons
    (_this$activeForm2 = this.activeForm) === null || _this$activeForm2 === void 0 ? void 0 : _this$activeForm2.removeAllDecorations(); // Update for any state that may have changed

    await this.refreshData(); // Add correct icons and behaviour

    (_this$activeForm3 = this.activeForm) === null || _this$activeForm3 === void 0 ? void 0 : _this$activeForm3.recategorizeAllInputs();
  }

  async refreshData() {
    var _this$inContextSignup;

    await ((_this$inContextSignup = this.inContextSignup) === null || _this$inContextSignup === void 0 ? void 0 : _this$inContextSignup.refreshData());
    await this.settings.populateData();
  }

  async setupSettingsPage() {
    let {
      shouldLog
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      shouldLog: false
    };

    if (!this.globalConfig.isDDGDomain) {
      return;
    }

    (0, _autofillUtils.notifyWebApp)({
      isApp: this.globalConfig.isApp
    });

    if (this.isDeviceSignedIn()) {
      let userData;

      try {
        userData = await this.getUserData();
      } catch (e) {}

      let capabilities;

      try {
        capabilities = await this.getEmailProtectionCapabilities();
      } catch (e) {} // Set up listener for web app actions


      if (this.globalConfig.isDDGDomain) {
        window.addEventListener('message', e => {
          if (e.data.removeUserData) {
            this.removeUserData();
          }

          if (e.data.closeEmailProtection) {
            this.closeEmailProtection();
          }
        });
      }

      const hasUserData = userData && !userData.error && Object.entries(userData).length > 0;
      (0, _autofillUtils.notifyWebApp)({
        deviceSignedIn: {
          value: true,
          shouldLog,
          userData: hasUserData ? userData : undefined,
          capabilities
        }
      });
    } else {
      this.trySigningIn();
    }
  }

  async setupAutofill() {}
  /** @returns {Promise<EmailAddresses>} */


  async getAddresses() {
    throw new Error('unimplemented');
  }
  /** @returns {Promise<null|Record<any,any>>} */


  getUserData() {
    return Promise.resolve(null);
  }
  /** @returns {void} */


  removeUserData() {}
  /** @returns {void} */


  closeEmailProtection() {}
  /** @returns {Promise<null|Record<string,boolean>>} */


  getEmailProtectionCapabilities() {
    throw new Error('unimplemented');
  }

  refreshAlias() {}

  async trySigningIn() {
    if (this.globalConfig.isDDGDomain) {
      if (this.attempts < 10) {
        this.attempts++;
        const data = await (0, _autofillUtils.sendAndWaitForAnswer)(_autofillUtils.SIGN_IN_MSG, 'addUserData'); // This call doesn't send a response, so we can't know if it succeeded

        this.storeUserData(data);
        await this.setupAutofill();
        await this.refreshSettings();
        await this.setupSettingsPage({
          shouldLog: true
        });
        await this.postInit();
      } else {
        console.warn('max attempts reached, bailing');
      }
    }
  }

  storeUserData(_data) {}

  addDeviceListeners() {}
  /**
   * Called by the native layer on all tabs when the provider status is updated
   * @param {import("../deviceApiCalls/__generated__/validators-ts").ProviderStatusUpdated} data
   */


  providerStatusUpdated(data) {
    try {
      var _this$uiController5, _availableInputTypes$;

      const {
        credentials,
        availableInputTypes
      } = (0, _index.validate)(data, _validatorsZod.providerStatusUpdatedSchema); // Update local settings and data

      this.settings.setAvailableInputTypes(availableInputTypes);
      this.storeLocalCredentials(credentials); // rerender the tooltip

      (_this$uiController5 = this.uiController) === null || _this$uiController5 === void 0 ? void 0 : _this$uiController5.updateItems(credentials); // If the tooltip is open on an autofill type that's not available, close it

      const currentInputSubtype = (0, _matching.getSubtypeFromType)(this.getCurrentInputType());

      if (!((_availableInputTypes$ = availableInputTypes.credentials) !== null && _availableInputTypes$ !== void 0 && _availableInputTypes$[currentInputSubtype])) {
        this.removeTooltip();
      } // Redecorate fields according to the new types


      this.scanner.forms.forEach(form => form.recategorizeAllInputs());
    } catch (e) {
      if (this.globalConfig.isDDGTestMode) {
        console.log('isDDGTestMode: providerStatusUpdated error: ❌', e);
      }
    }
  }
  /** @param {() => void} _fn */


  addLogoutListener(_fn) {}

  isDeviceSignedIn() {
    return false;
  }
  /**
   * @returns {Promise<string|undefined>}
   */


  async getAlias() {
    return undefined;
  } // PM endpoints


  getAccounts() {}
  /**
   * Gets credentials ready for autofill
   * @param {CredentialsObject['id']} id - the credential id
   * @returns {Promise<CredentialsObject|{success:CredentialsObject}>}
   */


  async getAutofillCredentials(id) {
    return this.deviceApi.request(new _deviceApiCalls.GetAutofillCredentialsCall({
      id: String(id)
    }));
  }
  /** @returns {APIResponse<CreditCardObject>} */


  async getAutofillCreditCard(_id) {
    throw new Error('getAutofillCreditCard unimplemented');
  }
  /** @returns {Promise<{success: IdentityObject|undefined}>} */


  async getAutofillIdentity(_id) {
    throw new Error('getAutofillIdentity unimplemented');
  }

  openManagePasswords() {}

  openManageCreditCards() {}

  openManageIdentities() {}
  /**
   * @param {StoreFormData} values
   * @param {StoreFormData['trigger']} trigger
   */


  storeFormData(values, trigger) {
    this.deviceApi.notify(new _deviceApiCalls.StoreFormDataCall({ ...values,
      trigger
    }));
  }
  /**
   * `preAttachTooltip` happens just before a tooltip is show - features may want to append some data
   * at this point.
   *
   * For example, if password generation is enabled, this will generate
   * a password and send it to the tooltip as though it were a stored credential.
   *
   * @param {TopContextData} topContextData
   * @param {HTMLInputElement} input
   * @param {import("../Form/Form").Form} form
   */


  preAttachTooltip(topContextData, input, form) {
    // A list of checks to determine if we need to generate a password
    const checks = [topContextData.inputType === 'credentials.password', this.settings.featureToggles.password_generation, form.isSignup]; // if all checks pass, generate and save a password

    if (checks.every(Boolean)) {
      var _rawValues$credential, _rawValues$identities;

      const password = this.passwordGenerator.generate({
        input: input.getAttribute('passwordrules'),
        domain: window.location.hostname
      });
      const rawValues = form.getRawValues();
      const username = ((_rawValues$credential = rawValues.credentials) === null || _rawValues$credential === void 0 ? void 0 : _rawValues$credential.username) || ((_rawValues$identities = rawValues.identities) === null || _rawValues$identities === void 0 ? void 0 : _rawValues$identities.emailAddress) || ''; // append the new credential to the topContextData so that the top autofill can display it

      topContextData.credentials = [(0, _Credentials.fromPassword)(password, username)];
    }

    return topContextData;
  }
  /**
   * `postAutofill` gives features an opportunity to perform an action directly
   * following an autofill.
   *
   * For example, if a generated password was used, we want to fire a save event.
   *
   * @param {IdentityObject|CreditCardObject|CredentialsObject} data
   * @param {SupportedMainTypes} dataType
   * @param {import("../Form/Form").Form} formObj
   */


  postAutofill(data, dataType, formObj) {
    // If there's an autogenerated password, prompt to save
    if (_Credentials.AUTOGENERATED_KEY in data && 'password' in data && // Don't send message on Android to avoid potential abuse. Data is saved on native confirmation instead.
    !this.globalConfig.isAndroid) {
      var _formValues$credentia;

      const formValues = formObj.getValuesReadyForStorage();

      if (((_formValues$credentia = formValues.credentials) === null || _formValues$credentia === void 0 ? void 0 : _formValues$credentia.password) === data.password) {
        /** @type {StoreFormData} */
        const formData = (0, _Credentials.appendGeneratedKey)(formValues, {
          password: data.password
        });
        this.storeFormData(formData, 'passwordGeneration');
      }
    }

    if (dataType === 'credentials' && formObj.shouldAutoSubmit) {
      formObj.attemptSubmissionIfNeeded();
    }
  }
  /**
   * `postSubmit` gives features a one-time-only opportunity to perform an
   * action directly after a form submission was observed.
   *
   * Mostly this is about storing data from the form submission, but it can
   * also be used like in the case of Password generation, to append additional
   * data before it's sent to be saved.
   *
   * @param {DataStorageObject} values
   * @param {import("../Form/Form").Form} form
   */


  postSubmit(values, form) {
    if (!form.form) return;
    if (!form.hasValues(values)) return;
    const checks = [form.shouldPromptToStoreData, this.passwordGenerator.generated];

    if (checks.some(Boolean)) {
      const formData = (0, _Credentials.appendGeneratedKey)(values, {
        password: this.passwordGenerator.password,
        username: this.emailProtection.lastGenerated
      });
      this.storeFormData(formData, 'formSubmission');
    }
  }
  /**
   * Sends a pixel to be fired on the client side
   * @param {import('../deviceApiCalls/__generated__/validators-ts').SendJSPixelParams} pixelParams
   */


  firePixel(pixelParams) {
    this.deviceApi.notify(new _deviceApiCalls.SendJSPixelCall(pixelParams));
  }
  /**
   * This serves as a single place to create a default instance
   * of InterfacePrototype that can be useful in testing scenarios
   * @returns {InterfacePrototype}
   */


  static default() {
    const globalConfig = (0, _config.createGlobalConfig)();
    const transport = (0, _transports.createTransport)(globalConfig);
    const deviceApi = new _index.DeviceApi(transport);

    const settings = _Settings.Settings.default(globalConfig, deviceApi);

    return new InterfacePrototype(globalConfig, deviceApi, settings);
  }

}

var _default = InterfacePrototype;
exports.default = _default;

},{"../../packages/device-api/index.js":6,"../EmailProtection.js":24,"../Form/formatters.js":28,"../Form/matching.js":35,"../InputTypes/Credentials.js":39,"../PasswordGenerator.js":42,"../Scanner.js":43,"../Settings.js":44,"../UI/controllers/NativeUIController.js":50,"../autofill-utils.js":55,"../config.js":57,"../deviceApiCalls/__generated__/deviceApiCalls.js":59,"../deviceApiCalls/__generated__/validators.zod.js":60,"../deviceApiCalls/transports/transports.js":65,"./initFormSubmissionsApi.js":22}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WindowsInterface = void 0;

var _InterfacePrototype = _interopRequireDefault(require("./InterfacePrototype.js"));

var _OverlayUIController = require("../UI/controllers/OverlayUIController.js");

var _deviceApiCalls = require("../deviceApiCalls/__generated__/deviceApiCalls.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @typedef {import('../deviceApiCalls/__generated__/validators-ts').GetAutofillDataRequest} GetAutofillDataRequest
 */
const EMAIL_PROTECTION_LOGOUT_MESSAGE = 'EMAIL_PROTECTION_LOGOUT';

class WindowsInterface extends _InterfacePrototype.default {
  constructor() {
    super(...arguments);

    _defineProperty(this, "ready", false);

    _defineProperty(this, "_abortController", null);
  }

  /**
   * @deprecated This runs too early, and will be removed eventually.
   * @returns {Promise<boolean>}
   */
  async isEnabled() {
    return true;
  }

  async setupAutofill() {
    const loggedIn = await this._getIsLoggedIn();

    if (loggedIn) {
      await this.getAddresses();
    }
  }

  isEnabledViaSettings() {
    return Boolean(this.settings.enabled);
  }

  postInit() {
    super.postInit();
    this.ready = true;
  }

  createUIController() {
    /**
     * If we get here, we're just a controller for an overlay
     */
    return new _OverlayUIController.OverlayUIController({
      remove: async () => this._closeAutofillParent(),
      show: async details => this._show(details)
    });
  }
  /**
   * @param {GetAutofillDataRequest} details
   */


  async _show(details) {
    const {
      mainType
    } = details; // prevent overlapping listeners

    if (this._abortController && !this._abortController.signal.aborted) {
      this._abortController.abort();
    }

    this._abortController = new AbortController();
    this.deviceApi.request(new _deviceApiCalls.GetAutofillDataCall(details), {
      signal: this._abortController.signal
    }).then(resp => {
      if (!this.activeForm) {
        throw new Error('this.currentAttached was absent');
      }

      switch (resp.action) {
        case 'fill':
          {
            if (mainType in resp) {
              var _this$activeForm;

              (_this$activeForm = this.activeForm) === null || _this$activeForm === void 0 ? void 0 : _this$activeForm.autofillData(resp[mainType], mainType);
            } else {
              throw new Error("action: \"fill\" cannot occur because \"".concat(mainType, "\" was missing"));
            }

            break;
          }

        case 'focus':
          {
            var _this$activeForm2, _this$activeForm2$act;

            (_this$activeForm2 = this.activeForm) === null || _this$activeForm2 === void 0 ? void 0 : (_this$activeForm2$act = _this$activeForm2.activeInput) === null || _this$activeForm2$act === void 0 ? void 0 : _this$activeForm2$act.focus();
            break;
          }

        case 'none':
          {
            // do nothing
            break;
          }

        default:
          {
            if (this.globalConfig.isDDGTestMode) {
              console.warn('unhandled response', resp);
            }
          }
      }

      return this._closeAutofillParent();
    }).catch(e => {
      if (this.globalConfig.isDDGTestMode) {
        if (e.name === 'AbortError') {
          console.log('Promise Aborted');
        } else {
          console.error('Promise Rejected', e);
        }
      }
    });
  }
  /**
   * @returns {Promise<any>}
   */


  async _closeAutofillParent() {
    return this.deviceApi.notify(new _deviceApiCalls.CloseAutofillParentCall(null));
  }
  /**
   * Email Protection calls
   */

  /**
   * @returns {Promise<any>}
   */


  getEmailProtectionCapabilities() {
    return this.deviceApi.request(new _deviceApiCalls.EmailProtectionGetCapabilitiesCall({}));
  }

  async _getIsLoggedIn() {
    const isLoggedIn = await this.deviceApi.request(new _deviceApiCalls.EmailProtectionGetIsLoggedInCall({}));

    this.isDeviceSignedIn = () => isLoggedIn;

    return isLoggedIn;
  }

  addLogoutListener(handler) {
    // Only deal with logging out if we're in the email web app
    if (!this.globalConfig.isDDGDomain) return;
    windowsInteropAddEventListener('message', e => {
      if (this.globalConfig.isDDGDomain && e.data === EMAIL_PROTECTION_LOGOUT_MESSAGE) {
        handler();
      }
    });
  }
  /**
   * @returns {Promise<any>}
   */


  storeUserData(_ref) {
    let {
      addUserData
    } = _ref;
    return this.deviceApi.request(new _deviceApiCalls.EmailProtectionStoreUserDataCall(addUserData));
  }
  /**
   * @returns {Promise<any>}
   */


  removeUserData() {
    return this.deviceApi.request(new _deviceApiCalls.EmailProtectionRemoveUserDataCall({}));
  }
  /**
   * @returns {Promise<any>}
   */


  getUserData() {
    return this.deviceApi.request(new _deviceApiCalls.EmailProtectionGetUserDataCall({}));
  }

  async refreshAlias() {
    const addresses = await this.deviceApi.request(new _deviceApiCalls.EmailProtectionRefreshPrivateAddressCall({}));
    this.storeLocalAddresses(addresses);
  }

  async getAddresses() {
    const addresses = await this.deviceApi.request(new _deviceApiCalls.EmailProtectionGetAddressesCall({}));
    this.storeLocalAddresses(addresses);
    return addresses;
  }

}

exports.WindowsInterface = WindowsInterface;

},{"../UI/controllers/OverlayUIController.js":51,"../deviceApiCalls/__generated__/deviceApiCalls.js":59,"./InterfacePrototype.js":19}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WindowsOverlayDeviceInterface = void 0;

var _InterfacePrototype = _interopRequireDefault(require("./InterfacePrototype.js"));

var _HTMLTooltipUIController = require("../UI/controllers/HTMLTooltipUIController.js");

var _deviceApiCalls = require("../deviceApiCalls/__generated__/deviceApiCalls.js");

var _overlayApi = require("./overlayApi.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * This subclass is designed to separate code that *only* runs inside the
 * Windows Overlay into a single place.
 *
 * It has some subtle differences to the macOS version, which is why
 * this is another DeviceInterface
 */
class WindowsOverlayDeviceInterface extends _InterfacePrototype.default {
  constructor() {
    super(...arguments);

    _defineProperty(this, "stripCredentials", false);

    _defineProperty(this, "overlay", (0, _overlayApi.overlayApi)(this));

    _defineProperty(this, "previousScreenX", 0);

    _defineProperty(this, "previousScreenY", 0);
  }

  /**
   * Because we're running inside the Overlay, we always create the HTML
   * Tooltip controller.
   *
   * @override
   * @returns {import("../UI/controllers/UIController.js").UIController}
   */
  createUIController() {
    return new _HTMLTooltipUIController.HTMLTooltipUIController({
      tooltipKind:
      /** @type {const} */
      'modern',
      device: this
    }, {
      wrapperClass: 'top-autofill',
      tooltipPositionClass: () => '.wrapper { transform: none; }',
      setSize: details => this.deviceApi.notify(new _deviceApiCalls.SetSizeCall(details)),
      remove: async () => this._closeAutofillParent(),
      testMode: this.isTestMode(),

      /**
       * Note: This is needed because Mutation observer didn't support visibility checks on Windows
       */
      checkVisibility: false
    });
  }

  addDeviceListeners() {
    /**
     * On Windows (vs. MacOS) we can use the built-in `mousemove`
     * event and screen-relative positioning.
     *
     * Note: There's no cleanup required here since the Overlay has a fresh
     * page load every time it's opened.
     */
    window.addEventListener('mousemove', event => {
      var _this$uiController, _this$uiController$ge;

      // Don't set focus if the mouse hasn't moved ever
      // This is to avoid clickjacking where an attacker puts the pulldown under the cursor
      // and tricks the user into clicking
      if (!this.previousScreenX && !this.previousScreenY || // if no previous coords
      this.previousScreenX === event.screenX && this.previousScreenY === event.screenY // or the mouse hasn't moved
      ) {
        this.previousScreenX = event.screenX;
        this.previousScreenY = event.screenY;
        return;
      }

      const activeTooltip = (_this$uiController = this.uiController) === null || _this$uiController === void 0 ? void 0 : (_this$uiController$ge = _this$uiController.getActiveTooltip) === null || _this$uiController$ge === void 0 ? void 0 : _this$uiController$ge.call(_this$uiController);
      activeTooltip === null || activeTooltip === void 0 ? void 0 : activeTooltip.focus(event.x, event.y);
      this.previousScreenX = event.screenX;
      this.previousScreenY = event.screenY;
    });
    return super.addDeviceListeners();
  }
  /**
   * @returns {Promise<any>}
   */


  async _closeAutofillParent() {
    return this.deviceApi.notify(new _deviceApiCalls.CloseAutofillParentCall(null));
  }
  /**
   * @returns {Promise<any>}
   */


  openManagePasswords() {
    return this.deviceApi.notify(new _deviceApiCalls.OpenManagePasswordsCall({}));
  }
  /**
   * @returns {Promise<any>}
   */


  openManageCreditCards() {
    return this.deviceApi.notify(new _deviceApiCalls.OpenManageCreditCardsCall({}));
  }
  /**
   * @returns {Promise<any>}
   */


  openManageIdentities() {
    return this.deviceApi.notify(new _deviceApiCalls.OpenManageIdentitiesCall({}));
  }
  /**
   * Since we're running inside the Overlay we can limit what happens here to
   * be only things that are needed to power the HTML Tooltip
   *
   * @override
   * @returns {Promise<void>}
   */


  async setupAutofill() {
    const loggedIn = await this._getIsLoggedIn();

    if (loggedIn) {
      await this.getAddresses();
    }

    const response = await this.deviceApi.request(new _deviceApiCalls.GetAutofillInitDataCall(null)); // @ts-ignore

    this.storeLocalData(response);
  }

  async postInit() {
    // setup overlay API pieces
    this.overlay.showImmediately();
    super.postInit();
  }
  /**
   * In the top-frame scenario, we send a message to the native
   * side to indicate a selection. Once received, the native side will store that selection so that a
   * subsequence call from main webpage can retrieve it
   *
   * @override
   * @param {IdentityObject|CreditCardObject|CredentialsObject|{email:string, id: string}} data
   * @param {string} type
   */


  async selectedDetail(data, type) {
    return this.overlay.selectedDetail(data, type);
  }
  /**
   * Email Protection calls
   */


  async _getIsLoggedIn() {
    const isLoggedIn = await this.deviceApi.request(new _deviceApiCalls.EmailProtectionGetIsLoggedInCall({}));

    this.isDeviceSignedIn = () => isLoggedIn;

    return isLoggedIn;
  }

  async getAddresses() {
    const addresses = await this.deviceApi.request(new _deviceApiCalls.EmailProtectionGetAddressesCall({}));
    this.storeLocalAddresses(addresses);
    return addresses;
  }
  /**
   * Gets a single identity obj once the user requests it
   * @param {Number} id
   * @returns {Promise<{success: IdentityObject|undefined}>}
   */


  getAutofillIdentity(id) {
    const identity = this.getLocalIdentities().find(_ref => {
      let {
        id: identityId
      } = _ref;
      return "".concat(identityId) === "".concat(id);
    });
    return Promise.resolve({
      success: identity
    });
  }

}

exports.WindowsOverlayDeviceInterface = WindowsOverlayDeviceInterface;

},{"../UI/controllers/HTMLTooltipUIController.js":49,"../deviceApiCalls/__generated__/deviceApiCalls.js":59,"./InterfacePrototype.js":19,"./overlayApi.js":23}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initFormSubmissionsApi = initFormSubmissionsApi;

var _autofillUtils = require("../autofill-utils.js");

var _labelUtil = require("../Form/label-util.js");

/**
 * This is a single place to contain all functionality relating to form submission detection
 *
 * @param {Map<HTMLElement, import("../Form/Form").Form>} forms
 * @param {import("../Form/matching").Matching} matching
 */
function initFormSubmissionsApi(forms, matching) {
  /**
   * Global submit events
   */
  window.addEventListener('submit', e => {
    var _forms$get;

    // @ts-ignore
    return (_forms$get = forms.get(e.target)) === null || _forms$get === void 0 ? void 0 : _forms$get.submitHandler('global submit event');
  }, true);
  /**
   * Global keydown events
   */

  window.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const focusedForm = [...forms.values()].find(form => form.hasFocus(e));
      focusedForm === null || focusedForm === void 0 ? void 0 : focusedForm.submitHandler('global keydown + Enter');
    }
  });
  /**
   * Global pointer down events
   * @param {PointerEvent} event
   */

  window.addEventListener('pointerdown', event => {
    const matchingForm = [...forms.values()].find(form => {
      const btns = [...form.submitButtons]; // @ts-ignore

      if (btns.includes(event.target)) return true; // @ts-ignore

      if (btns.find(btn => btn.contains(event.target))) return true;
    });
    matchingForm === null || matchingForm === void 0 ? void 0 : matchingForm.submitHandler('global pointerdown event + matching form');

    if (!matchingForm) {
      var _event$target, _matching$getDDGMatch, _event$target2;

      const selector = matching.cssSelector('submitButtonSelector') + ', a[href="#"], a[href^=javascript], *[onclick], [class*=button i]'; // check if the click happened on a button

      const button =
      /** @type HTMLElement */
      (_event$target = event.target) === null || _event$target === void 0 ? void 0 : _event$target.closest(selector);
      if (!button) return;
      const text = (0, _autofillUtils.getTextShallow)(button) || (0, _labelUtil.extractElementStrings)(button).join(' ');
      const hasRelevantText = (_matching$getDDGMatch = matching.getDDGMatcherRegex('submitButtonRegex')) === null || _matching$getDDGMatch === void 0 ? void 0 : _matching$getDDGMatch.test(text);

      if (hasRelevantText && text.length < 25) {
        // check if there's a form with values
        const filledForm = [...forms.values()].find(form => form.hasValues());

        if (filledForm && (0, _autofillUtils.buttonMatchesFormType)(
        /** @type HTMLElement */
        button, filledForm)) {
          filledForm === null || filledForm === void 0 ? void 0 : filledForm.submitHandler('global pointerdown event + filled form');
        }
      } // TODO: Temporary hack to support Google signin in different languages
      // https://app.asana.com/0/1198964220583541/1201650539303898/f


      if (
      /** @type HTMLElement */
      (_event$target2 = event.target) !== null && _event$target2 !== void 0 && _event$target2.closest('#passwordNext button, #identifierNext button')) {
        // check if there's a form with values
        const filledForm = [...forms.values()].find(form => form.hasValues());
        filledForm === null || filledForm === void 0 ? void 0 : filledForm.submitHandler('global pointerdown event + google escape hatch');
      }
    }
  }, true);
  /**
   * @type {PerformanceObserver}
   */

  const observer = new PerformanceObserver(list => {
    const entries = list.getEntries().filter(entry => // @ts-ignore why does TS not know about `entry.initiatorType`?
    ['fetch', 'xmlhttprequest'].includes(entry.initiatorType) && /login|sign-in|signin/.test(entry.name));
    if (!entries.length) return;
    const filledForm = [...forms.values()].find(form => form.hasValues());
    const focusedForm = [...forms.values()].find(form => form.hasFocus()); // If a form is still focused the user is still typing: do nothing

    if (focusedForm) return;
    filledForm === null || filledForm === void 0 ? void 0 : filledForm.submitHandler('performance observer');
  });
  observer.observe({
    entryTypes: ['resource']
  });
}

},{"../Form/label-util.js":31,"../autofill-utils.js":55}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.overlayApi = overlayApi;

var _deviceApiCalls = require("../deviceApiCalls/__generated__/deviceApiCalls.js");

/**
 * These are some re-usable parts for handling 'overlays' (like on macOS + Windows)
 *
 * @param {import("./InterfacePrototype").default} device
 */
function overlayApi(device) {
  return {
    /**
     * When we are inside an 'overlay' - the HTML tooltip will be opened immediately
     */
    showImmediately() {
      var _device$uiController, _device$uiController$;

      const topContextData = device.getTopContextData();
      if (!topContextData) throw new Error('unreachable, topContextData should be available'); // Provide dummy values

      const getPosition = () => {
        return {
          x: 0,
          y: 0,
          height: 50,
          width: 50
        };
      }; // Create the tooltip, and set it as active


      const tooltip = (_device$uiController = device.uiController) === null || _device$uiController === void 0 ? void 0 : (_device$uiController$ = _device$uiController.createTooltip) === null || _device$uiController$ === void 0 ? void 0 : _device$uiController$.call(_device$uiController, getPosition, topContextData);

      if (tooltip) {
        var _device$uiController2, _device$uiController3;

        (_device$uiController2 = device.uiController) === null || _device$uiController2 === void 0 ? void 0 : (_device$uiController3 = _device$uiController2.setActiveTooltip) === null || _device$uiController3 === void 0 ? void 0 : _device$uiController3.call(_device$uiController2, tooltip);
      }
    },

    /**
     * @param {IdentityObject|CreditCardObject|CredentialsObject|{email:string, id: string}} data
     * @param {string} type
     * @returns {Promise<void>}
     */
    async selectedDetail(data, type) {
      let detailsEntries = Object.entries(data).map(_ref => {
        let [key, value] = _ref;
        return [key, String(value)];
      });
      const entries = Object.fromEntries(detailsEntries);
      /** @link {import("../deviceApiCalls/schemas/getAutofillData.result.json")} */

      await device.deviceApi.notify(new _deviceApiCalls.SelectedDetailCall({
        data: entries,
        configType: type
      }));
    }

  };
}

},{"../deviceApiCalls/__generated__/deviceApiCalls.js":59}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EmailProtection = void 0;

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }

function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

var _previous = /*#__PURE__*/new WeakMap();

/**
 * Use this as place to store any state or functionality related to Email Protection
 */
class EmailProtection {
  /** @type {string|null} */

  /** @param {import("./DeviceInterface/InterfacePrototype").default} device */
  constructor(device) {
    _classPrivateFieldInitSpec(this, _previous, {
      writable: true,
      value: null
    });

    this.device = device;
  }
  /** @returns {string|null} */


  get lastGenerated() {
    return _classPrivateFieldGet(this, _previous);
  }
  /**
   * Store the last received email address
   * @param {string} emailAddress
   */


  storeReceived(emailAddress) {
    _classPrivateFieldSet(this, _previous, emailAddress);

    return emailAddress;
  }

}

exports.EmailProtection = EmailProtection;

},{}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Form = void 0;

var _FormAnalyzer = _interopRequireDefault(require("./FormAnalyzer.js"));

var _autofillUtils = require("../autofill-utils.js");

var _matching = require("./matching.js");

var _inputStyles = require("./inputStyles.js");

var _inputTypeConfig = require("./inputTypeConfig.js");

var _formatters = require("./formatters.js");

var _constants = require("../constants.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const {
  ATTR_AUTOFILL,
  ATTR_INPUT_TYPE,
  MAX_FORM_MUT_OBS_COUNT,
  MAX_INPUTS_PER_FORM
} = _constants.constants;

class Form {
  /** @type {import("../Form/matching").Matching} */

  /** @type {HTMLElement} */

  /** @type {HTMLInputElement | null} */

  /**
   * @param {HTMLElement} form
   * @param {HTMLInputElement|HTMLSelectElement} input
   * @param {import("../DeviceInterface/InterfacePrototype").default} deviceInterface
   * @param {import("../Form/matching").Matching} [matching]
   * @param {Boolean} [shouldAutoprompt]
   */
  constructor(form, input, deviceInterface, matching) {
    let shouldAutoprompt = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

    _defineProperty(this, "matching", void 0);

    _defineProperty(this, "form", void 0);

    _defineProperty(this, "activeInput", void 0);

    this.form = form;
    this.matching = matching || (0, _matching.createMatching)();
    this.formAnalyzer = new _FormAnalyzer.default(form, input, matching);
    this.device = deviceInterface;
    /** @type Record<'all' | SupportedMainTypes, Set> */

    this.inputs = {
      all: new Set(),
      credentials: new Set(),
      creditCards: new Set(),
      identities: new Set(),
      unknown: new Set()
    };
    this.touched = new Set();
    this.listeners = new Set();
    this.activeInput = null; // We set this to true to skip event listeners while we're autofilling

    this.isAutofilling = false;
    this.handlerExecuted = false;
    this.shouldPromptToStoreData = true;
    this.shouldAutoSubmit = this.device.globalConfig.isMobileApp;
    /**
     * @type {IntersectionObserver | null}
     */

    this.intObs = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) this.removeTooltip();
      }
    });
    this.mutObsCount = 0;
    this.mutObsConfig = {
      childList: true,
      subtree: true
    };
    this.mutObs = new MutationObserver(records => {
      const anythingRemoved = records.some(record => record.removedNodes.length > 0);

      if (anythingRemoved) {
        // Must check for inputs because a parent may be removed and not show up in record.removedNodes
        if ([...this.inputs.all].some(input => !input.isConnected)) {
          // If any known input has been removed from the DOM, reanalyze the whole form
          window.requestIdleCallback(() => {
            this.formAnalyzer = new _FormAnalyzer.default(this.form, input, this.matching);
            this.recategorizeAllInputs();
          });
          this.mutObsCount++; // If the form mutates too much, disconnect to avoid performance issues

          if (this.mutObsCount >= MAX_FORM_MUT_OBS_COUNT) {
            this.mutObs.disconnect();
          }
        }
      }
    }); // This ensures we fire the handler again if the form is changed

    this.addListener(form, 'input', () => {
      if (!this.isAutofilling) {
        this.handlerExecuted = false;
        this.shouldPromptToStoreData = true;
      }
    });
    this.categorizeInputs();
    this.mutObs.observe(this.form, this.mutObsConfig);
    this.logFormInfo();

    if (shouldAutoprompt) {
      this.promptLoginIfNeeded();
    }
  }

  get isLogin() {
    return this.formAnalyzer.isLogin;
  }

  get isSignup() {
    return this.formAnalyzer.isSignup;
  }

  get isHybrid() {
    return this.formAnalyzer.isHybrid;
  }

  get isCCForm() {
    return this.formAnalyzer.isCCForm();
  }

  logFormInfo() {
    if (!(0, _autofillUtils.shouldLog)()) return;
    console.log("Form type: %c".concat(this.getFormType()), 'font-weight: bold');
    console.log('Signals: ', this.formAnalyzer.signals);
    console.log('Wrapping element: ', this.form);
    console.log('Inputs: ', this.inputs);
    console.log('Submit Buttons: ', this.submitButtons);
  }

  getFormType() {
    if (this.isHybrid) return "hybrid (hybrid score: ".concat(this.formAnalyzer.hybridSignal, ", score: ").concat(this.formAnalyzer.autofillSignal, ")");
    if (this.isLogin) return "login (score: ".concat(this.formAnalyzer.autofillSignal, ", hybrid score: ").concat(this.formAnalyzer.hybridSignal, ")");
    if (this.isSignup) return "signup (score: ".concat(this.formAnalyzer.autofillSignal, ", hybrid score: ").concat(this.formAnalyzer.hybridSignal, ")");
    return 'something went wrong';
  }
  /**
   * Checks if the form element contains the activeElement or the event target
   * @return {boolean}
   * @param {KeyboardEvent | null} [e]
   */


  hasFocus(e) {
    return this.form.contains(document.activeElement) || this.form.contains(
    /** @type HTMLElement */
    e === null || e === void 0 ? void 0 : e.target);
  }

  submitHandler() {
    var _this$device$postSubm, _this$device;

    let via = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'unknown';

    if (this.device.globalConfig.isDDGTestMode) {
      console.log('Form.submitHandler via:', via, this);
    }

    if (this.handlerExecuted) return;
    const values = this.getValuesReadyForStorage();
    (_this$device$postSubm = (_this$device = this.device).postSubmit) === null || _this$device$postSubm === void 0 ? void 0 : _this$device$postSubm.call(_this$device, values, this); // mark this form as being handled

    this.handlerExecuted = true;
  }
  /**
   * Reads the values from the form without preparing to store them
   * @return {InternalDataStorageObject}
   */


  getRawValues() {
    const formValues = [...this.inputs.credentials, ...this.inputs.identities, ...this.inputs.creditCards].reduce((output, inputEl) => {
      var _output$mainType, _value;

      const mainType = (0, _matching.getInputMainType)(inputEl);
      const subtype = (0, _matching.getInputSubtype)(inputEl);
      let value = inputEl.value || ((_output$mainType = output[mainType]) === null || _output$mainType === void 0 ? void 0 : _output$mainType[subtype]);

      if (subtype === 'addressCountryCode') {
        value = (0, _formatters.inferCountryCodeFromElement)(inputEl);
      } // Discard passwords that are shorter than 4 characters


      if (subtype === 'password' && ((_value = value) === null || _value === void 0 ? void 0 : _value.length) <= 3) {
        value = undefined;
      }

      if (value) {
        output[mainType][subtype] = value;
      }

      return output;
    }, {
      credentials: {},
      creditCards: {},
      identities: {}
    });

    if (formValues.credentials.password && !formValues.credentials.username && !formValues.identities.emailAddress) {
      // If we have a password but no username, let's search further
      const hiddenFields =
      /** @type [HTMLInputElement] */
      [...this.form.querySelectorAll('input[type=hidden]')];
      const probableField = hiddenFields.find(field => {
        var _this$matching$ddgMat;

        const regex = (0, _matching.safeRegex)('email|' + ((_this$matching$ddgMat = this.matching.ddgMatcher('username')) === null || _this$matching$ddgMat === void 0 ? void 0 : _this$matching$ddgMat.match));
        const attributeText = field.id + ' ' + field.name;
        return regex === null || regex === void 0 ? void 0 : regex.test(attributeText);
      });

      if (probableField !== null && probableField !== void 0 && probableField.value) {
        formValues.credentials.username = probableField.value;
      } else if ( // If a form has phone + password(s) fields, save the phone as username
      formValues.identities.phone && this.inputs.all.size - this.inputs.unknown.size < 4) {
        formValues.credentials.username = formValues.identities.phone;
      } else {
        // If we still don't have a username, try scanning the form's text for an email address
        this.form.querySelectorAll(this.matching.cssSelector('safeUniversalSelector')).forEach(el => {
          var _elText$match;

          const elText = (0, _autofillUtils.getTextShallow)(el); // Ignore long texts to avoid false positives

          if (elText.length > 70) return;
          const emailOrUsername = (_elText$match = elText.match( // https://www.emailregex.com/
          /[a-zA-Z\d.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z\d-]+(?:\.[a-zA-Z\d-]+)*/)) === null || _elText$match === void 0 ? void 0 : _elText$match[0];

          if (emailOrUsername) {
            formValues.credentials.username = emailOrUsername;
          }
        });
      }
    }

    return formValues;
  }
  /**
   * Return form values ready for storage
   * @returns {DataStorageObject}
   */


  getValuesReadyForStorage() {
    const formValues = this.getRawValues();
    return (0, _formatters.prepareFormValuesForStorage)(formValues);
  }
  /**
   * Determine if the form has values we want to store in the device
   * @param {DataStorageObject} [values]
   * @return {boolean}
   */


  hasValues(values) {
    const {
      credentials,
      creditCards,
      identities
    } = values || this.getValuesReadyForStorage();
    return Boolean(credentials || creditCards || identities);
  }

  async removeTooltip() {
    var _this$intObs;

    const tooltip = this.device.isTooltipActive();

    if (this.isAutofilling || !tooltip) {
      return;
    }

    await this.device.removeTooltip();
    (_this$intObs = this.intObs) === null || _this$intObs === void 0 ? void 0 : _this$intObs.disconnect();
  }

  showingTooltip(input) {
    var _this$intObs2;

    (_this$intObs2 = this.intObs) === null || _this$intObs2 === void 0 ? void 0 : _this$intObs2.observe(input);
  }

  removeInputHighlight(input) {
    if (!input.classList.contains('ddg-autofilled')) return;
    (0, _autofillUtils.removeInlineStyles)(input, (0, _inputStyles.getIconStylesAutofilled)(input, this));
    (0, _autofillUtils.removeInlineStyles)(input, {
      'cursor': 'pointer'
    });
    input.classList.remove('ddg-autofilled');
    this.addAutofillStyles(input);
  }

  resetIconStylesToInitial() {
    const input = this.activeInput;

    if (input) {
      const initialStyles = (0, _inputStyles.getIconStylesBase)(input, this);
      (0, _autofillUtils.addInlineStyles)(input, initialStyles);
    }
  }

  removeAllHighlights(e, dataType) {
    // This ensures we are not removing the highlight ourselves when autofilling more than once
    if (e && !e.isTrusted) return; // If the user has changed the value, we prompt to update the stored data

    this.shouldPromptToStoreData = true;
    this.execOnInputs(input => this.removeInputHighlight(input), dataType);
  }

  removeInputDecoration(input) {
    (0, _autofillUtils.removeInlineStyles)(input, (0, _inputStyles.getIconStylesBase)(input, this));
    (0, _autofillUtils.removeInlineStyles)(input, (0, _inputStyles.getIconStylesAlternate)(input, this));
    input.removeAttribute(ATTR_AUTOFILL);
    input.removeAttribute(ATTR_INPUT_TYPE);
  }

  removeAllDecorations() {
    this.execOnInputs(input => this.removeInputDecoration(input));
    this.listeners.forEach(_ref => {
      let {
        el,
        type,
        fn,
        opts
      } = _ref;
      return el.removeEventListener(type, fn, opts);
    });
  }

  redecorateAllInputs() {
    this.removeAllDecorations();
    this.execOnInputs(input => {
      if (input instanceof HTMLInputElement) {
        this.decorateInput(input);
      }
    });
  }
  /**
   * Removes all scoring attributes from the inputs and deletes them from memory
   */


  forgetAllInputs() {
    this.execOnInputs(input => {
      input.removeAttribute(ATTR_AUTOFILL);
      input.removeAttribute(ATTR_INPUT_TYPE);
    });
    Object.values(this.inputs).forEach(inputSet => inputSet.clear());
  }
  /**
   * Resets our input scoring and starts from scratch
   */


  recategorizeAllInputs() {
    this.initialScanComplete = false;
    this.removeAllDecorations();
    this.forgetAllInputs();
    this.categorizeInputs();
  }

  resetAllInputs() {
    this.execOnInputs(input => {
      (0, _autofillUtils.setValue)(input, '', this.device.globalConfig);
      this.removeInputHighlight(input);
    });
    if (this.activeInput) this.activeInput.focus();
    this.matching.clear();
  }

  dismissTooltip() {
    this.removeTooltip();
  } // This removes all listeners to avoid memory leaks and weird behaviours


  destroy() {
    this.removeAllDecorations();
    this.removeTooltip();
    this.forgetAllInputs();
    this.mutObs.disconnect();
    this.matching.clear();
    this.intObs = null;
  }

  categorizeInputs() {
    const selector = this.matching.cssSelector('formInputsSelector');

    if (this.form.matches(selector)) {
      this.addInput(this.form);
    } else {
      let foundInputs = this.form.querySelectorAll(selector); // If the markup is broken form.querySelectorAll may not return the fields, so we select from the parent

      if (foundInputs.length === 0 && this.form instanceof HTMLFormElement && this.form.length > 0) {
        var _this$form$parentElem;

        foundInputs = ((_this$form$parentElem = this.form.parentElement) === null || _this$form$parentElem === void 0 ? void 0 : _this$form$parentElem.querySelectorAll(selector)) || foundInputs;
      }

      if (foundInputs.length < MAX_INPUTS_PER_FORM) {
        foundInputs.forEach(input => this.addInput(input));
      } else {
        if ((0, _autofillUtils.shouldLog)()) {
          console.log('The form has too many inputs, bailing.');
        }
      }
    }

    this.initialScanComplete = true;
  }

  get submitButtons() {
    const selector = this.matching.cssSelector('submitButtonSelector');
    const allButtons =
    /** @type {HTMLElement[]} */
    [...this.form.querySelectorAll(selector)];
    return allButtons.filter(btn => (0, _autofillUtils.isPotentiallyViewable)(btn) && (0, _autofillUtils.isLikelyASubmitButton)(btn, this.matching) && (0, _autofillUtils.buttonMatchesFormType)(btn, this));
  }

  attemptSubmissionIfNeeded() {
    if (!this.isLogin || // Only submit login forms
    this.submitButtons.length > 1 // Do not submit if we're unsure about the submit button
    ) return; // check for visible empty fields before attemtping submission
    // this is to avoid loops where a captcha keeps failing for the user

    let isThereAnEmptyVisibleField = false;
    this.execOnInputs(input => {
      if (input.value === '' && (0, _autofillUtils.isPotentiallyViewable)(input)) isThereAnEmptyVisibleField = true;
    }, 'all', false);
    if (isThereAnEmptyVisibleField) return; // We're not using .submit() to minimise breakage with client-side forms

    this.submitButtons.forEach(button => {
      if ((0, _autofillUtils.isPotentiallyViewable)(button)) {
        button.click();
      }
    });
  }
  /**
   * Executes a function on input elements. Can be limited to certain element types
   * @param {(input: HTMLInputElement|HTMLSelectElement) => void} fn
   * @param {'all' | SupportedMainTypes} inputType
   * @param {boolean} shouldCheckForDecorate
   */


  execOnInputs(fn) {
    let inputType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'all';
    let shouldCheckForDecorate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    const inputs = this.inputs[inputType];

    for (const input of inputs) {
      let canExecute = true; // sometimes we want to execute even if we didn't decorate

      if (shouldCheckForDecorate) {
        canExecute = (0, _inputTypeConfig.isFieldDecorated)(input);
      }

      if (canExecute) fn(input);
    }
  }

  addInput(input) {
    var _this$device$settings;

    if (this.inputs.all.has(input)) return this; // If the form has too many inputs, destroy everything to avoid performance issues

    if (this.inputs.all.size > MAX_INPUTS_PER_FORM) {
      if ((0, _autofillUtils.shouldLog)()) {
        console.log('The form has too many inputs, destroying.');
      }

      this.destroy();
      return this;
    } // When new inputs are added after the initial scan, reanalyze the whole form


    if (this.initialScanComplete) {
      this.formAnalyzer = new _FormAnalyzer.default(this.form, input, this.matching);
      this.recategorizeAllInputs();
      return this;
    } // Nothing to do with 1-character fields


    if (input.maxLength === 1) return this;
    this.inputs.all.add(input);
    const opts = {
      isLogin: this.isLogin,
      isHybrid: this.isHybrid,
      isCCForm: this.isCCForm,
      hasCredentials: Boolean((_this$device$settings = this.device.settings.availableInputTypes.credentials) === null || _this$device$settings === void 0 ? void 0 : _this$device$settings.username),
      supportsIdentitiesAutofill: this.device.settings.featureToggles.inputType_identities
    };
    this.matching.setInputType(input, this.form, opts);
    const mainInputType = (0, _matching.getInputMainType)(input);
    this.inputs[mainInputType].add(input);
    this.decorateInput(input);
    return this;
  }
  /**
   * Adds event listeners and keeps track of them for subsequent removal
   * @param {HTMLElement} el
   * @param {Event['type']} type
   * @param {(Event) => void} fn
   * @param {AddEventListenerOptions} [opts]
   */


  addListener(el, type, fn, opts) {
    el.addEventListener(type, fn, opts);
    this.listeners.add({
      el,
      type,
      fn,
      opts
    });
  }

  addAutofillStyles(input) {
    const initialStyles = (0, _inputStyles.getIconStylesBase)(input, this);
    const activeStyles = (0, _inputStyles.getIconStylesAlternate)(input, this);
    (0, _autofillUtils.addInlineStyles)(input, initialStyles);
    return {
      onMouseMove: activeStyles,
      onMouseLeave: initialStyles
    };
  }
  /**
   * Decorate here means adding listeners and an optional icon
   * @param {HTMLInputElement} input
   * @returns {Promise<Form>}
   */


  async decorateInput(input) {
    const config = (0, _inputTypeConfig.getInputConfig)(input);
    const shouldDecorate = await config.shouldDecorate(input, this);
    if (!shouldDecorate) return this;
    input.setAttribute(ATTR_AUTOFILL, 'true');
    const hasIcon = !!config.getIconBase(input, this);

    if (hasIcon) {
      const {
        onMouseMove,
        onMouseLeave
      } = this.addAutofillStyles(input);
      this.addListener(input, 'mousemove', e => {
        if ((0, _autofillUtils.wasAutofilledByChrome)(input)) return;

        if ((0, _autofillUtils.isEventWithinDax)(e, e.target)) {
          (0, _autofillUtils.addInlineStyles)(e.target, {
            'cursor': 'pointer',
            ...onMouseMove
          });
        } else {
          (0, _autofillUtils.removeInlineStyles)(e.target, {
            'cursor': 'pointer'
          }); // Only overwrite active icon styles if tooltip is closed

          if (!this.device.isTooltipActive()) {
            (0, _autofillUtils.addInlineStyles)(e.target, { ...onMouseLeave
            });
          }
        }
      });
      this.addListener(input, 'mouseleave', e => {
        (0, _autofillUtils.removeInlineStyles)(e.target, {
          'cursor': 'pointer'
        }); // Only overwrite active icon styles if tooltip is closed

        if (!this.device.isTooltipActive()) {
          (0, _autofillUtils.addInlineStyles)(e.target, { ...onMouseLeave
          });
        }
      });
    }
    /**
     * @param {PointerEvent} e
     * @returns {{ x: number; y: number; } | undefined}
     */


    function getMainClickCoords(e) {
      if (!e.isTrusted) return;
      const isMainMouseButton = e.button === 0;
      if (!isMainMouseButton) return;
      return {
        x: e.clientX,
        y: e.clientY
      };
    }
    /**
     * @param {Event} e
     * @param {WeakMap} storedClickCoords
     * @returns {{ x: number; y: number; } | null}
     */


    function getClickCoords(e, storedClickCoords) {
      // Get click co-ordinates for pointer events
      // We need click coordinates to position the tooltip when the field is in an iframe
      if (e.type === 'pointerdown') {
        return getMainClickCoords(
        /** @type {PointerEvent} */
        e) || null;
      } // Reuse a previous click co-ordinates if they exist for this element


      const click = storedClickCoords.get(input);
      storedClickCoords.delete(input);
      return click || null;
    } // Store the click to a label so we can use the click when the field is focused
    // Needed to handle label clicks when the form is in an iframe


    let storedClickCoords = new WeakMap();
    let timeout = null;
    /**
     * @param {PointerEvent} e
     */

    const handlerLabel = e => {
      var _e$target, _e$target$closest;

      // Look for e.target OR it's closest parent to be a HTMLLabelElement
      const control =
      /** @type HTMLElement */
      (_e$target = e.target) === null || _e$target === void 0 ? void 0 : (_e$target$closest = _e$target.closest('label')) === null || _e$target$closest === void 0 ? void 0 : _e$target$closest.control;
      if (!control) return;

      if (e.isTrusted) {
        storedClickCoords.set(control, getMainClickCoords(e));
      }

      clearTimeout(timeout); // Remove the stored click if the timer expires

      timeout = setTimeout(() => {
        storedClickCoords = new WeakMap();
      }, 1000);
    };

    const handler = e => {
      // Avoid firing multiple times
      if (this.isAutofilling || this.device.isTooltipActive()) {
        return;
      } // On mobile, we don't trigger on focus, so here we get the target control on label click


      const isLabel = e.target instanceof HTMLLabelElement;
      const input = isLabel ? e.target.control : e.target;
      if (!input || !this.inputs.all.has(input)) return;
      if ((0, _autofillUtils.wasAutofilledByChrome)(input)) return;
      if (!(0, _inputTypeConfig.canBeInteractedWith)(input)) return;
      const clickCoords = getClickCoords(e, storedClickCoords);

      if (e.type === 'pointerdown') {
        // Only allow real user clicks with co-ordinates through
        if (!e.isTrusted || !clickCoords) return;
      }

      if (this.shouldOpenTooltip(e, input)) {
        const iconClicked = (0, _autofillUtils.isEventWithinDax)(e, input); // On mobile and extensions we don't trigger the focus event to avoid
        // keyboard flashing and conflicts with browsers' own tooltips

        if ((this.device.globalConfig.isMobileApp || this.device.globalConfig.isExtension) && // Avoid the icon capturing clicks on small fields making it impossible to focus
        input.offsetWidth > 50 && iconClicked) {
          e.preventDefault();
          e.stopImmediatePropagation();
          input.blur();
        }

        this.touched.add(input);
        this.device.attachTooltip({
          form: this,
          input: input,
          click: clickCoords,
          trigger: 'userInitiated',
          triggerMetaData: {
            // An 'icon' click is very different to a field click or focus.
            // It indicates an explicit opt-in to the feature.
            type: iconClicked ? 'explicit-opt-in' : 'implicit-opt-in'
          }
        });
        const activeStyles = (0, _inputStyles.getIconStylesAlternate)(input, this);
        (0, _autofillUtils.addInlineStyles)(input, activeStyles);
      }
    };

    if (!(input instanceof HTMLSelectElement)) {
      var _input$labels;

      const events = ['pointerdown'];
      if (!this.device.globalConfig.isMobileApp) events.push('focus');
      (_input$labels = input.labels) === null || _input$labels === void 0 ? void 0 : _input$labels.forEach(label => {
        if (this.device.globalConfig.isMobileApp) {
          // On mobile devices we don't trigger on focus, so we use the click handler here
          this.addListener(label, 'pointerdown', handler);
        } else {
          // Needed to handle label clicks when the form is in an iframe
          this.addListener(label, 'pointerdown', handlerLabel);
        }
      });
      events.forEach(ev => this.addListener(input, ev, handler));
    }

    return this;
  }

  shouldOpenTooltip(e, input) {
    var _this$device$inContex;

    if (!(0, _autofillUtils.isPotentiallyViewable)(input)) return false; // Always open if the user has clicked on the Dax icon

    if ((0, _autofillUtils.isEventWithinDax)(e, input)) return true;
    if (this.device.globalConfig.isWindows) return true;
    const subtype = (0, _matching.getInputSubtype)(input);
    const isIncontextSignupAvailable = (_this$device$inContex = this.device.inContextSignup) === null || _this$device$inContex === void 0 ? void 0 : _this$device$inContex.isAvailable(subtype);

    if (this.device.globalConfig.isApp) {
      const mainType = (0, _matching.getInputMainType)(input); // Check if, without in-context signup (passed as `null` below),
      // we'd have any other items to show. This lets us know if we're
      // just showing in-context signup, or with other autofill items.

      const hasSavedDetails = this.device.settings.canAutofillType({
        mainType,
        subtype
      }, null); // Don't open the tooltip on input focus whenever it'll only show in-context signup

      if (!hasSavedDetails && isIncontextSignupAvailable) return false;
      return true;
    }

    if (this.device.globalConfig.isExtension || this.device.globalConfig.isMobileApp) {
      // Don't open the tooltip on input focus whenever it's showing in-context signup
      if (isIncontextSignupAvailable) return false;
    }

    return !this.touched.has(input) && !input.classList.contains('ddg-autofilled');
  }

  autofillInput(input, string, dataType) {
    // Do not autofill if it's invisible (select elements can be hidden because of custom implementations)
    if (input instanceof HTMLInputElement && !(0, _autofillUtils.isPotentiallyViewable)(input)) return; // Do not autofill if it's disabled or readonly to avoid potential breakage

    if (!(0, _inputTypeConfig.canBeInteractedWith)(input)) return; // @ts-ignore

    const activeInputSubtype = (0, _matching.getInputSubtype)(this.activeInput);
    const inputSubtype = (0, _matching.getInputSubtype)(input);
    const isEmailAutofill = activeInputSubtype === 'emailAddress' && inputSubtype === 'emailAddress'; // Don't override values for identities, unless it's the current input or we're autofilling email

    if (dataType === 'identities' && // only for identities
    input.nodeName !== 'SELECT' && input.value !== '' && // if the input is not empty
    this.activeInput !== input && // and this is not the active input
    !isEmailAutofill // and we're not auto-filling email
    ) return; // do not overwrite the value
    // If the value is already there, just return

    if (input.value === string) return;
    const successful = (0, _autofillUtils.setValue)(input, string, this.device.globalConfig);
    if (!successful) return;
    input.classList.add('ddg-autofilled');
    (0, _autofillUtils.addInlineStyles)(input, (0, _inputStyles.getIconStylesAutofilled)(input, this));
    this.touched.add(input); // If the user changes the value, remove the decoration

    input.addEventListener('input', e => this.removeAllHighlights(e, dataType), {
      once: true
    });
  }
  /**
   * Autofill method for email protection only
   * @param {string} alias
   * @param {'all' | SupportedMainTypes} dataType
   */


  autofillEmail(alias) {
    let dataType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'identities';
    this.isAutofilling = true;
    this.execOnInputs(input => {
      const inputSubtype = (0, _matching.getInputSubtype)(input);

      if (inputSubtype === 'emailAddress') {
        this.autofillInput(input, alias, dataType);
      }
    }, dataType);
    this.isAutofilling = false;
    this.removeTooltip();
  }

  autofillData(data, dataType) {
    var _this$device$postAuto, _this$device2;

    this.isAutofilling = true;
    this.execOnInputs(input => {
      const inputSubtype = (0, _matching.getInputSubtype)(input);
      let autofillData = data[inputSubtype];

      if (inputSubtype === 'expiration' && input instanceof HTMLInputElement) {
        autofillData = (0, _formatters.getUnifiedExpiryDate)(input, data.expirationMonth, data.expirationYear, this);
      }

      if (inputSubtype === 'expirationYear' && input instanceof HTMLInputElement) {
        autofillData = (0, _formatters.formatCCYear)(input, autofillData, this);
      }

      if (inputSubtype === 'addressCountryCode') {
        autofillData = (0, _formatters.getCountryName)(input, data);
      }

      if (autofillData) {
        this.autofillInput(input, autofillData, dataType);
      }
    }, dataType);
    this.isAutofilling = false; // After autofill we check if form values match the data provided…

    const formValues = this.getValuesReadyForStorage();
    const areAllFormValuesKnown = Object.keys(formValues[dataType] || {}).every(subtype => formValues[dataType][subtype] === data[subtype]);

    if (areAllFormValuesKnown) {
      // …if we know all the values do not prompt to store data
      this.shouldPromptToStoreData = false; // reset this to its initial value

      this.shouldAutoSubmit = this.device.globalConfig.isMobileApp;
    } else {
      // …otherwise we will prompt and do not want to autosubmit because the experience is jarring
      this.shouldAutoSubmit = false;
    }

    (_this$device$postAuto = (_this$device2 = this.device).postAutofill) === null || _this$device$postAuto === void 0 ? void 0 : _this$device$postAuto.call(_this$device2, data, dataType, this);
    this.removeTooltip();
  }
  /**
   * Set all inputs of the data type to "touched"
   * @param {'all' | SupportedMainTypes} dataType
   */


  touchAllInputs() {
    let dataType = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'all';
    this.execOnInputs(input => this.touched.add(input), dataType);
  }

  getFirstViableCredentialsInput() {
    return [...this.inputs.credentials].find(input => (0, _inputTypeConfig.canBeInteractedWith)(input) && (0, _autofillUtils.isPotentiallyViewable)(input));
  }

  async promptLoginIfNeeded() {
    if (document.visibilityState !== 'visible' || !this.isLogin) return;
    const firstCredentialInput = this.getFirstViableCredentialsInput();
    const input = this.activeInput || firstCredentialInput;
    if (!input) return;
    const mainType = (0, _matching.getInputMainType)(input);
    const subtype = (0, _matching.getInputSubtype)(input);
    await this.device.settings.populateDataIfNeeded({
      mainType,
      subtype
    });

    if (this.device.settings.canAutofillType({
      mainType,
      subtype
    }, this.device.inContextSignup)) {
      // The timeout is needed in case the page shows a cookie prompt with a slight delay
      setTimeout(() => {
        // safeExecute checks that the element is on screen according to IntersectionObserver
        (0, _autofillUtils.safeExecute)(this.form, () => {
          const {
            x,
            y,
            width,
            height
          } = this.form.getBoundingClientRect();
          const elHCenter = x + width / 2;
          const elVCenter = y + height / 2; // This checks that the form is not covered by anything else

          const topMostElementFromPoint = document.elementFromPoint(elHCenter, elVCenter);

          if (this.form.contains(topMostElementFromPoint)) {
            this.execOnInputs(input => {
              if ((0, _autofillUtils.isPotentiallyViewable)(input)) {
                this.touched.add(input);
              }
            }, 'credentials');
            this.device.attachTooltip({
              form: this,
              input: input,
              click: null,
              trigger: 'autoprompt',
              triggerMetaData: {
                type: 'implicit-opt-in'
              }
            });
          }
        });
      }, 200);
    }
  }

}

exports.Form = Form;

},{"../autofill-utils.js":55,"../constants.js":58,"./FormAnalyzer.js":26,"./formatters.js":28,"./inputStyles.js":29,"./inputTypeConfig.js":30,"./matching.js":35}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _matching = require("./matching.js");

var _constants = require("../constants.js");

var _matchingConfiguration = require("./matching-configuration.js");

var _autofillUtils = require("../autofill-utils.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class FormAnalyzer {
  /** @type HTMLElement */

  /** @type Matching */

  /**
   * @param {HTMLElement} form
   * @param {HTMLInputElement|HTMLSelectElement} input
   * @param {Matching} [matching]
   */
  constructor(form, input, matching) {
    _defineProperty(this, "form", void 0);

    _defineProperty(this, "matching", void 0);

    _defineProperty(this, "_isCCForm", undefined);

    this.form = form;
    this.matching = matching || new _matching.Matching(_matchingConfiguration.matchingConfiguration);
    /**
     * The signal is a continuum where negative values imply login and positive imply signup
     * @type {number}
     */

    this.autofillSignal = 0;
    /**
     * A hybrid form can be either a login or a signup, the site uses a single form for both
     * @type {number}
     */

    this.hybridSignal = 0;
    /**
     * Collects the signals for debugging purposes
     * @type {string[]}
     */

    this.signals = [];
    this.evaluateElAttributes(input, 1, true);
    form ? this.evaluateForm() : this.evaluatePage();
    return this;
  }
  /**
   * Hybrid forms can be used for both login and signup
   * @returns {boolean}
   */


  get isHybrid() {
    // When marking for hybrid we also want to ensure other signals are weak
    const areOtherSignalsWeak = Math.abs(this.autofillSignal) < 10;
    return this.hybridSignal > 0 && areOtherSignalsWeak;
  }

  get isLogin() {
    if (this.isHybrid) return false;
    return this.autofillSignal < 0;
  }

  get isSignup() {
    if (this.isHybrid) return false;
    return this.autofillSignal >= 0;
  }
  /**
   * Tilts the scoring towards Signup
   * @param {number} strength
   * @param {string} signal
   * @returns {FormAnalyzer}
   */


  increaseSignalBy(strength, signal) {
    this.autofillSignal += strength;
    this.signals.push("".concat(signal, ": +").concat(strength));
    return this;
  }
  /**
   * Tilts the scoring towards Login
   * @param {number} strength
   * @param {string} signal
   * @returns {FormAnalyzer}
   */


  decreaseSignalBy(strength, signal) {
    this.autofillSignal -= strength;
    this.signals.push("".concat(signal, ": -").concat(strength));
    return this;
  }
  /**
   * Increases the probability that this is a hybrid form (can be either login or signup)
   * @param {number} strength
   * @param {string} signal
   * @returns {FormAnalyzer}
   */


  increaseHybridSignal(strength, signal) {
    this.hybridSignal += strength;
    this.signals.push("".concat(signal, " (hybrid): +").concat(strength));
    return this;
  }
  /**
   * Updates the Login<->Signup signal according to the provided parameters
   * @param {object} p
   * @param {string} p.string - The string to check
   * @param {number} p.strength - Strength of the signal
   * @param {string} [p.signalType] - For debugging purposes, we give a name to the signal
   * @param {boolean} [p.shouldFlip] - Flips the signals, i.e. when a link points outside. See below
   * @param {boolean} [p.shouldCheckUnifiedForm] - Should check for login/signup forms
   * @param {boolean} [p.shouldBeConservative] - Should use the conservative signup regex
   * @returns {FormAnalyzer}
   */


  updateSignal(_ref) {
    var _this$matching$getDDG, _this$matching$getDDG2, _this$matching$getDDG3;

    let {
      string,
      strength,
      signalType = 'generic',
      shouldFlip = false,
      shouldCheckUnifiedForm = false,
      shouldBeConservative = false
    } = _ref;
    const matchesLogin = /current.?password/i.test(string) || ((_this$matching$getDDG = this.matching.getDDGMatcherRegex('loginRegex')) === null || _this$matching$getDDG === void 0 ? void 0 : _this$matching$getDDG.test(string)) || ((_this$matching$getDDG2 = this.matching.getDDGMatcherRegex('resetPasswordLink')) === null || _this$matching$getDDG2 === void 0 ? void 0 : _this$matching$getDDG2.test(string)); // Check explicitly for unified login/signup forms

    if (shouldCheckUnifiedForm && matchesLogin && (_this$matching$getDDG3 = this.matching.getDDGMatcherRegex('conservativeSignupRegex')) !== null && _this$matching$getDDG3 !== void 0 && _this$matching$getDDG3.test(string)) {
      this.increaseHybridSignal(strength, signalType);
      return this;
    }

    const signupRegexToUse = this.matching.getDDGMatcherRegex(shouldBeConservative ? 'conservativeSignupRegex' : 'signupRegex');
    const matchesSignup = /new.?password/i.test(string) || (signupRegexToUse === null || signupRegexToUse === void 0 ? void 0 : signupRegexToUse.test(string)); // In some cases a login match means the login is somewhere else, i.e. when a link points outside

    if (shouldFlip) {
      if (matchesLogin) this.increaseSignalBy(strength, signalType);
      if (matchesSignup) this.decreaseSignalBy(strength, signalType);
    } else {
      if (matchesLogin) this.decreaseSignalBy(strength, signalType);
      if (matchesSignup) this.increaseSignalBy(strength, signalType);
    }

    return this;
  }

  evaluateElAttributes(el) {
    let signalStrength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 3;
    let isInput = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    Array.from(el.attributes).forEach(attr => {
      if (attr.name === 'style') return;
      const attributeString = "".concat(attr.name, "=").concat(attr.value);
      this.updateSignal({
        string: attributeString,
        strength: signalStrength,
        signalType: "".concat(el.name, " attr: ").concat(attributeString),
        shouldCheckUnifiedForm: isInput
      });
    });
  }

  evaluateUrl() {
    var _this$matching$getDDG4, _this$matching$getDDG5;

    const path = window.location.pathname;
    const matchesLogin = (_this$matching$getDDG4 = this.matching.getDDGMatcherRegex('loginRegex')) === null || _this$matching$getDDG4 === void 0 ? void 0 : _this$matching$getDDG4.test(path);
    const matchesSignup = (_this$matching$getDDG5 = this.matching.getDDGMatcherRegex('conservativeSignupRegex')) === null || _this$matching$getDDG5 === void 0 ? void 0 : _this$matching$getDDG5.test(path); // If the url matches both, do nothing: the signal is probably confounding

    if (matchesLogin && matchesSignup) return;

    if (matchesLogin) {
      this.decreaseSignalBy(1, 'url matches login');
    }

    if (matchesSignup) {
      this.increaseSignalBy(1, 'url matches signup');
    }
  }

  evaluatePageTitle() {
    const pageTitle = document.title;
    this.updateSignal({
      string: pageTitle,
      strength: 2,
      signalType: "page title: ".concat(pageTitle),
      shouldCheckUnifiedForm: true
    });
  }

  evaluatePageHeadings() {
    const headings = document.querySelectorAll('h1, h2, h3, [class*="title"], [id*="title"]');
    headings.forEach(_ref2 => {
      let {
        textContent
      } = _ref2;
      textContent = (0, _matching.removeExcessWhitespace)(textContent || '');
      this.updateSignal({
        string: textContent,
        strength: 0.5,
        signalType: "heading: ".concat(textContent),
        shouldCheckUnifiedForm: true,
        shouldBeConservative: true
      });
    });
  }

  evaluatePage() {
    this.evaluatePageTitle();
    this.evaluatePageHeadings(); // Check for submit buttons

    const buttons = document.querySelectorAll(this.matching.cssSelector('submitButtonSelector'));
    buttons.forEach(button => {
      // if the button has a form, it's not related to our input, because our input has no form here
      if (button instanceof HTMLButtonElement) {
        if (!button.form && !button.closest('form')) {
          this.evaluateElement(button);
          this.evaluateElAttributes(button, 0.5);
        }
      }
    });
  }

  evaluateElement(el) {
    const string = (0, _autofillUtils.getTextShallow)(el);

    if (el.matches(this.matching.cssSelector('password'))) {
      // These are explicit signals by the web author, so we weigh them heavily
      this.updateSignal({
        string: el.getAttribute('autocomplete') || el.getAttribute('name') || '',
        strength: 5,
        signalType: "explicit: ".concat(el.getAttribute('autocomplete'))
      });
      return;
    } // check button contents


    if (el.matches(this.matching.cssSelector('submitButtonSelector') + ', *[class*=button]')) {
      // If we're confident this is the submit button, it's a stronger signal
      let likelyASubmit = (0, _autofillUtils.isLikelyASubmitButton)(el, this.matching);

      if (likelyASubmit) {
        this.form.querySelectorAll('input[type=submit], button[type=submit]').forEach(submit => {
          // If there is another element marked as submit and this is not, flip back to false
          if (el.type !== 'submit' && el !== submit) {
            likelyASubmit = false;
          }
        });
      }

      const strength = likelyASubmit ? 20 : 2;
      this.updateSignal({
        string,
        strength,
        signalType: "submit: ".concat(string)
      });
      return;
    } // if an external link matches one of the regexes, we assume the match is not pertinent to the current form


    if (el instanceof HTMLAnchorElement && el.href && el.getAttribute('href') !== '#' || (el.getAttribute('role') || '').toUpperCase() === 'LINK' || el.matches('button[class*=secondary]')) {
      var _this$matching$getDDG6, _this$matching$getDDG7;

      let shouldFlip = true;
      let strength = 1; // Don't flip forgotten password links

      if ((_this$matching$getDDG6 = this.matching.getDDGMatcherRegex('resetPasswordLink')) !== null && _this$matching$getDDG6 !== void 0 && _this$matching$getDDG6.test(string)) {
        shouldFlip = false;
        strength = 3;
      } else if ((_this$matching$getDDG7 = this.matching.getDDGMatcherRegex('loginProvidersRegex')) !== null && _this$matching$getDDG7 !== void 0 && _this$matching$getDDG7.test(string)) {
        // Don't flip login providers links
        shouldFlip = false;
      }

      this.updateSignal({
        string,
        strength,
        signalType: "external link: ".concat(string),
        shouldFlip
      });
    } else {
      var _removeExcessWhitespa;

      // any other case
      // only consider the el if it's a small text to avoid noisy disclaimers
      if (((_removeExcessWhitespa = (0, _matching.removeExcessWhitespace)(el.textContent)) === null || _removeExcessWhitespa === void 0 ? void 0 : _removeExcessWhitespa.length) < _constants.constants.TEXT_LENGTH_CUTOFF) {
        this.updateSignal({
          string,
          strength: 1,
          signalType: "generic: ".concat(string),
          shouldCheckUnifiedForm: true
        });
      }
    }
  }

  evaluateForm() {
    // Check page url
    this.evaluateUrl(); // Check page title

    this.evaluatePageTitle(); // Check form attributes

    this.evaluateElAttributes(this.form); // Check form contents (noisy elements are skipped with the safeUniversalSelector)

    this.form.querySelectorAll(this.matching.cssSelector('safeUniversalSelector')).forEach(el => {
      // Check if element is not hidden. Note that we can't use offsetHeight
      // nor intersectionObserver, because the element could be outside the
      // viewport or its parent hidden
      const displayValue = window.getComputedStyle(el, null).getPropertyValue('display');
      if (displayValue !== 'none') this.evaluateElement(el);
    }); // A form with many fields is unlikely to be a login form

    const relevantFields = this.form.querySelectorAll(this.matching.cssSelector('genericTextField'));

    if (relevantFields.length >= 4) {
      this.increaseSignalBy(relevantFields.length * 1.5, 'many fields: it is probably not a login');
    } // If we can't decide at this point, try reading page headings


    if (this.autofillSignal === 0) {
      this.evaluatePageHeadings();
    }

    return this;
  }
  /** @type {undefined|boolean} */


  /**
   * Tries to infer if it's a credit card form
   * @returns {boolean}
   */
  isCCForm() {
    var _formEl$textContent;

    if (this._isCCForm !== undefined) return this._isCCForm;
    const formEl = this.form;
    const ccFieldSelector = this.matching.joinCssSelectors('cc');

    if (!ccFieldSelector) {
      this._isCCForm = false;
      return this._isCCForm;
    }

    const hasCCSelectorChild = formEl.matches(ccFieldSelector) || formEl.querySelector(ccFieldSelector); // If the form contains one of the specific selectors, we have high confidence

    if (hasCCSelectorChild) {
      this._isCCForm = true;
      return this._isCCForm;
    } // Read form attributes to find a signal


    const hasCCAttribute = [...formEl.attributes].some(_ref3 => {
      let {
        name,
        value
      } = _ref3;
      return /(credit|payment).?card/i.test("".concat(name, "=").concat(value));
    });

    if (hasCCAttribute) {
      this._isCCForm = true;
      return this._isCCForm;
    } // Match form textContent against common cc fields (includes hidden labels)


    const textMatches = (_formEl$textContent = formEl.textContent) === null || _formEl$textContent === void 0 ? void 0 : _formEl$textContent.match(/(credit|payment).?card(.?number)?|ccv|security.?code|cvv|cvc|csc/ig); // We check for more than one to minimise false positives

    this._isCCForm = Boolean(textMatches && textMatches.length > 1);
    return this._isCCForm;
  }

}

var _default = FormAnalyzer;
exports.default = _default;

},{"../autofill-utils.js":55,"../constants.js":58,"./matching-configuration.js":33,"./matching.js":35}],27:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.COUNTRY_NAMES_TO_CODES = exports.COUNTRY_CODES_TO_NAMES = void 0;

/**
 * Country names object using 2-letter country codes to reference country name
 * Derived from the Intl.DisplayNames implementation
 * @source https://stackoverflow.com/a/70517921/1948947
 */
const COUNTRY_CODES_TO_NAMES = {
  AC: 'Ascension Island',
  AD: 'Andorra',
  AE: 'United Arab Emirates',
  AF: 'Afghanistan',
  AG: 'Antigua & Barbuda',
  AI: 'Anguilla',
  AL: 'Albania',
  AM: 'Armenia',
  AN: 'Curaçao',
  AO: 'Angola',
  AQ: 'Antarctica',
  AR: 'Argentina',
  AS: 'American Samoa',
  AT: 'Austria',
  AU: 'Australia',
  AW: 'Aruba',
  AX: 'Åland Islands',
  AZ: 'Azerbaijan',
  BA: 'Bosnia & Herzegovina',
  BB: 'Barbados',
  BD: 'Bangladesh',
  BE: 'Belgium',
  BF: 'Burkina Faso',
  BG: 'Bulgaria',
  BH: 'Bahrain',
  BI: 'Burundi',
  BJ: 'Benin',
  BL: 'St. Barthélemy',
  BM: 'Bermuda',
  BN: 'Brunei',
  BO: 'Bolivia',
  BQ: 'Caribbean Netherlands',
  BR: 'Brazil',
  BS: 'Bahamas',
  BT: 'Bhutan',
  BU: 'Myanmar (Burma)',
  BV: 'Bouvet Island',
  BW: 'Botswana',
  BY: 'Belarus',
  BZ: 'Belize',
  CA: 'Canada',
  CC: 'Cocos (Keeling) Islands',
  CD: 'Congo - Kinshasa',
  CF: 'Central African Republic',
  CG: 'Congo - Brazzaville',
  CH: 'Switzerland',
  CI: 'Côte d’Ivoire',
  CK: 'Cook Islands',
  CL: 'Chile',
  CM: 'Cameroon',
  CN: 'China mainland',
  CO: 'Colombia',
  CP: 'Clipperton Island',
  CR: 'Costa Rica',
  CS: 'Serbia',
  CU: 'Cuba',
  CV: 'Cape Verde',
  CW: 'Curaçao',
  CX: 'Christmas Island',
  CY: 'Cyprus',
  CZ: 'Czechia',
  DD: 'Germany',
  DE: 'Germany',
  DG: 'Diego Garcia',
  DJ: 'Djibouti',
  DK: 'Denmark',
  DM: 'Dominica',
  DO: 'Dominican Republic',
  DY: 'Benin',
  DZ: 'Algeria',
  EA: 'Ceuta & Melilla',
  EC: 'Ecuador',
  EE: 'Estonia',
  EG: 'Egypt',
  EH: 'Western Sahara',
  ER: 'Eritrea',
  ES: 'Spain',
  ET: 'Ethiopia',
  EU: 'European Union',
  EZ: 'Eurozone',
  FI: 'Finland',
  FJ: 'Fiji',
  FK: 'Falkland Islands',
  FM: 'Micronesia',
  FO: 'Faroe Islands',
  FR: 'France',
  FX: 'France',
  GA: 'Gabon',
  GB: 'United Kingdom',
  GD: 'Grenada',
  GE: 'Georgia',
  GF: 'French Guiana',
  GG: 'Guernsey',
  GH: 'Ghana',
  GI: 'Gibraltar',
  GL: 'Greenland',
  GM: 'Gambia',
  GN: 'Guinea',
  GP: 'Guadeloupe',
  GQ: 'Equatorial Guinea',
  GR: 'Greece',
  GS: 'So. Georgia & So. Sandwich Isl.',
  GT: 'Guatemala',
  GU: 'Guam',
  GW: 'Guinea-Bissau',
  GY: 'Guyana',
  HK: 'Hong Kong',
  HM: 'Heard & McDonald Islands',
  HN: 'Honduras',
  HR: 'Croatia',
  HT: 'Haiti',
  HU: 'Hungary',
  HV: 'Burkina Faso',
  IC: 'Canary Islands',
  ID: 'Indonesia',
  IE: 'Ireland',
  IL: 'Israel',
  IM: 'Isle of Man',
  IN: 'India',
  IO: 'Chagos Archipelago',
  IQ: 'Iraq',
  IR: 'Iran',
  IS: 'Iceland',
  IT: 'Italy',
  JE: 'Jersey',
  JM: 'Jamaica',
  JO: 'Jordan',
  JP: 'Japan',
  KE: 'Kenya',
  KG: 'Kyrgyzstan',
  KH: 'Cambodia',
  KI: 'Kiribati',
  KM: 'Comoros',
  KN: 'St. Kitts & Nevis',
  KP: 'North Korea',
  KR: 'South Korea',
  KW: 'Kuwait',
  KY: 'Cayman Islands',
  KZ: 'Kazakhstan',
  LA: 'Laos',
  LB: 'Lebanon',
  LC: 'St. Lucia',
  LI: 'Liechtenstein',
  LK: 'Sri Lanka',
  LR: 'Liberia',
  LS: 'Lesotho',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  LV: 'Latvia',
  LY: 'Libya',
  MA: 'Morocco',
  MC: 'Monaco',
  MD: 'Moldova',
  ME: 'Montenegro',
  MF: 'St. Martin',
  MG: 'Madagascar',
  MH: 'Marshall Islands',
  MK: 'North Macedonia',
  ML: 'Mali',
  MM: 'Myanmar (Burma)',
  MN: 'Mongolia',
  MO: 'Macao',
  MP: 'Northern Mariana Islands',
  MQ: 'Martinique',
  MR: 'Mauritania',
  MS: 'Montserrat',
  MT: 'Malta',
  MU: 'Mauritius',
  MV: 'Maldives',
  MW: 'Malawi',
  MX: 'Mexico',
  MY: 'Malaysia',
  MZ: 'Mozambique',
  NA: 'Namibia',
  NC: 'New Caledonia',
  NE: 'Niger',
  NF: 'Norfolk Island',
  NG: 'Nigeria',
  NH: 'Vanuatu',
  NI: 'Nicaragua',
  NL: 'Netherlands',
  NO: 'Norway',
  NP: 'Nepal',
  NR: 'Nauru',
  NU: 'Niue',
  NZ: 'New Zealand',
  OM: 'Oman',
  PA: 'Panama',
  PE: 'Peru',
  PF: 'French Polynesia',
  PG: 'Papua New Guinea',
  PH: 'Philippines',
  PK: 'Pakistan',
  PL: 'Poland',
  PM: 'St. Pierre & Miquelon',
  PN: 'Pitcairn Islands',
  PR: 'Puerto Rico',
  PS: 'Palestinian Territories',
  PT: 'Portugal',
  PW: 'Palau',
  PY: 'Paraguay',
  QA: 'Qatar',
  QO: 'Outlying Oceania',
  RE: 'Réunion',
  RH: 'Zimbabwe',
  RO: 'Romania',
  RS: 'Serbia',
  RU: 'Russia',
  RW: 'Rwanda',
  SA: 'Saudi Arabia',
  SB: 'Solomon Islands',
  SC: 'Seychelles',
  SD: 'Sudan',
  SE: 'Sweden',
  SG: 'Singapore',
  SH: 'St. Helena',
  SI: 'Slovenia',
  SJ: 'Svalbard & Jan Mayen',
  SK: 'Slovakia',
  SL: 'Sierra Leone',
  SM: 'San Marino',
  SN: 'Senegal',
  SO: 'Somalia',
  SR: 'Suriname',
  SS: 'South Sudan',
  ST: 'São Tomé & Príncipe',
  SU: 'Russia',
  SV: 'El Salvador',
  SX: 'Sint Maarten',
  SY: 'Syria',
  SZ: 'Eswatini',
  TA: 'Tristan da Cunha',
  TC: 'Turks & Caicos Islands',
  TD: 'Chad',
  TF: 'French Southern Territories',
  TG: 'Togo',
  TH: 'Thailand',
  TJ: 'Tajikistan',
  TK: 'Tokelau',
  TL: 'Timor-Leste',
  TM: 'Turkmenistan',
  TN: 'Tunisia',
  TO: 'Tonga',
  TP: 'Timor-Leste',
  TR: 'Turkey',
  TT: 'Trinidad & Tobago',
  TV: 'Tuvalu',
  TW: 'Taiwan',
  TZ: 'Tanzania',
  UA: 'Ukraine',
  UG: 'Uganda',
  UK: 'United Kingdom',
  UM: 'U.S. Outlying Islands',
  UN: 'United Nations',
  US: 'United States',
  UY: 'Uruguay',
  UZ: 'Uzbekistan',
  VA: 'Vatican City',
  VC: 'St. Vincent & Grenadines',
  VD: 'Vietnam',
  VE: 'Venezuela',
  VG: 'British Virgin Islands',
  VI: 'U.S. Virgin Islands',
  VN: 'Vietnam',
  VU: 'Vanuatu',
  WF: 'Wallis & Futuna',
  WS: 'Samoa',
  XA: 'Pseudo-Accents',
  XB: 'Pseudo-Bidi',
  XK: 'Kosovo',
  YD: 'Yemen',
  YE: 'Yemen',
  YT: 'Mayotte',
  YU: 'Serbia',
  ZA: 'South Africa',
  ZM: 'Zambia',
  ZR: 'Congo - Kinshasa',
  ZW: 'Zimbabwe',
  ZZ: 'Unknown Region'
};
/**
 * Country names object using country name to reference 2-letter country codes
 * Derived from the solution above with
 * Object.fromEntries(Object.entries(COUNTRY_CODES_TO_NAMES).map(entry => [entry[1], entry[0]]))
 */

exports.COUNTRY_CODES_TO_NAMES = COUNTRY_CODES_TO_NAMES;
const COUNTRY_NAMES_TO_CODES = {
  'Ascension Island': 'AC',
  Andorra: 'AD',
  'United Arab Emirates': 'AE',
  Afghanistan: 'AF',
  'Antigua & Barbuda': 'AG',
  Anguilla: 'AI',
  Albania: 'AL',
  Armenia: 'AM',
  'Curaçao': 'CW',
  Angola: 'AO',
  Antarctica: 'AQ',
  Argentina: 'AR',
  'American Samoa': 'AS',
  Austria: 'AT',
  Australia: 'AU',
  Aruba: 'AW',
  'Åland Islands': 'AX',
  Azerbaijan: 'AZ',
  'Bosnia & Herzegovina': 'BA',
  Barbados: 'BB',
  Bangladesh: 'BD',
  Belgium: 'BE',
  'Burkina Faso': 'HV',
  Bulgaria: 'BG',
  Bahrain: 'BH',
  Burundi: 'BI',
  Benin: 'DY',
  'St. Barthélemy': 'BL',
  Bermuda: 'BM',
  Brunei: 'BN',
  Bolivia: 'BO',
  'Caribbean Netherlands': 'BQ',
  Brazil: 'BR',
  Bahamas: 'BS',
  Bhutan: 'BT',
  'Myanmar (Burma)': 'MM',
  'Bouvet Island': 'BV',
  Botswana: 'BW',
  Belarus: 'BY',
  Belize: 'BZ',
  Canada: 'CA',
  'Cocos (Keeling) Islands': 'CC',
  'Congo - Kinshasa': 'ZR',
  'Central African Republic': 'CF',
  'Congo - Brazzaville': 'CG',
  Switzerland: 'CH',
  'Côte d’Ivoire': 'CI',
  'Cook Islands': 'CK',
  Chile: 'CL',
  Cameroon: 'CM',
  'China mainland': 'CN',
  Colombia: 'CO',
  'Clipperton Island': 'CP',
  'Costa Rica': 'CR',
  Serbia: 'YU',
  Cuba: 'CU',
  'Cape Verde': 'CV',
  'Christmas Island': 'CX',
  Cyprus: 'CY',
  Czechia: 'CZ',
  Germany: 'DE',
  'Diego Garcia': 'DG',
  Djibouti: 'DJ',
  Denmark: 'DK',
  Dominica: 'DM',
  'Dominican Republic': 'DO',
  Algeria: 'DZ',
  'Ceuta & Melilla': 'EA',
  Ecuador: 'EC',
  Estonia: 'EE',
  Egypt: 'EG',
  'Western Sahara': 'EH',
  Eritrea: 'ER',
  Spain: 'ES',
  Ethiopia: 'ET',
  'European Union': 'EU',
  Eurozone: 'EZ',
  Finland: 'FI',
  Fiji: 'FJ',
  'Falkland Islands': 'FK',
  Micronesia: 'FM',
  'Faroe Islands': 'FO',
  France: 'FX',
  Gabon: 'GA',
  'United Kingdom': 'UK',
  Grenada: 'GD',
  Georgia: 'GE',
  'French Guiana': 'GF',
  Guernsey: 'GG',
  Ghana: 'GH',
  Gibraltar: 'GI',
  Greenland: 'GL',
  Gambia: 'GM',
  Guinea: 'GN',
  Guadeloupe: 'GP',
  'Equatorial Guinea': 'GQ',
  Greece: 'GR',
  'So. Georgia & So. Sandwich Isl.': 'GS',
  Guatemala: 'GT',
  Guam: 'GU',
  'Guinea-Bissau': 'GW',
  Guyana: 'GY',
  'Hong Kong': 'HK',
  'Heard & McDonald Islands': 'HM',
  Honduras: 'HN',
  Croatia: 'HR',
  Haiti: 'HT',
  Hungary: 'HU',
  'Canary Islands': 'IC',
  Indonesia: 'ID',
  Ireland: 'IE',
  Israel: 'IL',
  'Isle of Man': 'IM',
  India: 'IN',
  'Chagos Archipelago': 'IO',
  Iraq: 'IQ',
  Iran: 'IR',
  Iceland: 'IS',
  Italy: 'IT',
  Jersey: 'JE',
  Jamaica: 'JM',
  Jordan: 'JO',
  Japan: 'JP',
  Kenya: 'KE',
  Kyrgyzstan: 'KG',
  Cambodia: 'KH',
  Kiribati: 'KI',
  Comoros: 'KM',
  'St. Kitts & Nevis': 'KN',
  'North Korea': 'KP',
  'South Korea': 'KR',
  Kuwait: 'KW',
  'Cayman Islands': 'KY',
  Kazakhstan: 'KZ',
  Laos: 'LA',
  Lebanon: 'LB',
  'St. Lucia': 'LC',
  Liechtenstein: 'LI',
  'Sri Lanka': 'LK',
  Liberia: 'LR',
  Lesotho: 'LS',
  Lithuania: 'LT',
  Luxembourg: 'LU',
  Latvia: 'LV',
  Libya: 'LY',
  Morocco: 'MA',
  Monaco: 'MC',
  Moldova: 'MD',
  Montenegro: 'ME',
  'St. Martin': 'MF',
  Madagascar: 'MG',
  'Marshall Islands': 'MH',
  'North Macedonia': 'MK',
  Mali: 'ML',
  Mongolia: 'MN',
  Macao: 'MO',
  'Northern Mariana Islands': 'MP',
  Martinique: 'MQ',
  Mauritania: 'MR',
  Montserrat: 'MS',
  Malta: 'MT',
  Mauritius: 'MU',
  Maldives: 'MV',
  Malawi: 'MW',
  Mexico: 'MX',
  Malaysia: 'MY',
  Mozambique: 'MZ',
  Namibia: 'NA',
  'New Caledonia': 'NC',
  Niger: 'NE',
  'Norfolk Island': 'NF',
  Nigeria: 'NG',
  Vanuatu: 'VU',
  Nicaragua: 'NI',
  Netherlands: 'NL',
  Norway: 'NO',
  Nepal: 'NP',
  Nauru: 'NR',
  Niue: 'NU',
  'New Zealand': 'NZ',
  Oman: 'OM',
  Panama: 'PA',
  Peru: 'PE',
  'French Polynesia': 'PF',
  'Papua New Guinea': 'PG',
  Philippines: 'PH',
  Pakistan: 'PK',
  Poland: 'PL',
  'St. Pierre & Miquelon': 'PM',
  'Pitcairn Islands': 'PN',
  'Puerto Rico': 'PR',
  'Palestinian Territories': 'PS',
  Portugal: 'PT',
  Palau: 'PW',
  Paraguay: 'PY',
  Qatar: 'QA',
  'Outlying Oceania': 'QO',
  'Réunion': 'RE',
  Zimbabwe: 'ZW',
  Romania: 'RO',
  Russia: 'SU',
  Rwanda: 'RW',
  'Saudi Arabia': 'SA',
  'Solomon Islands': 'SB',
  Seychelles: 'SC',
  Sudan: 'SD',
  Sweden: 'SE',
  Singapore: 'SG',
  'St. Helena': 'SH',
  Slovenia: 'SI',
  'Svalbard & Jan Mayen': 'SJ',
  Slovakia: 'SK',
  'Sierra Leone': 'SL',
  'San Marino': 'SM',
  Senegal: 'SN',
  Somalia: 'SO',
  Suriname: 'SR',
  'South Sudan': 'SS',
  'São Tomé & Príncipe': 'ST',
  'El Salvador': 'SV',
  'Sint Maarten': 'SX',
  Syria: 'SY',
  Eswatini: 'SZ',
  'Tristan da Cunha': 'TA',
  'Turks & Caicos Islands': 'TC',
  Chad: 'TD',
  'French Southern Territories': 'TF',
  Togo: 'TG',
  Thailand: 'TH',
  Tajikistan: 'TJ',
  Tokelau: 'TK',
  'Timor-Leste': 'TP',
  Turkmenistan: 'TM',
  Tunisia: 'TN',
  Tonga: 'TO',
  Turkey: 'TR',
  'Trinidad & Tobago': 'TT',
  Tuvalu: 'TV',
  Taiwan: 'TW',
  Tanzania: 'TZ',
  Ukraine: 'UA',
  Uganda: 'UG',
  'U.S. Outlying Islands': 'UM',
  'United Nations': 'UN',
  'United States': 'US',
  Uruguay: 'UY',
  Uzbekistan: 'UZ',
  'Vatican City': 'VA',
  'St. Vincent & Grenadines': 'VC',
  Vietnam: 'VN',
  Venezuela: 'VE',
  'British Virgin Islands': 'VG',
  'U.S. Virgin Islands': 'VI',
  'Wallis & Futuna': 'WF',
  Samoa: 'WS',
  'Pseudo-Accents': 'XA',
  'Pseudo-Bidi': 'XB',
  Kosovo: 'XK',
  Yemen: 'YE',
  Mayotte: 'YT',
  'South Africa': 'ZA',
  Zambia: 'ZM',
  'Unknown Region': 'ZZ'
};
exports.COUNTRY_NAMES_TO_CODES = COUNTRY_NAMES_TO_CODES;

},{}],28:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prepareFormValuesForStorage = exports.inferCountryCodeFromElement = exports.getUnifiedExpiryDate = exports.getMMAndYYYYFromString = exports.getCountryName = exports.getCountryDisplayName = exports.formatPhoneNumber = exports.formatFullName = exports.formatCCYear = void 0;

var _matching = require("./matching.js");

var _countryNames = require("./countryNames.js");

var _templateObject, _templateObject2;

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

// Matches strings like mm/yy, mm-yyyy, mm-aa, 12 / 2024
const DATE_SEPARATOR_REGEX = /\b((.)\2{1,3}|\d+)(?<separator>\s?[/\s.\-_—–]\s?)((.)\5{1,3}|\d+)\b/i; // Matches 4 non-digit repeated characters (YYYY or AAAA) or 4 digits (2022)

const FOUR_DIGIT_YEAR_REGEX = /(\D)\1{3}|\d{4}/i;
/**
 * Format the cc year to best adapt to the input requirements (YY vs YYYY)
 * @param {HTMLInputElement} input
 * @param {string} year
 * @param {import("./Form").Form} form
 * @returns {string}
 */

const formatCCYear = (input, year, form) => {
  const selector = form.matching.cssSelector('formInputsSelector');
  if (input.maxLength === 4 || (0, _matching.checkPlaceholderAndLabels)(input, FOUR_DIGIT_YEAR_REGEX, form.form, selector)) return year;
  return "".concat(Number(year) - 2000);
};
/**
 * Get a unified expiry date with separator
 * @param {HTMLInputElement} input
 * @param {string} month
 * @param {string} year
 * @param {import("./Form").Form} form
 * @returns {string}
 */


exports.formatCCYear = formatCCYear;

const getUnifiedExpiryDate = (input, month, year, form) => {
  var _matchInPlaceholderAn, _matchInPlaceholderAn2;

  const formattedYear = formatCCYear(input, year, form);
  const paddedMonth = "".concat(month).padStart(2, '0');
  const cssSelector = form.matching.cssSelector('formInputsSelector');
  const separator = ((_matchInPlaceholderAn = (0, _matching.matchInPlaceholderAndLabels)(input, DATE_SEPARATOR_REGEX, form.form, cssSelector)) === null || _matchInPlaceholderAn === void 0 ? void 0 : (_matchInPlaceholderAn2 = _matchInPlaceholderAn.groups) === null || _matchInPlaceholderAn2 === void 0 ? void 0 : _matchInPlaceholderAn2.separator) || '/';
  return "".concat(paddedMonth).concat(separator).concat(formattedYear);
};

exports.getUnifiedExpiryDate = getUnifiedExpiryDate;

const formatFullName = _ref => {
  let {
    firstName = '',
    middleName = '',
    lastName = ''
  } = _ref;
  return "".concat(firstName, " ").concat(middleName ? middleName + ' ' : '').concat(lastName).trim();
};
/**
 * Tries to look up a human-readable country name from the country code
 * @param {string} locale
 * @param {string} addressCountryCode
 * @return {string} - Returns the country code if we can't find a name
 */


exports.formatFullName = formatFullName;

const getCountryDisplayName = (locale, addressCountryCode) => {
  try {
    const regionNames = new Intl.DisplayNames([locale], {
      type: 'region'
    }); // Adding this ts-ignore to prevent having to change this implementation.
    // @ts-ignore

    return regionNames.of(addressCountryCode);
  } catch (e) {
    return _countryNames.COUNTRY_CODES_TO_NAMES[addressCountryCode] || addressCountryCode;
  }
};
/**
 * Tries to infer the element locale or returns 'en'
 * @param {HTMLInputElement | HTMLSelectElement} el
 * @return {string | 'en'}
 */


exports.getCountryDisplayName = getCountryDisplayName;

const inferElementLocale = el => {
  var _el$form;

  return el.lang || ((_el$form = el.form) === null || _el$form === void 0 ? void 0 : _el$form.lang) || document.body.lang || document.documentElement.lang || 'en';
};
/**
 * Tries to format the country code into a localised country name
 * @param {HTMLInputElement | HTMLSelectElement} el
 * @param {{addressCountryCode?: string}} options
 */


const getCountryName = function (el) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const {
    addressCountryCode
  } = options;
  if (!addressCountryCode) return ''; // Try to infer the field language or fallback to en

  const elLocale = inferElementLocale(el);
  const localisedCountryName = getCountryDisplayName(elLocale, addressCountryCode); // If it's a select el we try to find a suitable match to autofill

  if (el.nodeName === 'SELECT') {
    const englishCountryName = getCountryDisplayName('en', addressCountryCode); // This regex matches both the localised and English country names

    const countryNameRegex = new RegExp(String.raw(_templateObject || (_templateObject = _taggedTemplateLiteral(["", "|", ""])), localisedCountryName.replace(/ /g, '.?'), englishCountryName.replace(/ /g, '.?')), 'i');
    const countryCodeRegex = new RegExp(String.raw(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["\b", "\b"], ["\\b", "\\b"])), addressCountryCode), 'i'); // We check the country code first because it's more accurate

    if (el instanceof HTMLSelectElement) {
      for (const option of el.options) {
        if (countryCodeRegex.test(option.value)) {
          return option.value;
        }
      }

      for (const option of el.options) {
        if (countryNameRegex.test(option.value) || countryNameRegex.test(option.innerText)) return option.value;
      }
    }
  }

  return localisedCountryName;
};
/**
 * Try to get a map of localised country names to code, or falls back to the English map
 * @param {HTMLInputElement | HTMLSelectElement} el
 */


exports.getCountryName = getCountryName;

const getLocalisedCountryNamesToCodes = el => {
  if (typeof Intl.DisplayNames !== 'function') return _countryNames.COUNTRY_NAMES_TO_CODES; // Try to infer the field language or fallback to en

  const elLocale = inferElementLocale(el);
  return Object.fromEntries(Object.entries(_countryNames.COUNTRY_CODES_TO_NAMES).map(_ref2 => {
    let [code] = _ref2;
    return [getCountryDisplayName(elLocale, code), code];
  }));
};
/**
 * Try to infer a country code from an element we identified as identities.addressCountryCode
 * @param {HTMLInputElement | HTMLSelectElement} el
 * @return {string}
 */


const inferCountryCodeFromElement = el => {
  if (_countryNames.COUNTRY_CODES_TO_NAMES[el.value]) return el.value;
  if (_countryNames.COUNTRY_NAMES_TO_CODES[el.value]) return _countryNames.COUNTRY_NAMES_TO_CODES[el.value];
  const localisedCountryNamesToCodes = getLocalisedCountryNamesToCodes(el);
  if (localisedCountryNamesToCodes[el.value]) return localisedCountryNamesToCodes[el.value];

  if (el instanceof HTMLSelectElement) {
    var _el$selectedOptions$;

    const selectedText = (_el$selectedOptions$ = el.selectedOptions[0]) === null || _el$selectedOptions$ === void 0 ? void 0 : _el$selectedOptions$.text;
    if (_countryNames.COUNTRY_CODES_TO_NAMES[selectedText]) return selectedText;
    if (_countryNames.COUNTRY_NAMES_TO_CODES[selectedText]) return localisedCountryNamesToCodes[selectedText];
    if (localisedCountryNamesToCodes[selectedText]) return localisedCountryNamesToCodes[selectedText];
  }

  return '';
};
/**
 * Gets separate expiration month and year from a single string
 * @param {string} expiration
 * @return {{expirationYear: string, expirationMonth: string}}
 */


exports.inferCountryCodeFromElement = inferCountryCodeFromElement;

const getMMAndYYYYFromString = expiration => {
  /** @type {string[]} */
  const values = expiration.match(/(\d+)/g) || [];
  return values === null || values === void 0 ? void 0 : values.reduce((output, current) => {
    if (Number(current) > 12) {
      output.expirationYear = current.padStart(4, '20');
    } else {
      output.expirationMonth = current.padStart(2, '0');
    }

    return output;
  }, {
    expirationYear: '',
    expirationMonth: ''
  });
};
/**
 * @param {InternalDataStorageObject} credentials
 * @return {boolean}
 */


exports.getMMAndYYYYFromString = getMMAndYYYYFromString;

const shouldStoreCredentials = _ref3 => {
  let {
    credentials
  } = _ref3;
  return Boolean(credentials.password);
};
/**
 * @param {InternalDataStorageObject} credentials
 * @return {boolean}
 */


const shouldStoreIdentities = _ref4 => {
  let {
    identities
  } = _ref4;
  return Boolean((identities.firstName || identities.fullName) && identities.addressStreet && identities.addressCity);
};
/**
 * @param {InternalDataStorageObject} credentials
 * @return {boolean}
 */


const shouldStoreCreditCards = _ref5 => {
  let {
    creditCards
  } = _ref5;
  if (!creditCards.cardNumber) return false;
  if (creditCards.cardSecurityCode) return true; // Some forms (Amazon) don't have the cvv, so we still save if there's the expiration

  if (creditCards.expiration) return true; // Expiration can also be two separate values

  return Boolean(creditCards.expirationYear && creditCards.expirationMonth);
};
/**
 * Removes formatting characters from phone numbers, only leaves digits and the + sign
 * @param {String} phone
 * @returns {String}
 */


const formatPhoneNumber = phone => phone.replaceAll(/[^0-9|+]/g, '');
/**
 * Formats form data into an object to send to the device for storage
 * If values are insufficient for a complete entry, they are discarded
 * @param {InternalDataStorageObject} formValues
 * @return {DataStorageObject}
 */


exports.formatPhoneNumber = formatPhoneNumber;

const prepareFormValuesForStorage = formValues => {
  var _identities, _identities2;

  /** @type {Partial<InternalDataStorageObject>} */
  let {
    credentials,
    identities,
    creditCards
  } = formValues; // If we have an identity name but not a card name, copy it over there

  if (!creditCards.cardName && ((_identities = identities) !== null && _identities !== void 0 && _identities.fullName || (_identities2 = identities) !== null && _identities2 !== void 0 && _identities2.firstName)) {
    var _identities3;

    creditCards.cardName = ((_identities3 = identities) === null || _identities3 === void 0 ? void 0 : _identities3.fullName) || formatFullName(identities);
  }
  /** Fixes for credentials **/
  // Don't store if there isn't enough data


  if (shouldStoreCredentials(formValues)) {
    // If we don't have a username to match a password, let's see if the email is available
    if (credentials.password && !credentials.username && identities.emailAddress) {
      credentials.username = identities.emailAddress;
    }
  } else {
    credentials = undefined;
  }
  /** Fixes for identities **/
  // Don't store if there isn't enough data


  if (shouldStoreIdentities(formValues)) {
    if (identities.fullName) {
      // when forms have both first/last and fullName we keep the individual values and drop the fullName
      if (!(identities.firstName && identities.lastName)) {
        // If the fullname can be easily split into two, we'll store it as first and last
        const nameParts = identities.fullName.trim().split(/\s+/);

        if (nameParts.length === 2) {
          identities.firstName = nameParts[0];
          identities.lastName = nameParts[1];
        } else {
          // If we can't split it, just store it as first name
          identities.firstName = identities.fullName;
        }
      }

      delete identities.fullName;
    }

    if (identities.phone) {
      identities.phone = formatPhoneNumber(identities.phone);
    }
  } else {
    identities = undefined;
  }
  /** Fixes for credit cards **/
  // Don't store if there isn't enough data


  if (shouldStoreCreditCards(formValues)) {
    var _creditCards$expirati;

    if (creditCards.expiration) {
      const {
        expirationMonth,
        expirationYear
      } = getMMAndYYYYFromString(creditCards.expiration);
      creditCards.expirationMonth = expirationMonth;
      creditCards.expirationYear = expirationYear;
      delete creditCards.expiration;
    }

    creditCards.expirationYear = (_creditCards$expirati = creditCards.expirationYear) === null || _creditCards$expirati === void 0 ? void 0 : _creditCards$expirati.padStart(4, '20');

    if (creditCards.cardNumber) {
      creditCards.cardNumber = creditCards.cardNumber.replace(/\D/g, '');
    }
  } else {
    creditCards = undefined;
  }

  return {
    credentials,
    identities,
    creditCards
  };
};

exports.prepareFormValuesForStorage = prepareFormValuesForStorage;

},{"./countryNames.js":27,"./matching.js":35}],29:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getIconStylesBase = exports.getIconStylesAutofilled = exports.getIconStylesAlternate = void 0;

var _inputTypeConfig = require("./inputTypeConfig.js");

/**
 * Returns the css-ready base64 encoding of the icon for the given input
 * @param {HTMLInputElement} input
 * @param {import("./Form").Form} form
 * @param {'base' | 'filled' | 'alternate'} type
 * @return {string}
 */
const getIcon = function (input, form) {
  let type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'base';
  const config = (0, _inputTypeConfig.getInputConfig)(input);

  if (type === 'base') {
    return config.getIconBase(input, form);
  }

  if (type === 'filled') {
    return config.getIconFilled(input, form);
  }

  if (type === 'alternate') {
    return config.getIconAlternate(input, form);
  }

  return '';
};
/**
 * Returns an object with styles to be applied inline
 * @param {HTMLInputElement} input
 * @param {String} icon
 * @return {Object<string, string>}
 */


const getBasicStyles = (input, icon) => ({
  // Height must be > 0 to account for fields initially hidden
  'background-size': "auto ".concat(input.offsetHeight <= 30 && input.offsetHeight > 0 ? '100%' : '24px'),
  'background-position': 'center right',
  'background-repeat': 'no-repeat',
  'background-origin': 'content-box',
  'background-image': "url(".concat(icon, ")"),
  'transition': 'background 0s'
});
/**
 * Get inline styles for the injected icon, base state
 * @param {HTMLInputElement} input
 * @param {import("./Form").Form} form
 * @return {Object<string, string>}
 */


const getIconStylesBase = (input, form) => {
  const icon = getIcon(input, form);
  if (!icon) return {};
  return getBasicStyles(input, icon);
};
/**
 * Get inline styles for the injected icon, alternate state
 * @param {HTMLInputElement} input
 * @param {import("./Form").Form} form
 * @return {Object<string, string>}
 */


exports.getIconStylesBase = getIconStylesBase;

const getIconStylesAlternate = (input, form) => {
  const icon = getIcon(input, form, 'alternate');
  if (!icon) return {};
  return { ...getBasicStyles(input, icon)
  };
};
/**
 * Get inline styles for the injected icon, autofilled state
 * @param {HTMLInputElement} input
 * @param {import("./Form").Form} form
 * @return {Object<string, string>}
 */


exports.getIconStylesAlternate = getIconStylesAlternate;

const getIconStylesAutofilled = (input, form) => {
  const icon = getIcon(input, form, 'filled');
  const iconStyle = icon ? getBasicStyles(input, icon) : {};
  return { ...iconStyle,
    'background-color': '#F8F498',
    'color': '#333333'
  };
};

exports.getIconStylesAutofilled = getIconStylesAutofilled;

},{"./inputTypeConfig.js":30}],30:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isFieldDecorated = exports.getInputConfigFromType = exports.getInputConfig = exports.canBeInteractedWith = void 0;

var _logoSvg = require("./logo-svg.js");

var ddgPasswordIcons = _interopRequireWildcard(require("../UI/img/ddgPasswordIcon.js"));

var _matching = require("./matching.js");

var _Credentials = require("../InputTypes/Credentials.js");

var _CreditCard = require("../InputTypes/CreditCard.js");

var _Identity = require("../InputTypes/Identity.js");

var _constants = require("../constants.js");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * Get the icon for the identities (currently only Dax for emails)
 * @param {HTMLInputElement} input
 * @param {import("./Form").Form} form
 * @return {string}
 */
const getIdentitiesIcon = (input, _ref) => {
  var _device$inContextSign;

  let {
    device
  } = _ref;
  if (!canBeInteractedWith(input)) return ''; // In Firefox web_accessible_resources could leak a unique user identifier, so we avoid it here

  const {
    isDDGApp,
    isFirefox,
    isExtension
  } = device.globalConfig;
  const subtype = (0, _matching.getInputSubtype)(input);

  if ((_device$inContextSign = device.inContextSignup) !== null && _device$inContextSign !== void 0 && _device$inContextSign.isAvailable(subtype)) {
    if (isDDGApp || isFirefox) {
      return _logoSvg.daxGrayscaleBase64;
    } else if (isExtension) {
      return chrome.runtime.getURL('img/logo-small-grayscale.svg');
    }
  }

  if (subtype === 'emailAddress' && device.isDeviceSignedIn()) {
    if (isDDGApp || isFirefox) {
      return _logoSvg.daxBase64;
    } else if (isExtension) {
      return chrome.runtime.getURL('img/logo-small.svg');
    }
  }

  return '';
};
/**
 * Get the alternate icon for the identities (currently only Dax for emails)
 * @param {HTMLInputElement} input
 * @param {import("./Form").Form} form
 * @return {string}
 */


const getIdentitiesAlternateIcon = (input, _ref2) => {
  var _device$inContextSign2;

  let {
    device
  } = _ref2;
  if (!canBeInteractedWith(input)) return ''; // In Firefox web_accessible_resources could leak a unique user identifier, so we avoid it here

  const {
    isDDGApp,
    isFirefox,
    isExtension
  } = device.globalConfig;
  const subtype = (0, _matching.getInputSubtype)(input);
  const isIncontext = (_device$inContextSign2 = device.inContextSignup) === null || _device$inContextSign2 === void 0 ? void 0 : _device$inContextSign2.isAvailable(subtype);
  const isEmailProtection = subtype === 'emailAddress' && device.isDeviceSignedIn();

  if (isIncontext || isEmailProtection) {
    if (isDDGApp || isFirefox) {
      return _logoSvg.daxBase64;
    } else if (isExtension) {
      return chrome.runtime.getURL('img/logo-small.svg');
    }
  }

  return '';
};
/**
 * Checks whether a field is readonly or disabled
 * @param {HTMLInputElement} input
 * @return {boolean}
 */


const canBeInteractedWith = input => !input.readOnly && !input.disabled;
/**
 * Checks if the input can be decorated and we have the needed data
 * @param {HTMLInputElement} input
 * @param {import("../DeviceInterface/InterfacePrototype").default} device
 * @returns {Promise<boolean>}
 */


exports.canBeInteractedWith = canBeInteractedWith;

const canBeAutofilled = async (input, device) => {
  if (!canBeInteractedWith(input)) return false;
  const mainType = (0, _matching.getInputMainType)(input);
  const subtype = (0, _matching.getInputSubtype)(input);
  await device.settings.populateDataIfNeeded({
    mainType,
    subtype
  });
  const canAutofill = device.settings.canAutofillType({
    mainType,
    subtype
  }, device.inContextSignup);
  return Boolean(canAutofill);
};
/**
 * A map of config objects. These help by centralising here some complexity
 * @type {InputTypeConfig}
 */


const inputTypeConfig = {
  /** @type {CredentialsInputTypeConfig} */
  credentials: {
    type: 'credentials',
    displayName: 'Logins',
    getIconBase: (input, _ref3) => {
      let {
        device
      } = _ref3;
      if (!canBeInteractedWith(input)) return '';

      if (device.settings.featureToggles.inlineIcon_credentials) {
        return ddgPasswordIcons.ddgPasswordIconBase;
      }

      return '';
    },
    getIconFilled: (_input, _ref4) => {
      let {
        device
      } = _ref4;

      if (device.settings.featureToggles.inlineIcon_credentials) {
        return ddgPasswordIcons.ddgPasswordIconFilled;
      }

      return '';
    },
    getIconAlternate: () => '',
    shouldDecorate: async (input, _ref5) => {
      let {
        isLogin,
        isHybrid,
        device
      } = _ref5;

      // if we are on a 'login' page, check if we have data to autofill the field
      if (isLogin || isHybrid) {
        return canBeAutofilled(input, device);
      } // at this point, it's not a 'login' form, so we could offer to provide a password


      if (device.settings.featureToggles.password_generation) {
        const subtype = (0, _matching.getInputSubtype)(input);

        if (subtype === 'password') {
          return canBeInteractedWith(input);
        }
      }

      return false;
    },
    dataType: 'Credentials',
    tooltipItem: data => (0, _Credentials.createCredentialsTooltipItem)(data)
  },

  /** @type {CreditCardsInputTypeConfig} */
  creditCards: {
    type: 'creditCards',
    displayName: 'Credit Cards',
    getIconBase: () => '',
    getIconFilled: () => '',
    getIconAlternate: () => '',
    shouldDecorate: async (input, _ref6) => {
      let {
        device
      } = _ref6;
      return canBeAutofilled(input, device);
    },
    dataType: 'CreditCards',
    tooltipItem: data => new _CreditCard.CreditCardTooltipItem(data)
  },

  /** @type {IdentitiesInputTypeConfig} */
  identities: {
    type: 'identities',
    displayName: 'Identities',
    getIconBase: getIdentitiesIcon,
    getIconFilled: getIdentitiesIcon,
    getIconAlternate: getIdentitiesAlternateIcon,
    shouldDecorate: async (input, _ref7) => {
      let {
        device
      } = _ref7;
      return canBeAutofilled(input, device);
    },
    dataType: 'Identities',
    tooltipItem: data => new _Identity.IdentityTooltipItem(data)
  },

  /** @type {UnknownInputTypeConfig} */
  unknown: {
    type: 'unknown',
    displayName: '',
    getIconBase: () => '',
    getIconFilled: () => '',
    getIconAlternate: () => '',
    shouldDecorate: async () => false,
    dataType: '',
    tooltipItem: _data => {
      throw new Error('unreachable - setting tooltip to unknown field type');
    }
  }
};
/**
 * Retrieves configs from an input el
 * @param {HTMLInputElement} input
 * @returns {InputTypeConfigs}
 */

const getInputConfig = input => {
  const inputType = (0, _matching.getInputType)(input);
  return getInputConfigFromType(inputType);
};
/**
 * Retrieves configs from an input type
 * @param {import('./matching').SupportedTypes} inputType
 * @returns {InputTypeConfigs}
 */


exports.getInputConfig = getInputConfig;

const getInputConfigFromType = inputType => {
  const inputMainType = (0, _matching.getMainTypeFromType)(inputType);
  return inputTypeConfig[inputMainType];
};
/**
 * Given an input field checks wheter it was previously decorated
 * @param {HTMLInputElement} input
 * @returns {Boolean}
 */


exports.getInputConfigFromType = getInputConfigFromType;

const isFieldDecorated = input => {
  return input.hasAttribute(_constants.constants.ATTR_INPUT_TYPE);
};

exports.isFieldDecorated = isFieldDecorated;

},{"../InputTypes/Credentials.js":39,"../InputTypes/CreditCard.js":40,"../InputTypes/Identity.js":41,"../UI/img/ddgPasswordIcon.js":53,"../constants.js":58,"./logo-svg.js":32,"./matching.js":35}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extractElementStrings = exports.EXCLUDED_TAGS = void 0;

var _matching = require("./matching.js");

const EXCLUDED_TAGS = ['BR', 'SCRIPT', 'NOSCRIPT', 'OPTION', 'STYLE'];
/**
 * Extract all strings of an element's children to an array.
 * "element.textContent" is a string which is merged of all children nodes,
 * which can cause issues with things like script tags etc.
 *
 * @param  {Element} element
 *         A DOM element to be extracted.
 * @returns {string[]}
 *          All strings in an element.
 */

exports.EXCLUDED_TAGS = EXCLUDED_TAGS;

const extractElementStrings = element => {
  const strings = new Set();

  const _extractElementStrings = el => {
    if (EXCLUDED_TAGS.includes(el.tagName)) {
      return;
    } // only take the string when it's an explicit text node


    if (el.nodeType === el.TEXT_NODE || !el.childNodes.length) {
      let trimmedText = (0, _matching.removeExcessWhitespace)(el.textContent);

      if (trimmedText) {
        strings.add(trimmedText);
      }

      return;
    }

    for (let node of el.childNodes) {
      let nodeType = node.nodeType;

      if (nodeType !== node.ELEMENT_NODE && nodeType !== node.TEXT_NODE) {
        continue;
      }

      _extractElementStrings(node);
    }
  };

  _extractElementStrings(element);

  return [...strings];
};

exports.extractElementStrings = extractElementStrings;

},{"./matching.js":35}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.daxGrayscaleBase64 = exports.daxBase64 = void 0;
const daxSvg = "\n<svg width=\"128\" height=\"128\" fill=\"none\" viewBox=\"0 0 128 128\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path clip-rule=\"evenodd\" d=\"m64 128c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64 64 28.654 64 64 64z\" fill=\"#de5833\" fill-rule=\"evenodd\"/>\n    <path clip-rule=\"evenodd\" d=\"m73 111.75c0-.5.123-.614-1.466-3.782-4.224-8.459-8.47-20.384-6.54-28.075.353-1.397-3.978-51.744-7.04-53.365-3.402-1.813-7.588-4.69-11.418-5.33-1.943-.31-4.49-.164-6.482.105-.353.047-.368.683-.03.798 1.308.443 2.895 1.212 3.83 2.375.178.22-.06.566-.342.577-.882.032-2.482.402-4.593 2.195-.244.207-.041.592.273.53 4.536-.897 9.17-.455 11.9 2.027.177.16.084.45-.147.512-23.694 6.44-19.003 27.05-12.696 52.344 5.619 22.53 7.733 29.792 8.4 32.004a.718.718 0 0 0 .423.467c8.156 3.248 25.928 3.392 25.928-2.132z\" fill=\"#ddd\" fill-rule=\"evenodd\"/>\n    <path d=\"m76.25 116.5c-2.875 1.125-8.5 1.625-11.75 1.625-4.764 0-11.625-.75-14.125-1.875-1.544-4.751-6.164-19.48-10.727-38.185l-.447-1.827-.004-.015c-5.424-22.157-9.855-40.253 14.427-45.938.222-.052.33-.317.184-.492-2.786-3.305-8.005-4.388-14.605-2.111-.27.093-.506-.18-.337-.412 1.294-1.783 3.823-3.155 5.071-3.756.258-.124.242-.502-.03-.588a27.877 27.877 0 0 0 -3.772-.9c-.37-.059-.403-.693-.032-.743 9.356-1.259 19.125 1.55 24.028 7.726a.326.326 0 0 0 .186.114c17.952 3.856 19.238 32.235 17.17 33.528-.408.255-1.715.108-3.438-.085-6.986-.781-20.818-2.329-9.402 18.948.113.21-.036.488-.272.525-6.438 1 1.812 21.173 7.875 34.461z\" fill=\"#fff\"/>\n    <path d=\"m84.28 90.698c-1.367-.633-6.621 3.135-10.11 6.028-.728-1.031-2.103-1.78-5.203-1.242-2.713.472-4.211 1.126-4.88 2.254-4.283-1.623-11.488-4.13-13.229-1.71-1.902 2.646.476 15.161 3.003 16.786 1.32.849 7.63-3.208 10.926-6.005.532.749 1.388 1.178 3.148 1.137 2.662-.062 6.979-.681 7.649-1.921.04-.075.075-.164.105-.266 3.388 1.266 9.35 2.606 10.682 2.406 3.47-.521-.484-16.723-2.09-17.467z\" fill=\"#3ca82b\"/>\n    <path d=\"m74.49 97.097c.144.256.26.526.358.8.483 1.352 1.27 5.648.674 6.709-.595 1.062-4.459 1.574-6.843 1.615s-2.92-.831-3.403-2.181c-.387-1.081-.577-3.621-.572-5.075-.098-2.158.69-2.916 4.334-3.506 2.696-.436 4.121.071 4.944.94 3.828-2.857 10.215-6.889 10.838-6.152 3.106 3.674 3.499 12.42 2.826 15.939-.22 1.151-10.505-1.139-10.505-2.38 0-5.152-1.337-6.565-2.65-6.71zm-22.53-1.609c.843-1.333 7.674.325 11.424 1.993 0 0-.77 3.491.456 7.604.359 1.203-8.627 6.558-9.8 5.637-1.355-1.065-3.85-12.432-2.08-15.234z\" fill=\"#4cba3c\"/>\n    <path clip-rule=\"evenodd\" d=\"m55.269 68.406c.553-2.403 3.127-6.932 12.321-6.822 4.648-.019 10.422-.002 14.25-.436a51.312 51.312 0 0 0 12.726-3.095c3.98-1.519 5.392-1.18 5.887-.272.544.999-.097 2.722-1.488 4.309-2.656 3.03-7.431 5.38-15.865 6.076-8.433.698-14.02-1.565-16.425 2.118-1.038 1.589-.236 5.333 7.92 6.512 11.02 1.59 20.072-1.917 21.19.201 1.119 2.118-5.323 6.428-16.362 6.518s-17.934-3.865-20.379-5.83c-3.102-2.495-4.49-6.133-3.775-9.279z\" fill=\"#fc3\" fill-rule=\"evenodd\"/>\n    <g fill=\"#14307e\" opacity=\".8\">\n      <path d=\"m69.327 42.127c.616-1.008 1.981-1.786 4.216-1.786 2.234 0 3.285.889 4.013 1.88.148.202-.076.44-.306.34a59.869 59.869 0 0 1 -.168-.073c-.817-.357-1.82-.795-3.54-.82-1.838-.026-2.997.435-3.727.831-.246.134-.634-.133-.488-.372zm-25.157 1.29c2.17-.907 3.876-.79 5.081-.504.254.06.43-.213.227-.377-.935-.755-3.03-1.692-5.76-.674-2.437.909-3.585 2.796-3.592 4.038-.002.292.6.317.756.07.42-.67 1.12-1.646 3.289-2.553z\"/>\n      <path clip-rule=\"evenodd\" d=\"m75.44 55.92a3.47 3.47 0 0 1 -3.474-3.462 3.47 3.47 0 0 1 3.475-3.46 3.47 3.47 0 0 1 3.474 3.46 3.47 3.47 0 0 1 -3.475 3.462zm2.447-4.608a.899.899 0 0 0 -1.799 0c0 .494.405.895.9.895.499 0 .9-.4.9-.895zm-25.464 3.542a4.042 4.042 0 0 1 -4.049 4.037 4.045 4.045 0 0 1 -4.05-4.037 4.045 4.045 0 0 1 4.05-4.037 4.045 4.045 0 0 1 4.05 4.037zm-1.193-1.338a1.05 1.05 0 0 0 -2.097 0 1.048 1.048 0 0 0 2.097 0z\" fill-rule=\"evenodd\"/>\n    </g>\n    <path clip-rule=\"evenodd\" d=\"m64 117.75c29.685 0 53.75-24.065 53.75-53.75s-24.065-53.75-53.75-53.75-53.75 24.065-53.75 53.75 24.065 53.75 53.75 53.75zm0 5c32.447 0 58.75-26.303 58.75-58.75s-26.303-58.75-58.75-58.75-58.75 26.303-58.75 58.75 26.303 58.75 58.75 58.75z\" fill=\"#fff\" fill-rule=\"evenodd\"/>\n</svg>\n".trim();
const daxBase64 = "data:image/svg+xml;base64,".concat(window.btoa(daxSvg));
exports.daxBase64 = daxBase64;
const daxGrayscaleSvg = "\n<svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M64 128C99.3586 128 128 99.3586 128 64C128 28.6414 99.3586 0 64 0C28.6414 0 0 28.6414 0 64C0 99.3586 28.6414 128 64 128Z\" fill=\"#444444\"/>\n    <path d=\"M76.9991 52.2137C77.4966 52.2137 77.9009 51.8094 77.9009 51.3118C77.9009 50.8143 77.4966 50.41 76.9991 50.41C76.5015 50.41 76.0972 50.8143 76.0972 51.3118C76.0972 51.8094 76.5015 52.2137 76.9991 52.2137Z\" fill=\"white\"/>\n    <path d=\"M50.1924 54.546C50.7833 54.546 51.2497 54.0796 51.2497 53.4887C51.2497 52.8978 50.7833 52.4314 50.1924 52.4314C49.6015 52.4314 49.1351 52.8978 49.1351 53.4887C49.1351 54.0796 49.6015 54.546 50.1924 54.546Z\" fill=\"white\"/>\n    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M122.75 64C122.75 96.4468 96.4467 122.75 64 122.75C31.5533 122.75 5.25 96.4468 5.25 64C5.25 31.5533 31.5533 5.25 64 5.25C96.4467 5.25 122.75 31.5533 122.75 64ZM46.7837 114.934C45.5229 110.558 42.6434 100.26 38.2507 82.659C31.9378 57.3762 27.2419 36.7581 50.9387 30.3208C51.1875 30.2586 51.2808 29.9787 51.0942 29.8232C48.3576 27.3353 43.724 26.9 39.1836 27.8018C38.9659 27.8329 38.8105 27.6774 38.8105 27.4908C38.8105 27.4286 38.8105 27.3664 38.8726 27.3042C39.9611 25.7804 41.9203 24.5987 43.2575 23.8834C42.3245 23.0438 41.0806 22.484 40.0233 22.1109C39.7123 21.9865 39.7123 21.4578 39.9922 21.3334C40.0233 21.3023 40.0544 21.2712 40.1166 21.2712C49.446 20.0273 59.2419 22.8261 64.0622 28.9835C64.1243 29.0457 64.1865 29.0768 64.2487 29.1079C80.0777 32.4976 82.9698 54.9194 82.0058 61.1079C87.5724 60.4549 91.7395 59.0866 94.5072 58.0292C98.4878 56.5054 99.8872 56.8475 100.385 57.7493C100.913 58.7756 100.292 60.486 98.8921 62.072C96.2487 65.0885 91.4596 67.452 83.032 68.1361C80.1189 68.3726 77.544 68.2598 75.3225 68.1625C71.1174 67.9784 68.1791 67.8497 66.6122 70.2508C65.586 71.8368 66.3945 75.5686 74.5422 76.7503C80.3586 77.5883 85.6281 77.0026 89.4701 76.5755C92.8998 76.1943 95.192 75.9395 95.7201 76.9369C96.8396 79.0827 90.4023 83.3742 79.3624 83.4675C78.5228 83.4675 77.6831 83.4364 76.8746 83.4053C70.033 83.0633 64.9951 81.1974 61.8542 79.487C61.7609 79.4559 61.6987 79.4248 61.6676 79.3937C61.1078 79.0827 60.0194 79.6424 60.6725 80.8242C61.0456 81.5394 63.0359 83.3742 66.0213 84.9602C65.7104 87.4481 66.4878 91.2732 67.825 95.6269C67.9804 95.601 68.1357 95.5697 68.2955 95.5376C68.5196 95.4924 68.7526 95.4455 69.0068 95.4092C71.7123 94.9738 73.1428 95.4714 73.9514 96.3422C77.7764 93.4811 84.1516 89.4384 84.7735 90.1847C87.8833 93.8854 88.2876 102.624 87.6035 106.138C87.5724 106.2 87.5102 106.262 87.3858 106.325C85.9242 106.947 77.8698 104.746 77.8698 103.596C77.5588 97.866 76.4937 97.3373 75.2498 97.0574H74.4178C74.4489 97.0885 74.48 97.1507 74.5111 97.2129L74.791 97.866C75.2886 99.2343 76.066 103.526 75.4752 104.583C74.8843 105.641 71.0281 106.169 68.6336 106.2C66.2701 106.231 65.7415 105.361 65.2439 104.023C64.8707 102.935 64.6841 100.416 64.6841 98.9544C64.653 98.519 64.6841 98.1459 64.7463 97.8038C64.0311 98.1148 62.9816 98.83 62.6395 99.2964C62.5462 100.696 62.5462 102.935 63.2925 105.423C63.6657 106.605 55.1992 111.642 54.0174 110.71C52.8046 109.745 50.6278 100.292 51.5607 96.4666C50.5656 96.5599 49.757 96.8708 49.3216 97.4928C47.3624 100.198 49.8192 113.135 52.4314 114.814C53.7998 115.716 60.6414 111.86 64.0311 108.968C64.5908 109.745 65.6638 109.808 66.9854 109.808C68.7269 109.745 71.1525 109.497 72.8629 108.968C73.8867 111.367 75.1219 114.157 76.1353 116.374C99.9759 110.873 117.75 89.5121 117.75 64C117.75 34.3147 93.6853 10.25 64 10.25C34.3147 10.25 10.25 34.3147 10.25 64C10.25 87.664 25.5423 107.756 46.7837 114.934ZM77.1275 42.5198C77.168 42.5379 77.2081 42.5558 77.2478 42.5734C77.4655 42.6667 77.7142 42.418 77.5587 42.2314C76.8435 41.2673 75.7862 40.3655 73.5471 40.3655C71.308 40.3655 69.9397 41.1429 69.3177 42.1381C69.1933 42.3869 69.5665 42.6356 69.8153 42.5112C70.5617 42.107 71.7123 41.6405 73.5471 41.6716C75.2952 41.7012 76.3094 42.1543 77.1275 42.5198ZM75.4441 55.9146C77.3722 55.9146 78.9271 54.3596 78.9271 52.4627C78.9271 50.5346 77.3722 49.0108 75.4441 49.0108C73.516 49.0108 71.9611 50.5657 71.9611 52.4627C71.9611 54.3596 73.516 55.9146 75.4441 55.9146ZM52.4314 54.8572C52.4314 52.6181 50.6278 50.8145 48.3887 50.8145C46.1496 50.8145 44.3148 52.6181 44.3459 54.8572C44.3459 57.0963 46.1496 58.9 48.3887 58.9C50.6278 58.9 52.4314 57.0963 52.4314 54.8572ZM40.8629 45.9631C41.2983 45.3101 41.9825 44.3149 44.1593 43.4131C46.3362 42.5112 48.0466 42.6356 49.2283 42.9155C49.4771 42.9777 49.6637 42.6978 49.446 42.5423C48.5131 41.7649 46.4295 40.8319 43.6929 41.8582C41.2672 42.76 40.1166 44.657 40.1166 45.9009C40.1166 46.1808 40.7074 46.2119 40.8629 45.9631Z\" fill=\"white\"/>\n</svg>\n".trim();
const daxGrayscaleBase64 = "data:image/svg+xml;base64,".concat(window.btoa(daxGrayscaleSvg));
exports.daxGrayscaleBase64 = daxGrayscaleBase64;

},{}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.matchingConfiguration = void 0;

var _selectorsCss = require("./selectors-css.js");

/**
 * This is here to mimic what Remote Configuration might look like
 * later on.
 *
 * @type {MatchingConfiguration}
 */
const matchingConfiguration = {
  /** @type {MatcherConfiguration} */
  matchers: {
    fields: {
      unknown: {
        type: 'unknown',
        strategies: {
          ddgMatcher: 'unknown'
        }
      },
      emailAddress: {
        type: 'emailAddress',
        strategies: {
          cssSelector: 'emailAddress',
          ddgMatcher: 'emailAddress',
          vendorRegex: 'email'
        }
      },
      password: {
        type: 'password',
        strategies: {
          cssSelector: 'password',
          ddgMatcher: 'password'
        }
      },
      username: {
        type: 'username',
        strategies: {
          cssSelector: 'username',
          ddgMatcher: 'username'
        }
      },
      firstName: {
        type: 'firstName',
        strategies: {
          cssSelector: 'firstName',
          ddgMatcher: 'firstName',
          vendorRegex: 'given-name'
        }
      },
      middleName: {
        type: 'middleName',
        strategies: {
          cssSelector: 'middleName',
          ddgMatcher: 'middleName',
          vendorRegex: 'additional-name'
        }
      },
      lastName: {
        type: 'lastName',
        strategies: {
          cssSelector: 'lastName',
          ddgMatcher: 'lastName',
          vendorRegex: 'family-name'
        }
      },
      fullName: {
        type: 'fullName',
        strategies: {
          cssSelector: 'fullName',
          ddgMatcher: 'fullName',
          vendorRegex: 'name'
        }
      },
      phone: {
        type: 'phone',
        strategies: {
          cssSelector: 'phone',
          ddgMatcher: 'phone',
          vendorRegex: 'tel'
        }
      },
      addressStreet: {
        type: 'addressStreet',
        strategies: {
          cssSelector: 'addressStreet',
          ddgMatcher: 'addressStreet',
          vendorRegex: 'address-line1'
        }
      },
      addressStreet2: {
        type: 'addressStreet2',
        strategies: {
          cssSelector: 'addressStreet2',
          ddgMatcher: 'addressStreet2',
          vendorRegex: 'address-line2'
        }
      },
      addressCity: {
        type: 'addressCity',
        strategies: {
          cssSelector: 'addressCity',
          ddgMatcher: 'addressCity',
          vendorRegex: 'address-level2'
        }
      },
      addressProvince: {
        type: 'addressProvince',
        strategies: {
          cssSelector: 'addressProvince',
          ddgMatcher: 'addressProvince',
          vendorRegex: 'address-level1'
        }
      },
      addressPostalCode: {
        type: 'addressPostalCode',
        strategies: {
          cssSelector: 'addressPostalCode',
          ddgMatcher: 'addressPostalCode',
          vendorRegex: 'postal-code'
        }
      },
      addressCountryCode: {
        type: 'addressCountryCode',
        strategies: {
          cssSelector: 'addressCountryCode',
          ddgMatcher: 'addressCountryCode',
          vendorRegex: 'country'
        }
      },
      birthdayDay: {
        type: 'birthdayDay',
        strategies: {
          cssSelector: 'birthdayDay',
          ddgMatcher: 'birthdayDay'
        }
      },
      birthdayMonth: {
        type: 'birthdayMonth',
        strategies: {
          cssSelector: 'birthdayMonth',
          ddgMatcher: 'birthdayMonth'
        }
      },
      birthdayYear: {
        type: 'birthdayYear',
        strategies: {
          cssSelector: 'birthdayYear',
          ddgMatcher: 'birthdayYear'
        }
      },
      cardName: {
        type: 'cardName',
        strategies: {
          cssSelector: 'cardName',
          ddgMatcher: 'cardName',
          vendorRegex: 'cc-name'
        }
      },
      cardNumber: {
        type: 'cardNumber',
        strategies: {
          cssSelector: 'cardNumber',
          ddgMatcher: 'cardNumber',
          vendorRegex: 'cc-number'
        }
      },
      cardSecurityCode: {
        type: 'cardSecurityCode',
        strategies: {
          cssSelector: 'cardSecurityCode',
          ddgMatcher: 'cardSecurityCode'
        }
      },
      expirationMonth: {
        type: 'expirationMonth',
        strategies: {
          cssSelector: 'expirationMonth',
          ddgMatcher: 'expirationMonth',
          vendorRegex: 'cc-exp-month'
        }
      },
      expirationYear: {
        type: 'expirationYear',
        strategies: {
          cssSelector: 'expirationYear',
          ddgMatcher: 'expirationYear',
          vendorRegex: 'cc-exp-year'
        }
      },
      expiration: {
        type: 'expiration',
        strategies: {
          cssSelector: 'expiration',
          ddgMatcher: 'expiration',
          vendorRegex: 'cc-exp'
        }
      }
    },
    lists: {
      unknown: ['unknown'],
      emailAddress: ['emailAddress'],
      password: ['password'],
      username: ['username'],
      cc: ['cardName', 'cardNumber', 'cardSecurityCode', 'expirationMonth', 'expirationYear', 'expiration'],
      id: ['firstName', 'middleName', 'lastName', 'fullName', 'phone', 'addressStreet', 'addressStreet2', 'addressCity', 'addressProvince', 'addressPostalCode', 'addressCountryCode', 'birthdayDay', 'birthdayMonth', 'birthdayYear']
    }
  },
  strategies: {
    /** @type {CssSelectorConfiguration} */
    cssSelector: {
      selectors: _selectorsCss.selectors
    },

    /** @type {DDGMatcherConfiguration} */
    ddgMatcher: {
      matchers: {
        unknown: {
          match: 'search|filter|subject|title|captcha|mfa|2fa|two factor|one-time|otp' + // Italian
          '|cerca|filtr|oggetto|titolo|(due|più) fattori' + // German
          '|suche|filtern|betreff' + // Dutch
          '|zoeken|filter|onderwerp|titel' + // French
          '|chercher|filtrer|objet|titre|authentification multifacteur|double authentification|à usage unique' + // Spanish
          '|busca|busqueda|filtra|dos pasos|un solo uso' + // Swedish
          '|sök|filter|ämne|multifaktorsautentisering|tvåfaktorsautentisering|två.?faktor|engångs',
          skip: 'phone|mobile|email|password'
        },
        emailAddress: {
          match: '.mail\\b|apple.?id' + // Italian
          '|posta elettronica' + // Dutch
          '|e.?mailadres' + // Spanish
          '|correo electr|correo-e|^correo$' + // Swedish
          '|\\be.?post|e.?postadress',
          skip: 'phone|(first.?|last.?)name|number|code',
          forceUnknown: 'search|filter|subject|title|\btab\b|otp'
        },
        password: {
          match: 'password' + // German
          '|passwort|kennwort' + // Dutch
          '|wachtwoord' + // French
          '|mot de passe' + // Spanish
          '|clave|contraseña' + // Swedish
          '|lösenord',
          skip: 'email|one-time|error|hint',
          forceUnknown: 'captcha|mfa|2fa|two factor|otp|pin'
        },
        username: {
          match: '(user|account|log(i|o)n|net)((.)?(name|i.?d.?|log(i|o)n).?)?(.?((or|/).+|\\*|:)( required)?)?$' + // Italian
          '|(nome|id|login).?utente|(nome|id) (dell.)?account|codice cliente' + // German
          '|nutzername|anmeldename' + // Dutch
          '|gebruikersnaam' + // French
          '|nom d.utilisateur|identifiant|pseudo' + // Spanish
          '|usuari|cuenta|identificador|apodo' + // in Spanish dni and nie stand for id number, often used as username
          '|\\bdni\\b|\\bnie\\b| del? documento|documento de identidad' + // Swedish
          '|användarnamn|kontonamn|användar-id',
          skip: 'phone',
          forceUnknown: 'search|policy'
        },
        // CC
        cardName: {
          match: '(card.*name|name.*card)|(card.*holder|holder.*card)|(card.*owner|owner.*card)'
        },
        cardNumber: {
          match: 'card.*number|number.*card',
          skip: 'phone',
          forceUnknown: 'plus'
        },
        cardSecurityCode: {
          match: 'security.?code|card.?verif|cvv|csc|cvc|cv2|card id'
        },
        expirationMonth: {
          match: '(card|\\bcc\\b)?.?(exp(iry|iration)?)?.?(month|\\bmm\\b(?![.\\s/-]yy))',
          skip: 'mm[/\\s.\\-_—–]'
        },
        expirationYear: {
          match: '(card|\\bcc\\b)?.?(exp(iry|iration)?)?.?(year|yy)',
          skip: 'mm[/\\s.\\-_—–]'
        },
        expiration: {
          match: '(\\bmm\\b|\\b\\d\\d\\b)[/\\s.\\-_—–](\\byy|\\bjj|\\baa|\\b\\d\\d)|\\bexp|\\bvalid(idity| through| until)',
          skip: 'invalid|^dd/'
        },
        // Identities
        firstName: {
          match: '(first|given|fore).?name' + // Italian
          '|\\bnome',
          skip: 'last|cognome|completo'
        },
        middleName: {
          match: '(middle|additional).?name'
        },
        lastName: {
          match: '(last|family|sur)[^i]?name' + // Italian
          '|cognome',
          skip: 'first|\\bnome'
        },
        fullName: {
          match: '^(full.?|whole\\s|first.*last\\s|real\\s|contact.?)?name\\b' + // Italian
          '|\\bnome',
          forceUnknown: 'company|org|item'
        },
        phone: {
          match: 'phone|mobile' + // Italian
          '|telefono|cellulare',
          skip: 'code|pass|country',
          forceUnknown: 'ext|type|otp'
        },
        addressStreet: {
          match: 'address',
          forceUnknown: '\\bip\\b|duck|web|url',
          skip: 'address.*(2|two|3|three)|email|log.?in|sign.?in|civico'
        },
        addressStreet2: {
          match: 'address.*(2|two)|apartment|\\bapt\\b|\\bflat\\b|\\bline.*(2|two)',
          forceUnknown: '\\bip\\b|duck',
          skip: 'email|log.?in|sign.?in'
        },
        addressCity: {
          match: 'city|town|città|comune',
          skip: '\\bzip\\b|\\bcap\\b',
          forceUnknown: 'vatican'
        },
        addressProvince: {
          match: 'state|province|region|county|provincia|regione',
          forceUnknown: 'united',
          skip: 'country'
        },
        addressPostalCode: {
          match: '\\bzip\\b|postal\b|post.?code|\\bcap\\b|codice postale'
        },
        addressCountryCode: {
          match: 'country|\\bnation\\b|nazione|paese'
        },
        birthdayDay: {
          match: '(birth.*day|day.*birth)',
          skip: 'month|year'
        },
        birthdayMonth: {
          match: '(birth.*month|month.*birth)',
          skip: 'year'
        },
        birthdayYear: {
          match: '(birth.*year|year.*birth)'
        },
        loginRegex: {
          match: 'sign(ing)?.?in(?!g)|log.?(i|o)n|log.?out|unsubscri|(forgot(ten)?|reset) (your )?password|password (forgotten|lost)' + '|mfa-submit-form' + // fix chase.com
          '|unlock|logged in as' + // fix bitwarden
          // Italian
          '|entra|accedi|accesso|resetta password|password dimenticata|dimenticato la password|recuper[ao] password' + // German
          '|(ein|aus)loggen|anmeld(eformular|ung|efeld)|abmelden|passwort (vergessen|verloren)|zugang| zugangsformular|einwahl' + // Dutch
          '|inloggen' + // French
          '|se (dé)?connecter|(dé)?connexion|récupérer ((mon|ton|votre|le) )?mot de passe|mot de passe (oublié|perdu)' + // Spanish
          '|clave(?! su)|olvidó su (clave|contraseña)|.*sesión|conect(arse|ado)|conéctate|acce(de|so)|entrar' + // Swedish
          '|logga (in|ut)|avprenumerera|avregistrera|glömt lösenord|återställ lösenord'
        },
        signupRegex: {
          match: 'sign(ing)?.?up|join|\\bregist(er|ration)|newsletter|\\bsubscri(be|ption)|contact|create|start|enroll|settings|preferences|profile|update|checkout|guest|purchase|buy|order|schedule|estimate|request|new.?customer|(confirm|retype|repeat) password|password confirm' + // Italian
          '|iscri(viti|zione)|registra(ti|zione)|(?:nuovo|crea(?:zione)?) account|contatt(?:ac)i|sottoscriv|sottoscrizione|compra|acquist(a|o)|ordin[aeio]|richie(?:di|sta)|(?:conferma|ripeti) password|inizia|nuovo cliente|impostazioni|preferenze|profilo|aggiorna|paga' + // German
          '|registrier(ung|en)|profil (anlegen|erstellen)| nachrichten|verteiler|neukunde|neuer (kunde|benutzer|nutzer)|passwort wiederholen|anmeldeseite' + // Dutch
          '|nieuwsbrief|aanmaken|profiel' + // French
          '|s.inscrire|inscription|s.abonner|créer|préférences|profil|mise à jour|payer|ach(eter|at)| nouvel utilisateur|(confirmer|réessayer) ((mon|ton|votre|le) )?mot de passe' + // Spanish
          '|regis(trarse|tro)|regístrate|inscr(ibirse|ipción|íbete)|solicitar|crea(r cuenta)?|nueva cuenta|nuevo (cliente|usuario)|preferencias|perfil|lista de correo' + // Swedish
          '|registrer(a|ing)|(nytt|öppna) konto|nyhetsbrev|prenumer(era|ation)|kontakt|skapa|starta|inställningar|min (sida|kundvagn)|uppdatera|till kassan|gäst|köp|beställ|schemalägg|ny kund|(repetera|bekräfta) lösenord'
        },
        conservativeSignupRegex: {
          match: 'sign.?up|join|register|enroll|(create|new).+account|newsletter|subscri(be|ption)|settings|preferences|profile|update' + // Italian
          '|iscri(viti|zione)|registra(ti|zione)|(?:nuovo|crea(?:zione)?) account|contatt(?:ac)?i|sottoscriv|sottoscrizione|impostazioni|preferenze|aggiorna' + // German
          '|anmeld(en|ung)|registrier(en|ung)|neukunde|neuer (kunde|benutzer|nutzer)' + // Dutch
          '|registreren|eigenschappen|profiel|bijwerken' + // French
          '|s.inscrire|inscription|s.abonner|abonnement|préférences|profil|créer un compte' + // Spanish
          '|regis(trarse|tro)|regístrate|inscr(ibirse|ipción|íbete)|crea(r cuenta)?|nueva cuenta|nuevo (cliente|usuario)|preferencias|perfil|lista de correo' + // Swedish
          '|registrer(a|ing)|(nytt|öppna) konto|nyhetsbrev|prenumer(era|ation)|kontakt|skapa|starta|inställningar|min (sida|kundvagn)|uppdatera'
        },
        resetPasswordLink: {
          match: '(forgot(ten)?|reset|don\'t remember) (your )?password|password forgotten' + // Italian
          '|password dimenticata|reset(?:ta) password|recuper[ao] password' + // German
          '|(vergessen|verloren|verlegt|wiederherstellen) passwort' + // Dutch
          '|wachtwoord (vergeten|reset)' + // French
          '|(oublié|récupérer) ((mon|ton|votre|le) )?mot de passe|mot de passe (oublié|perdu)' + // Spanish
          '|re(iniciar|cuperar) (contraseña|clave)|olvid(ó su|aste tu|é mi) (contraseña|clave)|recordar( su)? (contraseña|clave)' + // Swedish
          '|glömt lösenord|återställ lösenord'
        },
        loginProvidersRegex: {
          match: ' with ' + // Italian and Spanish
          '| con ' + // German
          '| mit ' + // Dutch
          '| met ' + // French
          '| avec '
        },
        submitButtonRegex: {
          match: 'submit|send|confirm|save|continue|next|sign|log.?([io])n|buy|purchase|check.?out|subscribe|donate' + // Italian
          '|invia|conferma|salva|continua|entra|acced|accesso|compra|paga|sottoscriv|registra|dona' + // German
          '|senden|\\bja\\b|bestätigen|weiter|nächste|kaufen|bezahlen|spenden' + // Dutch
          '|versturen|verzenden|opslaan|volgende|koop|kopen|voeg toe|aanmelden' + // French
          '|envoyer|confirmer|sauvegarder|continuer|suivant|signer|connexion|acheter|payer|s.abonner|donner' + // Spanish
          '|enviar|confirmar|registrarse|continuar|siguiente|comprar|donar' + // Swedish
          '|skicka|bekräfta|spara|fortsätt|nästa|logga in|köp|handla|till kassan|registrera|donera'
        },
        submitButtonUnlikelyRegex: {
          match: 'facebook|twitter|google|apple|cancel|password|show|toggle|reveal|hide|print|back|already' + // Italian
          '|annulla|mostra|nascondi|stampa|indietro|già' + // German
          '|abbrechen|passwort|zeigen|verbergen|drucken|zurück' + // Dutch
          '|annuleer|wachtwoord|toon|vorige' + // French
          '|annuler|mot de passe|montrer|cacher|imprimer|retour|déjà' + // Spanish
          '|anular|cancelar|imprimir|cerrar' + // Swedish
          '|avbryt|lösenord|visa|dölj|skirv ut|tillbaka|redan'
        }
      }
    },

    /**
     * @type {VendorRegexConfiguration}
     */
    vendorRegex: {
      rules: {
        email: null,
        tel: null,
        organization: null,
        'street-address': null,
        'address-line1': null,
        'address-line2': null,
        'address-line3': null,
        'address-level2': null,
        'address-level1': null,
        'postal-code': null,
        country: null,
        'cc-name': null,
        name: null,
        'given-name': null,
        'additional-name': null,
        'family-name': null,
        'cc-number': null,
        'cc-exp-month': null,
        'cc-exp-year': null,
        'cc-exp': null,
        'cc-type': null
      },
      ruleSets: [//= ========================================================================
      // Firefox-specific rules
      {
        'address-line1': 'addrline1|address_1',
        'address-line2': 'addrline2|address_2',
        'address-line3': 'addrline3|address_3',
        'address-level1': 'land',
        // de-DE
        'additional-name': 'apellido.?materno|lastlastname',
        'cc-name': 'accountholdername' + '|titulaire',
        // fr-FR
        'cc-number': '(cc|kk)nr',
        // de-DE
        'cc-exp-month': '(cc|kk)month',
        // de-DE
        'cc-exp-year': '(cc|kk)year',
        // de-DE
        'cc-type': 'type' + '|kartenmarke' // de-DE

      }, //= ========================================================================
      // These are the rules used by Bitwarden [0], converted into RegExp form.
      // [0] https://github.com/bitwarden/browser/blob/c2b8802201fac5e292d55d5caf3f1f78088d823c/src/services/autofill.service.ts#L436
      {
        email: '(^e-?mail$)|(^email-?address$)',
        tel: '(^phone$)' + '|(^mobile$)' + '|(^mobile-?phone$)' + '|(^tel$)' + '|(^telephone$)' + '|(^phone-?number$)',
        organization: '(^company$)' + '|(^company-?name$)' + '|(^organization$)' + '|(^organization-?name$)',
        'street-address': '(^address$)' + '|(^street-?address$)' + '|(^addr$)' + '|(^street$)' + '|(^mailing-?addr(ess)?$)' + // Modified to not grab lines, below
        '|(^billing-?addr(ess)?$)' + // Modified to not grab lines, below
        '|(^mail-?addr(ess)?$)' + // Modified to not grab lines, below
        '|(^bill-?addr(ess)?$)',
        // Modified to not grab lines, below
        'address-line1': '(^address-?1$)' + '|(^address-?line-?1$)' + '|(^addr-?1$)' + '|(^street-?1$)',
        'address-line2': '(^address-?2$)' + '|(^address-?line-?2$)' + '|(^addr-?2$)' + '|(^street-?2$)',
        'address-line3': '(^address-?3$)' + '|(^address-?line-?3$)' + '|(^addr-?3$)' + '|(^street-?3$)',
        'address-level2': '(^city$)' + '|(^town$)' + '|(^address-?level-?2$)' + '|(^address-?city$)' + '|(^address-?town$)',
        'address-level1': '(^state$)' + '|(^province$)' + '|(^provence$)' + '|(^address-?level-?1$)' + '|(^address-?state$)' + '|(^address-?province$)',
        'postal-code': '(^postal$)' + '|(^zip$)' + '|(^zip2$)' + '|(^zip-?code$)' + '|(^postal-?code$)' + '|(^post-?code$)' + '|(^address-?zip$)' + '|(^address-?postal$)' + '|(^address-?code$)' + '|(^address-?postal-?code$)' + '|(^address-?zip-?code$)',
        country: '(^country$)' + '|(^country-?code$)' + '|(^country-?name$)' + '|(^address-?country$)' + '|(^address-?country-?name$)' + '|(^address-?country-?code$)',
        name: '(^name$)|full-?name|your-?name',
        'given-name': '(^f-?name$)' + '|(^first-?name$)' + '|(^given-?name$)' + '|(^first-?n$)',
        'additional-name': '(^m-?name$)' + '|(^middle-?name$)' + '|(^additional-?name$)' + '|(^middle-?initial$)' + '|(^middle-?n$)' + '|(^middle-?i$)',
        'family-name': '(^l-?name$)' + '|(^last-?name$)' + '|(^s-?name$)' + '|(^surname$)' + '|(^family-?name$)' + '|(^family-?n$)' + '|(^last-?n$)',
        'cc-name': 'cc-?name' + '|card-?name' + '|cardholder-?name' + '|cardholder' + // "|(^name$)" + // Removed to avoid overwriting "name", above.
        '|(^nom$)',
        'cc-number': 'cc-?number' + '|cc-?num' + '|card-?number' + '|card-?num' + '|(^number$)' + '|(^cc$)' + '|cc-?no' + '|card-?no' + '|(^credit-?card$)' + '|numero-?carte' + '|(^carte$)' + '|(^carte-?credit$)' + '|num-?carte' + '|cb-?num',
        'cc-exp': '(^cc-?exp$)' + '|(^card-?exp$)' + '|(^cc-?expiration$)' + '|(^card-?expiration$)' + '|(^cc-?ex$)' + '|(^card-?ex$)' + '|(^card-?expire$)' + '|(^card-?expiry$)' + '|(^validite$)' + '|(^expiration$)' + '|(^expiry$)' + '|mm-?yy' + '|mm-?yyyy' + '|yy-?mm' + '|yyyy-?mm' + '|expiration-?date' + '|payment-?card-?expiration' + '|(^payment-?cc-?date$)',
        'cc-exp-month': '(^exp-?month$)' + '|(^cc-?exp-?month$)' + '|(^cc-?month$)' + '|(^card-?month$)' + '|(^cc-?mo$)' + '|(^card-?mo$)' + '|(^exp-?mo$)' + '|(^card-?exp-?mo$)' + '|(^cc-?exp-?mo$)' + '|(^card-?expiration-?month$)' + '|(^expiration-?month$)' + '|(^cc-?mm$)' + '|(^cc-?m$)' + '|(^card-?mm$)' + '|(^card-?m$)' + '|(^card-?exp-?mm$)' + '|(^cc-?exp-?mm$)' + '|(^exp-?mm$)' + '|(^exp-?m$)' + '|(^expire-?month$)' + '|(^expire-?mo$)' + '|(^expiry-?month$)' + '|(^expiry-?mo$)' + '|(^card-?expire-?month$)' + '|(^card-?expire-?mo$)' + '|(^card-?expiry-?month$)' + '|(^card-?expiry-?mo$)' + '|(^mois-?validite$)' + '|(^mois-?expiration$)' + '|(^m-?validite$)' + '|(^m-?expiration$)' + '|(^expiry-?date-?field-?month$)' + '|(^expiration-?date-?month$)' + '|(^expiration-?date-?mm$)' + '|(^exp-?mon$)' + '|(^validity-?mo$)' + '|(^exp-?date-?mo$)' + '|(^cb-?date-?mois$)' + '|(^date-?m$)',
        'cc-exp-year': '(^exp-?year$)' + '|(^cc-?exp-?year$)' + '|(^cc-?year$)' + '|(^card-?year$)' + '|(^cc-?yr$)' + '|(^card-?yr$)' + '|(^exp-?yr$)' + '|(^card-?exp-?yr$)' + '|(^cc-?exp-?yr$)' + '|(^card-?expiration-?year$)' + '|(^expiration-?year$)' + '|(^cc-?yy$)' + '|(^cc-?y$)' + '|(^card-?yy$)' + '|(^card-?y$)' + '|(^card-?exp-?yy$)' + '|(^cc-?exp-?yy$)' + '|(^exp-?yy$)' + '|(^exp-?y$)' + '|(^cc-?yyyy$)' + '|(^card-?yyyy$)' + '|(^card-?exp-?yyyy$)' + '|(^cc-?exp-?yyyy$)' + '|(^expire-?year$)' + '|(^expire-?yr$)' + '|(^expiry-?year$)' + '|(^expiry-?yr$)' + '|(^card-?expire-?year$)' + '|(^card-?expire-?yr$)' + '|(^card-?expiry-?year$)' + '|(^card-?expiry-?yr$)' + '|(^an-?validite$)' + '|(^an-?expiration$)' + '|(^annee-?validite$)' + '|(^annee-?expiration$)' + '|(^expiry-?date-?field-?year$)' + '|(^expiration-?date-?year$)' + '|(^cb-?date-?ann$)' + '|(^expiration-?date-?yy$)' + '|(^expiration-?date-?yyyy$)' + '|(^validity-?year$)' + '|(^exp-?date-?year$)' + '|(^date-?y$)',
        'cc-type': '(^cc-?type$)' + '|(^card-?type$)' + '|(^card-?brand$)' + '|(^cc-?brand$)' + '|(^cb-?type$)'
      }, //= ========================================================================
      // These rules are from Chromium source codes [1]. Most of them
      // converted to JS format have the same meaning with the original ones
      // except the first line of "address-level1".
      // [1] https://source.chromium.org/chromium/chromium/src/+/master:components/autofill/core/common/autofill_regex_constants.cc
      {
        // ==== Email ====
        email: 'e.?mail' + '|courriel' + // fr
        '|correo.*electr(o|ó)nico' + // es-ES
        '|メールアドレス' + // ja-JP
        '|Электронной.?Почты' + // ru
        '|邮件|邮箱' + // zh-CN
        '|電郵地址' + // zh-TW
        '|ഇ-മെയില്‍|ഇലക്ട്രോണിക്.?' + 'മെയിൽ' + // ml
        '|ایمیل|پست.*الکترونیک' + // fa
        '|ईमेल|इलॅक्ट्रॉनिक.?मेल' + // hi
        '|(\\b|_)eposta(\\b|_)' + // tr
        '|(?:이메일|전자.?우편|[Ee]-?mail)(.?주소)?',
        // ko-KR
        // ==== Telephone ====
        tel: 'phone|mobile|contact.?number' + '|telefonnummer' + // de-DE
        '|telefono|teléfono' + // es
        '|telfixe' + // fr-FR
        '|電話' + // ja-JP
        '|telefone|telemovel' + // pt-BR, pt-PT
        '|телефон' + // ru
        '|मोबाइल' + // hi for mobile
        '|(\\b|_|\\*)telefon(\\b|_|\\*)' + // tr
        '|电话' + // zh-CN
        '|മൊബൈല്‍' + // ml for mobile
        '|(?:전화|핸드폰|휴대폰|휴대전화)(?:.?번호)?',
        // ko-KR
        // ==== Address Fields ====
        organization: 'company|business|organization|organisation' + // '|(?<!con)firma' + // de-DE // // todo: not supported in safari
        '|empresa' + // es
        '|societe|société' + // fr-FR
        '|ragione.?sociale' + // it-IT
        '|会社' + // ja-JP
        '|название.?компании' + // ru
        '|单位|公司' + // zh-CN
        '|شرکت' + // fa
        '|회사|직장',
        // ko-KR
        'street-address': 'streetaddress|street-address',
        'address-line1': '^address$|address[_-]?line[_-]?(1|one)|address1|addr1|street' + '|(?:shipping|billing)address$' + '|strasse|straße|hausnummer|housenumber' + // de-DE
        '|house.?name' + // en-GB
        '|direccion|dirección' + // es
        '|adresse' + // fr-FR
        '|indirizzo' + // it-IT
        '|^住所$|住所1' + // ja-JP
        // '|morada|((?<!identificação do )endereço)' + // pt-BR, pt-PT // todo: not supported in safari
        '|Адрес' + // ru
        '|地址' + // zh-CN
        '|(\\b|_)adres(?! (başlığı(nız)?|tarifi))(\\b|_)' + // tr
        '|^주소.?$|주소.?1',
        // ko-KR
        'address-line2': 'address[_-]?line(2|two)|address2|addr2|street|suite|unit(?!e)' + // Firefox adds `(?!e)` to unit to skip `United State`
        '|adresszusatz|ergänzende.?angaben' + // de-DE
        '|direccion2|colonia|adicional' + // es
        '|addresssuppl|complementnom|appartement' + // fr-FR
        '|indirizzo2' + // it-IT
        '|住所2' + // ja-JP
        '|complemento|addrcomplement' + // pt-BR, pt-PT
        '|Улица' + // ru
        '|地址2' + // zh-CN
        '|주소.?2',
        // ko-KR
        'address-line3': 'address[_-]?line(3|three)|address3|addr3|street|suite|unit(?!e)' + // Firefox adds `(?!e)` to unit to skip `United State`
        '|adresszusatz|ergänzende.?angaben' + // de-DE
        '|direccion3|colonia|adicional' + // es
        '|addresssuppl|complementnom|appartement' + // fr-FR
        '|indirizzo3' + // it-IT
        '|住所3' + // ja-JP
        '|complemento|addrcomplement' + // pt-BR, pt-PT
        '|Улица' + // ru
        '|地址3' + // zh-CN
        '|주소.?3',
        // ko-KR
        'address-level2': 'city|town' + '|\\bort\\b|stadt' + // de-DE
        '|suburb' + // en-AU
        '|ciudad|provincia|localidad|poblacion' + // es
        '|ville|commune' + // fr-FR
        '|localit(a|à)|citt(a|à)' + // it-IT
        '|市区町村' + // ja-JP
        '|cidade' + // pt-BR, pt-PT
        '|Город' + // ru
        '|市' + // zh-CN
        '|分區' + // zh-TW
        '|شهر' + // fa
        '|शहर' + // hi for city
        '|ग्राम|गाँव' + // hi for village
        '|നഗരം|ഗ്രാമം' + // ml for town|village
        '|((\\b|_|\\*)([İii̇]l[cç]e(miz|niz)?)(\\b|_|\\*))' + // tr
        '|^시[^도·・]|시[·・]?군[·・]?구',
        // ko-KR
        'address-level1': // '(?<!(united|hist|history).?)state|county|region|province' + // todo: not supported in safari
        'county|region|province' + '|county|principality' + // en-UK
        '|都道府県' + // ja-JP
        '|estado|provincia' + // pt-BR, pt-PT
        '|область' + // ru
        '|省' + // zh-CN
        '|地區' + // zh-TW
        '|സംസ്ഥാനം' + // ml
        '|استان' + // fa
        '|राज्य' + // hi
        '|((\\b|_|\\*)(eyalet|[şs]ehir|[İii̇]limiz|kent)(\\b|_|\\*))' + // tr
        '|^시[·・]?도',
        // ko-KR
        'postal-code': 'zip|postal|post.*code|pcode' + '|pin.?code' + // en-IN
        '|postleitzahl' + // de-DE
        '|\\bcp\\b' + // es
        '|\\bcdp\\b' + // fr-FR
        '|\\bcap\\b' + // it-IT
        '|郵便番号' + // ja-JP
        '|codigo|codpos|\\bcep\\b' + // pt-BR, pt-PT
        '|Почтовый.?Индекс' + // ru
        '|पिन.?कोड' + // hi
        '|പിന്‍കോഡ്' + // ml
        '|邮政编码|邮编' + // zh-CN
        '|郵遞區號' + // zh-TW
        '|(\\b|_)posta kodu(\\b|_)' + // tr
        '|우편.?번호',
        // ko-KR
        country: 'country|countries' + '|país|pais' + // es
        '|(\\b|_)land(\\b|_)(?!.*(mark.*))' + // de-DE landmark is a type in india.
        // '|(?<!(入|出))国' + // ja-JP // todo: not supported in safari
        '|国家' + // zh-CN
        '|국가|나라' + // ko-KR
        '|(\\b|_)(ülke|ulce|ulke)(\\b|_)' + // tr
        '|کشور',
        // fa
        // ==== Name Fields ====
        'cc-name': 'card.?(?:holder|owner)|name.*(\\b)?on(\\b)?.*card' + '|(?:card|cc).?name|cc.?full.?name' + '|karteninhaber' + // de-DE
        '|nombre.*tarjeta' + // es
        '|nom.*carte' + // fr-FR
        '|nome.*cart' + // it-IT
        '|名前' + // ja-JP
        '|Имя.*карты' + // ru
        '|信用卡开户名|开户名|持卡人姓名' + // zh-CN
        '|持卡人姓名',
        // zh-TW
        name: '^name|full.?name|your.?name|customer.?name|bill.?name|ship.?name' + '|name.*first.*last|firstandlastname' + '|nombre.*y.*apellidos' + // es
        '|^nom(?!bre)\\b' + // fr-FR
        '|お名前|氏名' + // ja-JP
        '|^nome' + // pt-BR, pt-PT
        '|نام.*نام.*خانوادگی' + // fa
        '|姓名' + // zh-CN
        '|(\\b|_|\\*)ad[ı]? soyad[ı]?(\\b|_|\\*)' + // tr
        '|성명',
        // ko-KR
        'given-name': 'first.*name|initials|fname|first$|given.*name' + '|vorname' + // de-DE
        '|nombre' + // es
        '|forename|prénom|prenom' + // fr-FR
        '|名' + // ja-JP
        '|\\bnome' + // pt-BR, pt-PT
        '|Имя' + // ru
        '|نام' + // fa
        '|이름' + // ko-KR
        '|പേര്' + // ml
        '|(\\b|_|\\*)(isim|ad|ad(i|ı|iniz|ınız)?)(\\b|_|\\*)' + // tr
        '|नाम',
        // hi
        'additional-name': 'middle.*name|mname|middle$|middle.*initial|m\\.i\\.|mi$|\\bmi\\b',
        'family-name': 'last.*name|lname|surname|last$|secondname|family.*name' + '|nachname' + // de-DE
        '|apellidos?' + // es
        '|famille|^nom(?!bre)' + // fr-FR
        '|cognome' + // it-IT
        '|姓' + // ja-JP
        '|apelidos|surename|sobrenome' + // pt-BR, pt-PT
        '|Фамилия' + // ru
        '|نام.*خانوادگی' + // fa
        '|उपनाम' + // hi
        '|മറുപേര്' + // ml
        '|(\\b|_|\\*)(soyisim|soyad(i|ı|iniz|ınız)?)(\\b|_|\\*)' + // tr
        '|\\b성(?:[^명]|\\b)',
        // ko-KR
        // ==== Credit Card Fields ====
        // Note: `cc-name` expression has been moved up, above `name`, in
        // order to handle specialization through ordering.
        'cc-number': '(add)?(?:card|cc|acct).?(?:number|#|no|num|field)' + // '|(?<!telefon|haus|person|fødsels)nummer' + // de-DE, sv-SE, no // todo: not supported in safari
        '|カード番号' + // ja-JP
        '|Номер.*карты' + // ru
        '|信用卡号|信用卡号码' + // zh-CN
        '|信用卡卡號' + // zh-TW
        '|카드' + // ko-KR
        // es/pt/fr
        '|(numero|número|numéro)(?!.*(document|fono|phone|réservation))',
        'cc-exp-month': // 'expir|exp.*mo|exp.*date|ccmonth|cardmonth|addmonth' + // todo: Decide if we need any of this
        'gueltig|gültig|monat' + // de-DE
        '|fecha' + // es
        '|date.*exp' + // fr-FR
        '|scadenza' + // it-IT
        '|有効期限' + // ja-JP
        '|validade' + // pt-BR, pt-PT
        '|Срок действия карты' + // ru
        '|月',
        // zh-CN
        'cc-exp-year': // 'exp|^/|(add)?year' + // todo: Decide if we need any of this
        'ablaufdatum|gueltig|gültig|jahr' + // de-DE
        '|fecha' + // es
        '|scadenza' + // it-IT
        '|有効期限' + // ja-JP
        '|validade' + // pt-BR, pt-PT
        '|Срок действия карты' + // ru
        '|年|有效期',
        // zh-CN
        'cc-exp': 'expir|exp.*date|^expfield$' + '|gueltig|gültig' + // de-DE
        '|fecha' + // es
        '|date.*exp' + // fr-FR
        '|scadenza' + // it-IT
        '|有効期限' + // ja-JP
        '|validade' + // pt-BR, pt-PT
        '|Срок действия карты' // ru

      }]
    }
  }
};
exports.matchingConfiguration = matchingConfiguration;

},{"./selectors-css.js":36}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.logMatching = logMatching;
exports.logUnmatched = logUnmatched;

var _autofillUtils = require("../autofill-utils.js");

var _matching = require("./matching.js");

/**
 * Logs out matching details when debug flag is active
 * @param {HTMLInputElement | HTMLSelectElement} el
 * @param {MatchingResult} matchingResult
 */
function logMatching(el, matchingResult) {
  if (!(0, _autofillUtils.shouldLog)()) return;
  const fieldIdentifier = getInputIdentifier(el);
  console.group(fieldIdentifier);
  console.log(el);
  const {
    strategyName,
    matchedString,
    matchedFrom,
    matcherType
  } = matchingResult;
  const verb = getVerb(matchingResult);
  let stringToLog = "".concat(verb, " for \"").concat(matcherType, "\" with \"").concat(strategyName, "\"");

  if (matchedString && matchedFrom) {
    stringToLog += "\nString: \"".concat(matchedString, "\"\nSource: \"").concat(matchedFrom, "\"");
  }

  console.log(stringToLog);
  console.groupEnd();
}
/**
 * Helper to form the correct string based on matching result type
 * @param {MatchingResult} matchingResult
 * @return {string}
 */


function getVerb(matchingResult) {
  if (matchingResult.matched) return 'Matched';
  if (matchingResult.proceed === false) return 'Matched forceUnknown';
  if (matchingResult.skip) return 'Skipped';
  return '';
}
/**
 * Returns a human-friendly name to identify a single input field
 * @param {HTMLInputElement | HTMLSelectElement} el
 * @returns {string}
 */


function getInputIdentifier(el) {
  const label = (0, _matching.getExplicitLabelsText)(el);
  const placeholder = el instanceof HTMLInputElement && el.placeholder ? "".concat(el.placeholder) : '';
  const name = el.name ? "".concat(el.name) : '';
  const id = el.id ? "#".concat(el.id) : '';
  return 'Field: ' + (label || placeholder || name || id);
}
/**
 * Logs info when a field was not matched by the algo
 * @param el
 * @param allStrings
 */


function logUnmatched(el, allStrings) {
  if (!(0, _autofillUtils.shouldLog)()) return;
  const fieldIdentifier = getInputIdentifier(el);
  console.group(fieldIdentifier);
  console.log(el);
  const stringToLog = 'Field not matched.';
  console.log(stringToLog, allStrings);
  console.groupEnd();
}

},{"../autofill-utils.js":55,"./matching.js":35}],35:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkPlaceholderAndLabels = exports.Matching = void 0;
exports.createMatching = createMatching;
exports.getInputMainType = exports.getExplicitLabelsText = void 0;
exports.getInputSubtype = getInputSubtype;
exports.getInputType = getInputType;
exports.getMainTypeFromType = getMainTypeFromType;
exports.getRelatedText = void 0;
exports.getSubtypeFromType = getSubtypeFromType;
exports.safeRegex = exports.removeExcessWhitespace = exports.matchInPlaceholderAndLabels = void 0;

var _vendorRegex = require("./vendor-regex.js");

var _constants = require("../constants.js");

var _labelUtil = require("./label-util.js");

var _matchingConfiguration = require("./matching-configuration.js");

var _matchingUtils = require("./matching-utils.js");

var _autofillUtils = require("../autofill-utils.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }

function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

const {
  TEXT_LENGTH_CUTOFF,
  ATTR_INPUT_TYPE
} = _constants.constants;
/** @type {{[K in keyof MatcherLists]?: { minWidth: number }} } */

const dimensionBounds = {
  emailAddress: {
    minWidth: 35
  }
};
/**
 * An abstraction around the concept of classifying input fields.
 *
 * The only state this class keeps is derived from the passed-in MatchingConfiguration.
 */

var _config = /*#__PURE__*/new WeakMap();

var _cssSelectors = /*#__PURE__*/new WeakMap();

var _ddgMatchers = /*#__PURE__*/new WeakMap();

var _vendorRegExpCache = /*#__PURE__*/new WeakMap();

var _matcherLists = /*#__PURE__*/new WeakMap();

var _defaultStrategyOrder = /*#__PURE__*/new WeakMap();

class Matching {
  /** @type {MatchingConfiguration} */

  /** @type {CssSelectorConfiguration['selectors']} */

  /** @type {Record<string, DDGMatcher>} */

  /**
   * This acts as an internal cache for the larger vendorRegexes
   * @type {{RULES: Record<keyof VendorRegexRules, RegExp|undefined>}}
   */

  /** @type {MatcherLists} */

  /** @type {Array<StrategyNames>} */

  /** @type {Record<MatchableStrings, string>} */

  /**
   * @param {MatchingConfiguration} config
   */
  constructor(config) {
    _classPrivateFieldInitSpec(this, _config, {
      writable: true,
      value: void 0
    });

    _classPrivateFieldInitSpec(this, _cssSelectors, {
      writable: true,
      value: void 0
    });

    _classPrivateFieldInitSpec(this, _ddgMatchers, {
      writable: true,
      value: void 0
    });

    _classPrivateFieldInitSpec(this, _vendorRegExpCache, {
      writable: true,
      value: void 0
    });

    _classPrivateFieldInitSpec(this, _matcherLists, {
      writable: true,
      value: void 0
    });

    _classPrivateFieldInitSpec(this, _defaultStrategyOrder, {
      writable: true,
      value: ['cssSelector', 'ddgMatcher', 'vendorRegex']
    });

    _defineProperty(this, "activeElementStrings", {
      nameAttr: '',
      labelText: '',
      placeholderAttr: '',
      relatedText: '',
      id: ''
    });

    _defineProperty(this, "_elementStringCache", new WeakMap());

    _classPrivateFieldSet(this, _config, config);

    const {
      rules,
      ruleSets
    } = _classPrivateFieldGet(this, _config).strategies.vendorRegex;

    _classPrivateFieldSet(this, _vendorRegExpCache, (0, _vendorRegex.createCacheableVendorRegexes)(rules, ruleSets));

    _classPrivateFieldSet(this, _cssSelectors, _classPrivateFieldGet(this, _config).strategies.cssSelector.selectors);

    _classPrivateFieldSet(this, _ddgMatchers, _classPrivateFieldGet(this, _config).strategies.ddgMatcher.matchers);

    _classPrivateFieldSet(this, _matcherLists, {
      unknown: [],
      cc: [],
      id: [],
      password: [],
      username: [],
      emailAddress: []
    });
    /**
     * Convert the raw config data into actual references.
     *
     * For example this takes `email: ["email"]` and creates
     *
     * `email: [{type: "email", strategies: {cssSelector: "email", ... etc}]`
     */


    for (let [listName, matcherNames] of Object.entries(_classPrivateFieldGet(this, _config).matchers.lists)) {
      for (let fieldName of matcherNames) {
        if (!_classPrivateFieldGet(this, _matcherLists)[listName]) {
          _classPrivateFieldGet(this, _matcherLists)[listName] = [];
        }

        _classPrivateFieldGet(this, _matcherLists)[listName].push(_classPrivateFieldGet(this, _config).matchers.fields[fieldName]);
      }
    }
  }
  /**
   * @param {HTMLInputElement|HTMLSelectElement} input
   * @param {HTMLElement} formEl
   */


  setActiveElementStrings(input, formEl) {
    this.activeElementStrings = this.getElementStrings(input, formEl);
  }
  /**
   * Try to access a 'vendor regex' by name
   * @param {string} regexName
   * @returns {RegExp | undefined}
   */


  vendorRegex(regexName) {
    const match = _classPrivateFieldGet(this, _vendorRegExpCache).RULES[regexName];

    if (!match) {
      console.warn('Vendor Regex not found for', regexName);
      return undefined;
    }

    return match;
  }
  /**
   * Strategies can have different lookup names. This returns the correct one
   * @param {MatcherTypeNames} matcherName
   * @param {StrategyNames} vendorRegex
   * @returns {MatcherTypeNames}
   */


  getStrategyLookupByType(matcherName, vendorRegex) {
    var _classPrivateFieldGet2;

    return (_classPrivateFieldGet2 = _classPrivateFieldGet(this, _config).matchers.fields[matcherName]) === null || _classPrivateFieldGet2 === void 0 ? void 0 : _classPrivateFieldGet2.strategies[vendorRegex];
  }
  /**
   * Try to access a 'css selector' by name from configuration
   * @param {keyof RequiredCssSelectors | string} selectorName
   * @returns {string};
   */


  cssSelector(selectorName) {
    const match = _classPrivateFieldGet(this, _cssSelectors)[selectorName];

    if (!match) {
      console.warn('CSS selector not found for %s, using a default value', selectorName);
      return '';
    }

    if (Array.isArray(match)) {
      return match.join(',');
    }

    return match;
  }
  /**
   * Try to access a 'ddg matcher' by name from configuration
   * @param {keyof RequiredCssSelectors | string} matcherName
   * @returns {DDGMatcher | undefined}
   */


  ddgMatcher(matcherName) {
    const match = _classPrivateFieldGet(this, _ddgMatchers)[matcherName];

    if (!match) {
      console.warn('DDG matcher not found for', matcherName);
      return undefined;
    }

    return match;
  }
  /**
   * Returns the RegExp for the given matcherName, with proper flags
   * @param {AllDDGMatcherNames} matcherName
   * @returns {RegExp|undefined}
   */


  getDDGMatcherRegex(matcherName) {
    const matcher = this.ddgMatcher(matcherName);

    if (!matcher || !matcher.match) {
      console.warn('DDG matcher has unexpected format');
      return undefined;
    }

    return safeRegex(matcher.match);
  }
  /**
   * Try to access a list of matchers by name - these are the ones collected in the constructor
   * @param {keyof MatcherLists} listName
   * @return {Matcher[]}
   */


  matcherList(listName) {
    const matcherList = _classPrivateFieldGet(this, _matcherLists)[listName];

    if (!matcherList) {
      console.warn('MatcherList not found for ', listName);
      return [];
    }

    return matcherList;
  }
  /**
   * Convert a list of matchers into a single CSS selector.
   *
   * This will consider all matchers in the list and if it
   * contains a CSS Selector it will be added to the final output
   *
   * @param {keyof MatcherLists} listName
   * @returns {string | undefined}
   */


  joinCssSelectors(listName) {
    const matcherList = this.matcherList(listName);

    if (!matcherList) {
      console.warn('Matcher list not found for', listName);
      return undefined;
    }
    /**
     * @type {string[]}
     */


    const selectors = [];

    for (let matcher of matcherList) {
      if (matcher.strategies.cssSelector) {
        const css = this.cssSelector(matcher.strategies.cssSelector);

        if (css) {
          selectors.push(css);
        }
      }
    }

    return selectors.join(', ');
  }
  /**
   * Returns true if the field is visible and large enough
   * @param {keyof MatcherLists} matchedType
   * @param {HTMLInputElement} input
   * @returns {boolean}
   */


  isInputLargeEnough(matchedType, input) {
    const expectedDimensionBounds = dimensionBounds[matchedType];
    if (!expectedDimensionBounds) return true;
    const width = input.offsetWidth;
    const height = input.offsetHeight; // Ignore hidden elements as we can't determine their dimensions

    const isHidden = height === 0 && width === 0;
    if (isHidden) return true;
    return width >= expectedDimensionBounds.minWidth;
  }
  /**
   * Tries to infer the input type for an input
   *
   * @param {HTMLInputElement|HTMLSelectElement} input
   * @param {HTMLElement} formEl
   * @param {SetInputTypeOpts} [opts]
   * @returns {SupportedTypes}
   */


  inferInputType(input, formEl) {
    let opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const presetType = getInputType(input);

    if (presetType !== 'unknown') {
      return presetType;
    }

    this.setActiveElementStrings(input, formEl);
    if (this.subtypeFromMatchers('unknown', input)) return 'unknown'; // // For CC forms we run aggressive matches, so we want to make sure we only
    // // run them on actual CC forms to avoid false positives and expensive loops

    if (opts.isCCForm) {
      const subtype = this.subtypeFromMatchers('cc', input);

      if (subtype && isValidCreditCardSubtype(subtype)) {
        return "creditCards.".concat(subtype);
      }
    }

    if (input instanceof HTMLInputElement) {
      if (this.subtypeFromMatchers('password', input)) {
        // Any other input type is likely a false match
        // Arguably "text" should be as well, but it can be used for password reveal fields
        if (['password', 'text'].includes(input.type) && input.name !== 'email' && input.placeholder !== 'Username') {
          return 'credentials.password';
        }
      }

      if (this.subtypeFromMatchers('emailAddress', input) && this.isInputLargeEnough('emailAddress', input)) {
        if (opts.isLogin || opts.isHybrid) {
          // TODO: Being this support back in the future
          // https://app.asana.com/0/1198964220583541/1204686960531034/f
          // Show identities when supported and there are no credentials
          // if (opts.supportsIdentitiesAutofill && !opts.hasCredentials) {
          //     return 'identities.emailAddress'
          // }
          return 'credentials.username';
        } // TODO: Temporary hack to support Google signin in different languages
        // https://app.asana.com/0/1198964220583541/1201650539303898/f


        if (window.location.href.includes('https://accounts.google.com/v3/signin/identifier') && input.matches('[type=email][autocomplete=username]')) {
          return 'credentials.username';
        }

        return 'identities.emailAddress';
      }

      if (this.subtypeFromMatchers('username', input)) {
        return 'credentials.username';
      }
    }

    const idSubtype = this.subtypeFromMatchers('id', input);

    if (idSubtype && isValidIdentitiesSubtype(idSubtype)) {
      return "identities.".concat(idSubtype);
    }

    (0, _matchingUtils.logUnmatched)(input, this.activeElementStrings);
    return 'unknown';
  }
  /**
   * @typedef {{
   *   isLogin?: boolean,
   *   isHybrid?: boolean,
   *   isCCForm?: boolean,
   *   hasCredentials?: boolean,
   *   supportsIdentitiesAutofill?: boolean
   * }} SetInputTypeOpts
   */

  /**
   * Sets the input type as a data attribute to the element and returns it
   * @param {HTMLInputElement} input
   * @param {HTMLElement} formEl
   * @param {SetInputTypeOpts} [opts]
   * @returns {SupportedSubTypes | string}
   */


  setInputType(input, formEl) {
    let opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const type = this.inferInputType(input, formEl, opts);
    input.setAttribute(ATTR_INPUT_TYPE, type);
    return type;
  }
  /**
   * Tries to infer input subtype, with checks in decreasing order of reliability
   * @param {keyof MatcherLists} listName
   * @param {HTMLInputElement|HTMLSelectElement} el
   * @return {MatcherTypeNames|undefined}
   */


  subtypeFromMatchers(listName, el) {
    const matchers = this.matcherList(listName);
    /**
     * Loop through each strategy in order
     */

    for (let strategyName of _classPrivateFieldGet(this, _defaultStrategyOrder)) {
      var _result4;

      let result;
      /**
       * Now loop through each matcher in the list.
       */

      for (let matcher of matchers) {
        var _result, _result2, _result3;

        /**
         * for each `strategyName` (such as cssSelector), check
         * if the current matcher implements it.
         */
        const lookup = matcher.strategies[strategyName];
        /**
         * Sometimes a matcher may not implement the current strategy,
         * so we skip it
         */

        if (!lookup) continue;
        /**
         * Now perform the matching
         */

        if (strategyName === 'cssSelector') {
          result = this.execCssSelector(lookup, el);
        }

        if (strategyName === 'ddgMatcher') {
          result = this.execDDGMatcher(lookup);
        }

        if (strategyName === 'vendorRegex') {
          result = this.execVendorRegex(lookup);
        }
        /**
         * If there's a match, return the matcher type.
         *
         * So, for example if 'username' had a `cssSelector` implemented, and
         * it matched the current element, then we'd return 'username'
         */


        if ((_result = result) !== null && _result !== void 0 && _result.matched) {
          (0, _matchingUtils.logMatching)(el, result);
          return matcher.type;
        }
        /**
         * If a matcher wants to prevent all future matching on this element,
         * it would return { matched: false, proceed: false }
         */


        if (!((_result2 = result) !== null && _result2 !== void 0 && _result2.matched) && ((_result3 = result) === null || _result3 === void 0 ? void 0 : _result3.proceed) === false) {
          (0, _matchingUtils.logMatching)(el, result); // If we get here, do not allow subsequent strategies to continue

          return undefined;
        }
      }

      if ((_result4 = result) !== null && _result4 !== void 0 && _result4.skip) {
        (0, _matchingUtils.logMatching)(el, result);
        break;
      }
    }

    return undefined;
  }
  /**
   * CSS selector matching just leverages the `.matches` method on elements
   *
   * @param {MatcherTypeNames} lookup
   * @param {HTMLInputElement|HTMLSelectElement} el
   * @returns {MatchingResult}
   */


  execCssSelector(lookup, el) {
    const selector = this.cssSelector(lookup);
    return {
      matched: el.matches(selector),
      strategyName: 'cssSelector',
      matcherType: lookup
    };
  }
  /**
   * A DDG Matcher can have a `match` regex along with a `not` regex. This is done
   * to allow it to be driven by configuration as it avoids needing to invoke custom functions.
   *
   * todo: maxDigits was added as an edge-case when converting this over to be declarative, but I'm
   * unsure if it's actually needed. It's not urgent, but we should consider removing it if that's the case
   *
   * @param {MatcherTypeNames} lookup
   * @returns {MatchingResult}
   */


  execDDGMatcher(lookup) {
    /** @type {MatchingResult} */
    const defaultResult = {
      matched: false,
      strategyName: 'ddgMatcher',
      matcherType: lookup
    };
    const ddgMatcher = this.ddgMatcher(lookup);

    if (!ddgMatcher || !ddgMatcher.match) {
      return defaultResult;
    }

    let matchRexExp = safeRegex(ddgMatcher.match || '');

    if (!matchRexExp) {
      return defaultResult;
    }

    let requiredScore = ['match', 'forceUnknown', 'maxDigits'].filter(ddgMatcherProp => ddgMatcherProp in ddgMatcher).length;
    /** @type {MatchableStrings[]} */

    const matchableStrings = ddgMatcher.matchableStrings || ['labelText', 'placeholderAttr', 'relatedText'];

    for (let stringName of matchableStrings) {
      let elementString = this.activeElementStrings[stringName];
      if (!elementString) continue; // Scoring to ensure all DDG tests are valid

      let score = 0;
      /** @type {MatchingResult} */

      const result = { ...defaultResult,
        matchedString: elementString,
        matchedFrom: stringName
      }; // If a negated regex was provided, ensure it does not match
      // If it DOES match - then we need to prevent any future strategies from continuing

      if (ddgMatcher.forceUnknown) {
        let notRegex = safeRegex(ddgMatcher.forceUnknown);

        if (!notRegex) {
          return { ...result,
            matched: false
          };
        }

        if (notRegex.test(elementString)) {
          return { ...result,
            matched: false,
            proceed: false
          };
        } else {
          // All good here, increment the score
          score++;
        }
      }

      if (ddgMatcher.skip) {
        let skipRegex = safeRegex(ddgMatcher.skip);

        if (!skipRegex) {
          return { ...result,
            matched: false
          };
        }

        if (skipRegex.test(elementString)) {
          return { ...result,
            matched: false,
            skip: true
          };
        }
      } // if the `match` regex fails, moves onto the next string


      if (!matchRexExp.test(elementString)) {
        continue;
      } // Otherwise, increment the score


      score++; // If a 'maxDigits' rule was provided, validate it

      if (ddgMatcher.maxDigits) {
        const digitLength = elementString.replace(/[^0-9]/g, '').length;

        if (digitLength > ddgMatcher.maxDigits) {
          return { ...result,
            matched: false
          };
        } else {
          score++;
        }
      }

      if (score === requiredScore) {
        return { ...result,
          matched: true
        };
      }
    }

    return defaultResult;
  }
  /**
   * If we get here, a firefox/vendor regex was given and we can execute it on the element
   * strings
   * @param {MatcherTypeNames} lookup
   * @return {MatchingResult}
   */


  execVendorRegex(lookup) {
    /** @type {MatchingResult} */
    const defaultResult = {
      matched: false,
      strategyName: 'vendorRegex',
      matcherType: lookup
    };
    const regex = this.vendorRegex(lookup);

    if (!regex) {
      return defaultResult;
    }
    /** @type {MatchableStrings[]} */


    const stringsToMatch = ['placeholderAttr', 'nameAttr', 'labelText', 'id', 'relatedText'];

    for (let stringName of stringsToMatch) {
      let elementString = this.activeElementStrings[stringName];
      if (!elementString) continue;
      elementString = elementString.toLowerCase();

      if (regex.test(elementString)) {
        return { ...defaultResult,
          matched: true,
          matchedString: elementString,
          matchedFrom: stringName
        };
      }
    }

    return defaultResult;
  }
  /**
   * Yield strings in the order in which they should be checked against.
   *
   * Note: some strategies may not want to accept all strings, which is
   * where `matchableStrings` helps. It defaults to when you see below but can
   * be overridden.
   *
   * For example, `nameAttr` is first, since this has the highest chance of matching
   * and then the rest are in decreasing order of value vs cost
   *
   * A generator function is used here to prevent any potentially expensive
   * lookups occurring if they are rare. For example if 90% of all matching never needs
   * to look at the output from `relatedText`, then the cost of computing it will be avoided.
   *
   * @param {HTMLInputElement|HTMLSelectElement} el
   * @param {HTMLElement} form
   * @returns {Record<MatchableStrings, string>}
   */


  getElementStrings(el, form) {
    if (this._elementStringCache.has(el)) {
      return this._elementStringCache.get(el);
    }

    const explicitLabelsText = getExplicitLabelsText(el);
    /** @type {Record<MatchableStrings, string>} */

    const next = {
      nameAttr: el.name,
      labelText: explicitLabelsText,
      placeholderAttr: el.placeholder || '',
      id: el.id,
      relatedText: explicitLabelsText ? '' : getRelatedText(el, form, this.cssSelector('formInputsSelector'))
    };

    this._elementStringCache.set(el, next);

    return next;
  }

  clear() {
    this._elementStringCache = new WeakMap();
  }
  /**
   * @param {HTMLInputElement|HTMLSelectElement} input
   * @param {HTMLElement} form
   * @returns {Matching}
   */


  forInput(input, form) {
    this.setActiveElementStrings(input, form);
    return this;
  }
  /**
   * @type {MatchingConfiguration}
   */


}
/**
 *  @returns {SupportedTypes}
 */


exports.Matching = Matching;

_defineProperty(Matching, "emptyConfig", {
  matchers: {
    lists: {},
    fields: {}
  },
  strategies: {
    'vendorRegex': {
      rules: {},
      ruleSets: []
    },
    'ddgMatcher': {
      matchers: {}
    },
    'cssSelector': {
      selectors: {}
    }
  }
});

function getInputType(input) {
  const attr = input === null || input === void 0 ? void 0 : input.getAttribute(ATTR_INPUT_TYPE);

  if (isValidSupportedType(attr)) {
    return attr;
  }

  return 'unknown';
}
/**
 * Retrieves the main type
 * @param {SupportedTypes | string} type
 * @returns {SupportedMainTypes}
 */


function getMainTypeFromType(type) {
  const mainType = type.split('.')[0];

  switch (mainType) {
    case 'credentials':
    case 'creditCards':
    case 'identities':
      return mainType;
  }

  return 'unknown';
}
/**
 * Retrieves the input main type
 * @param {HTMLInputElement} input
 * @returns {SupportedMainTypes}
 */


const getInputMainType = input => getMainTypeFromType(getInputType(input));
/** @typedef {supportedIdentitiesSubtypes[number]} SupportedIdentitiesSubTypes */


exports.getInputMainType = getInputMainType;
const supportedIdentitiesSubtypes =
/** @type {const} */
['emailAddress', 'firstName', 'middleName', 'lastName', 'fullName', 'phone', 'addressStreet', 'addressStreet2', 'addressCity', 'addressProvince', 'addressPostalCode', 'addressCountryCode', 'birthdayDay', 'birthdayMonth', 'birthdayYear'];
/**
 * @param {SupportedTypes | any} supportedType
 * @returns {supportedType is SupportedIdentitiesSubTypes}
 */

function isValidIdentitiesSubtype(supportedType) {
  return supportedIdentitiesSubtypes.includes(supportedType);
}
/** @typedef {supportedCreditCardSubtypes[number]} SupportedCreditCardSubTypes */


const supportedCreditCardSubtypes =
/** @type {const} */
['cardName', 'cardNumber', 'cardSecurityCode', 'expirationMonth', 'expirationYear', 'expiration'];
/**
 * @param {SupportedTypes | any} supportedType
 * @returns {supportedType is SupportedCreditCardSubTypes}
 */

function isValidCreditCardSubtype(supportedType) {
  return supportedCreditCardSubtypes.includes(supportedType);
}
/** @typedef {supportedCredentialsSubtypes[number]} SupportedCredentialsSubTypes */


const supportedCredentialsSubtypes =
/** @type {const} */
['password', 'username'];
/**
 * @param {SupportedTypes | any} supportedType
 * @returns {supportedType is SupportedCredentialsSubTypes}
 */

function isValidCredentialsSubtype(supportedType) {
  return supportedCredentialsSubtypes.includes(supportedType);
}
/** @typedef {SupportedIdentitiesSubTypes | SupportedCreditCardSubTypes | SupportedCredentialsSubTypes} SupportedSubTypes */

/** @typedef {`identities.${SupportedIdentitiesSubTypes}` | `creditCards.${SupportedCreditCardSubTypes}` | `credentials.${SupportedCredentialsSubTypes}` | 'unknown'} SupportedTypes */


const supportedTypes = [...supportedIdentitiesSubtypes.map(type => "identities.".concat(type)), ...supportedCreditCardSubtypes.map(type => "creditCards.".concat(type)), ...supportedCredentialsSubtypes.map(type => "credentials.".concat(type))];
/**
 * Retrieves the subtype
 * @param {SupportedTypes | string} type
 * @returns {SupportedSubTypes | 'unknown'}
 */

function getSubtypeFromType(type) {
  const subType = type === null || type === void 0 ? void 0 : type.split('.')[1];
  const validType = isValidSubtype(subType);
  return validType ? subType : 'unknown';
}
/**
 * @param {SupportedSubTypes | any} supportedSubType
 * @returns {supportedSubType is SupportedSubTypes}
 */


function isValidSubtype(supportedSubType) {
  return isValidIdentitiesSubtype(supportedSubType) || isValidCreditCardSubtype(supportedSubType) || isValidCredentialsSubtype(supportedSubType);
}
/**
 * @param {SupportedTypes | any} supportedType
 * @returns {supportedType is SupportedTypes}
 */


function isValidSupportedType(supportedType) {
  return supportedTypes.includes(supportedType);
}
/**
 * Retrieves the input subtype
 * @param {HTMLInputElement|Element} input
 * @returns {SupportedSubTypes | 'unknown'}
 */


function getInputSubtype(input) {
  const type = getInputType(input);
  return getSubtypeFromType(type);
}
/**
 * Remove whitespace of more than 2 in a row and trim the string
 * @param {string | null} string
 * @return {string}
 */


const removeExcessWhitespace = function () {
  let string = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  if (!string) return '';
  return string.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
};
/**
 * Get text from all explicit labels
 * @param {HTMLInputElement|HTMLSelectElement} el
 * @return {string}
 */


exports.removeExcessWhitespace = removeExcessWhitespace;

const getExplicitLabelsText = el => {
  const labelTextCandidates = [];

  for (let label of el.labels || []) {
    labelTextCandidates.push(...(0, _labelUtil.extractElementStrings)(label));
  }

  if (el.hasAttribute('aria-label')) {
    labelTextCandidates.push(removeExcessWhitespace(el.getAttribute('aria-label')));
  } // Try to access another element if it was marked as the label for this input/select


  const ariaLabelAttr = removeExcessWhitespace(el.getAttribute('aria-labelled') || el.getAttribute('aria-labelledby'));

  if (ariaLabelAttr) {
    const labelledByElement = document.getElementById(ariaLabelAttr);

    if (labelledByElement) {
      labelTextCandidates.push(...(0, _labelUtil.extractElementStrings)(labelledByElement));
    }
  } // Labels with long text are likely to be noisy and lead to false positives


  const filteredLabels = labelTextCandidates.filter(string => string.length < 65);

  if (filteredLabels.length > 0) {
    return filteredLabels.join(' ');
  }

  return '';
};
/**
 * Tries to get a relevant previous Element sibling, excluding certain tags
 * @param {Element} el
 * @returns {Element|null}
 */


exports.getExplicitLabelsText = getExplicitLabelsText;

const recursiveGetPreviousElSibling = el => {
  const previousEl = el.previousElementSibling;
  if (!previousEl) return null; // Skip elements with no childNodes

  if (_labelUtil.EXCLUDED_TAGS.includes(previousEl.tagName)) {
    return recursiveGetPreviousElSibling(previousEl);
  }

  return previousEl;
};
/**
 * Get all text close to the input (useful when no labels are defined)
 * @param {HTMLInputElement|HTMLSelectElement} el
 * @param {HTMLElement} form
 * @param {string} cssSelector
 * @return {string}
 */


const getRelatedText = (el, form, cssSelector) => {
  let scope = getLargestMeaningfulContainer(el, form, cssSelector); // If we didn't find a container, try looking for an adjacent label

  if (scope === el) {
    let previousEl = recursiveGetPreviousElSibling(el);

    if (previousEl instanceof HTMLElement) {
      scope = previousEl;
    } // If there is still no meaningful container return empty string


    if (scope === el || scope instanceof HTMLSelectElement) {
      if (el.previousSibling instanceof Text) {
        return removeExcessWhitespace(el.previousSibling.textContent);
      }

      return '';
    }
  } // If there is still no meaningful container return empty string


  if (scope === el || scope instanceof HTMLSelectElement) {
    if (el.previousSibling instanceof Text) {
      return removeExcessWhitespace(el.previousSibling.textContent);
    }

    return '';
  }

  let trimmedText = '';
  const label = scope.querySelector('label');

  if (label) {
    // Try searching for a label first
    trimmedText = (0, _autofillUtils.getTextShallow)(label);
  } else {
    // If the container has a select element, remove its contents to avoid noise
    trimmedText = (0, _labelUtil.extractElementStrings)(scope).join(' ');
  } // If the text is longer than n chars it's too noisy and likely to yield false positives, so return ''


  if (trimmedText.length < TEXT_LENGTH_CUTOFF) return trimmedText;
  return '';
};
/**
 * Find a container for the input field that won't contain other inputs (useful to get elements related to the field)
 * @param {HTMLElement} el
 * @param {HTMLElement} form
 * @param {string} cssSelector
 * @return {HTMLElement}
 */


exports.getRelatedText = getRelatedText;

const getLargestMeaningfulContainer = (el, form, cssSelector) => {
  /* TODO: there could be more than one select el for the same label, in that case we should
      change how we compute the container */
  const parentElement = el.parentElement;
  if (!parentElement || el === form || !cssSelector) return el;
  const inputsInParentsScope = parentElement.querySelectorAll(cssSelector); // To avoid noise, ensure that our input is the only in scope

  if (inputsInParentsScope.length === 1) {
    return getLargestMeaningfulContainer(parentElement, form, cssSelector);
  }

  return el;
};
/**
 * Find a regex match for a given input
 * @param {HTMLInputElement} input
 * @param {RegExp} regex
 * @param {HTMLElement} form
 * @param {string} cssSelector
 * @returns {RegExpMatchArray|null}
 */


const matchInPlaceholderAndLabels = (input, regex, form, cssSelector) => {
  var _input$placeholder;

  return ((_input$placeholder = input.placeholder) === null || _input$placeholder === void 0 ? void 0 : _input$placeholder.match(regex)) || getExplicitLabelsText(input).match(regex) || getRelatedText(input, form, cssSelector).match(regex);
};
/**
 * Check if a given input matches a regex
 * @param {HTMLInputElement} input
 * @param {RegExp} regex
 * @param {HTMLElement} form
 * @param {string} cssSelector
 * @returns {boolean}
 */


exports.matchInPlaceholderAndLabels = matchInPlaceholderAndLabels;

const checkPlaceholderAndLabels = (input, regex, form, cssSelector) => {
  return !!matchInPlaceholderAndLabels(input, regex, form, cssSelector);
};
/**
 * Returns a RegExp from a string
 * @param {string} string
 * @returns {RegExp | undefined} string
 */


exports.checkPlaceholderAndLabels = checkPlaceholderAndLabels;

const safeRegex = string => {
  try {
    const input = String(string).normalize('NFKC');
    return new RegExp(input, 'ui');
  } catch (e) {
    console.warn('Could not generate regex from string input', string);
    return undefined;
  }
};
/**
 * Factory for instances of Matching
 *
 * @return {Matching}
 */


exports.safeRegex = safeRegex;

function createMatching() {
  return new Matching(_matchingConfiguration.matchingConfiguration);
}

},{"../autofill-utils.js":55,"../constants.js":58,"./label-util.js":31,"./matching-configuration.js":33,"./matching-utils.js":34,"./vendor-regex.js":37}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.selectors = void 0;
const formInputsSelector = "\ninput:not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]):not([type=search]):not([type=reset]):not([type=image]):not([name^=fake i]):not([data-description^=dummy i]):not([name*=otp]):not([autocomplete=\"fake\"]),\n[autocomplete=username],\nselect";
const submitButtonSelector = "\ninput[type=submit],\ninput[type=button],\ninput[type=image],\nbutton:not([role=switch]):not([role=link]),\n[role=button],\na[href=\"#\"][id*=button i],\na[href=\"#\"][id*=btn i]";
const safeUniversalSelector = '*:not(select):not(option):not(script):not(noscript):not(style):not(br)'; // We've seen non-standard types like 'user'. This selector should get them, too

const genericTextField = "\ninput:not([type=button]):not([type=checkbox]):not([type=color]):not([type=date]):not([type=datetime-local]):not([type=datetime]):not([type=file]):not([type=hidden]):not([type=month]):not([type=number]):not([type=radio]):not([type=range]):not([type=reset]):not([type=search]):not([type=submit]):not([type=time]):not([type=url]):not([type=week])";
const emailAddress = ["\ninput:not([type])[name*=email i]:not([placeholder*=search i]):not([placeholder*=filter i]):not([placeholder*=subject i]):not([name*=code i]),\ninput[type=\"\"][name*=email i]:not([placeholder*=search i]):not([placeholder*=filter i]):not([placeholder*=subject i]):not([type=tel]),\ninput[type=text][name*=email i]:not([placeholder*=search i]):not([placeholder*=filter i]):not([placeholder*=subject i]):not([name*=title i]):not([name*=tab i]):not([name*=code i]),\ninput:not([type])[placeholder*=email i]:not([placeholder*=search i]):not([placeholder*=filter i]):not([placeholder*=subject i]):not([name*=code i]),\ninput[type=text][placeholder*=email i]:not([placeholder*=search i]):not([placeholder*=filter i]):not([placeholder*=subject i]),\ninput[type=\"\"][placeholder*=email i]:not([placeholder*=search i]):not([placeholder*=filter i]):not([placeholder*=subject i]),\ninput[type=email],\ninput[type=text][aria-label*=email i]:not([aria-label*=search i]),\ninput:not([type])[aria-label*=email i]:not([aria-label*=search i]),\ninput[name=username][type=email],\ninput[autocomplete=username][type=email],\ninput[autocomplete=username][placeholder*=email i],\ninput[autocomplete=email]", // https://account.nicovideo.jp/login
"input[name=\"mail_tel\" i]", // https://www.morningstar.it/it/membership/LoginPopup.aspx
"input[value=email i]"];
const username = ["".concat(genericTextField, "[autocomplete^=user i]"), "input[name=username i]", // fix for `aa.com`
"input[name=\"loginId\" i]", // fix for https://online.mbank.pl/pl/Login
"input[name=\"userid\" i]", "input[id=\"userid\" i]", "input[name=\"user_id\" i]", "input[name=\"user-id\" i]", "input[id=\"login-id\" i]", "input[id=\"login_id\" i]", "input[id=\"loginid\" i]", "input[name=\"login\" i]", "input[name=accountname i]", "input[autocomplete=username i]", "input[name*=accountid i]", "input[name=\"j_username\" i]", "input[id=\"j_username\" i]", // https://account.uwindsor.ca/login
"input[name=\"uwinid\" i]", // livedoor.com
"input[name=\"livedoor_id\" i]", // https://login.oracle.com/mysso/signon.jsp?request_id=
"input[name=\"ssousername\" i]", // https://secure.nsandi.com/
"input[name=\"j_userlogin_pwd\" i]", // https://freelance.habr.com/users/sign_up
"input[name=\"user[login]\" i]", // https://weblogin.utoronto.ca
"input[name=\"user\" i]", // https://customerportal.mastercard.com/login
"input[name$=\"_username\" i]", // https://accounts.hindustantimes.com/?type=plain&ref=lm
"input[id=\"lmSsoinput\" i]", // bigcartel.com/login
"input[name=\"account_subdomain\" i]", // https://www.mydns.jp/members/
"input[name=\"masterid\" i]", // https://giris.turkiye.gov.tr
"input[name=\"tridField\" i]", // https://membernetprb2c.b2clogin.com
"input[id=\"signInName\" i]", // https://www.w3.org/accounts/request
"input[id=\"w3c_accountsbundle_accountrequeststep1_login\" i]", "input[id=\"username\" i]", "input[name=\"_user\" i]", "input[name=\"login_username\" i]", // https://www.flytap.com/
"input[name^=\"login-user-account\" i]", // https://www.sanitas.es
"input[id=\"loginusuario\" i]", // https://www.guardiacivil.es/administracion/login.html
"input[name=\"usuario\" i]", // https://m.bintercanarias.com/
"input[id=\"UserLoginFormUsername\" i]", // https://id.docker.com/login
"input[id=\"nw_username\" i]", // https://appleid.apple.com/es/sign-in (needed for all languages)
"input[can-field=\"accountName\"]", "input[placeholder^=\"username\" i]"];
const password = ["input[type=password]:not([autocomplete*=cc]):not([autocomplete=one-time-code]):not([name*=answer i]):not([name*=mfa i]):not([name*=tin i]):not([name*=card i]):not([name*=cvv i])", // DDG's CloudSave feature https://emanuele.duckduckgo.com/settings
'input.js-cloudsave-phrase'];
const cardName = "\ninput[autocomplete=\"cc-name\" i],\ninput[autocomplete=\"ccname\" i],\ninput[name=\"ccname\" i],\ninput[name=\"cc-name\" i],\ninput[name=\"ppw-accountHolderName\" i],\ninput[id*=cardname i],\ninput[id*=card-name i],\ninput[id*=card_name i]";
const cardNumber = "\ninput[autocomplete=\"cc-number\" i],\ninput[autocomplete=\"ccnumber\" i],\ninput[autocomplete=\"cardnumber\" i],\ninput[autocomplete=\"card-number\" i],\ninput[name=\"ccnumber\" i],\ninput[name=\"cc-number\" i],\ninput[name*=card i][name*=number i],\ninput[name*=cardnumber i],\ninput[id*=cardnumber i],\ninput[id*=card-number i],\ninput[id*=card_number i]";
const cardSecurityCode = "\ninput[autocomplete=\"cc-csc\" i],\ninput[autocomplete=\"csc\" i],\ninput[autocomplete=\"cc-cvc\" i],\ninput[autocomplete=\"cvc\" i],\ninput[name=\"cvc\" i],\ninput[name=\"cc-cvc\" i],\ninput[name=\"cc-csc\" i],\ninput[name=\"csc\" i],\ninput[name*=security i][name*=code i]";
const expirationMonth = "\n[autocomplete=\"cc-exp-month\" i],\n[autocomplete=\"cc_exp_month\" i],\n[name=\"ccmonth\" i],\n[name=\"ppw-expirationDate_month\" i],\n[name=cardExpiryMonth i],\n[name*=ExpDate_Month i],\n[name*=expiration i][name*=month i],\n[id*=expiration i][id*=month i],\n[name*=cc-exp-month i],\n[name*=\"card_exp-month\" i],\n[name*=cc_exp_month i]";
const expirationYear = "\n[autocomplete=\"cc-exp-year\" i],\n[autocomplete=\"cc_exp_year\" i],\n[name=\"ccyear\" i],\n[name=\"ppw-expirationDate_year\" i],\n[name=cardExpiryYear i],\n[name*=ExpDate_Year i],\n[name*=expiration i][name*=year i],\n[id*=expiration i][id*=year i],\n[name*=\"cc-exp-year\" i],\n[name*=\"card_exp-year\" i],\n[name*=cc_exp_year i]";
const expiration = "\n[autocomplete=\"cc-exp\" i],\n[name=\"cc-exp\" i],\n[name=\"exp-date\" i],\n[name=\"expirationDate\" i],\ninput[id*=expiration i]";
const firstName = "\n[name*=fname i], [autocomplete*=given-name i],\n[name*=firstname i], [autocomplete*=firstname i],\n[name*=first-name i], [autocomplete*=first-name i],\n[name*=first_name i], [autocomplete*=first_name i],\n[name*=givenname i], [autocomplete*=givenname i],\n[name*=given-name i],\n[name*=given_name i], [autocomplete*=given_name i],\n[name*=forename i], [autocomplete*=forename i]";
const middleName = "\n[name*=mname i], [autocomplete*=additional-name i],\n[name*=middlename i], [autocomplete*=middlename i],\n[name*=middle-name i], [autocomplete*=middle-name i],\n[name*=middle_name i], [autocomplete*=middle_name i],\n[name*=additionalname i], [autocomplete*=additionalname i],\n[name*=additional-name i],\n[name*=additional_name i], [autocomplete*=additional_name i]";
const lastName = "\n[name=lname], [autocomplete*=family-name i],\n[name*=lastname i], [autocomplete*=lastname i],\n[name*=last-name i], [autocomplete*=last-name i],\n[name*=last_name i], [autocomplete*=last_name i],\n[name*=familyname i], [autocomplete*=familyname i],\n[name*=family-name i],\n[name*=family_name i], [autocomplete*=family_name i],\n[name*=surname i], [autocomplete*=surname i]";
const fullName = "\n[autocomplete=name],\n[name*=fullname i], [autocomplete*=fullname i],\n[name*=full-name i], [autocomplete*=full-name i],\n[name*=full_name i], [autocomplete*=full_name i],\n[name*=your-name i], [autocomplete*=your-name i]";
const phone = "\n[name*=phone i]:not([name*=extension i]):not([name*=type i]):not([name*=country i]),\n[name*=mobile i]:not([name*=type i]),\n[autocomplete=tel],\n[autocomplete=\"tel-national\"],\n[placeholder*=\"phone number\" i]";
const addressStreet = "\n[name=address i], [autocomplete=street-address i], [autocomplete=address-line1 i],\n[name=street i],\n[name=ppw-line1 i], [name*=addressLine1 i]";
const addressStreet2 = "\n[name=address2 i], [autocomplete=address-line2 i],\n[name=ppw-line2 i], [name*=addressLine2 i]";
const addressCity = "\n[name=city i], [autocomplete=address-level2 i],\n[name=ppw-city i], [name*=addressCity i]";
const addressProvince = "\n[name=province i], [name=state i], [autocomplete=address-level1 i]";
const addressPostalCode = "\n[name=zip i], [name=zip2 i], [name=postal i], [autocomplete=postal-code i], [autocomplete=zip-code i],\n[name*=postalCode i], [name*=zipcode i]";
const addressCountryCode = ["[name=country i], [autocomplete=country i],\n     [name*=countryCode i], [name*=country-code i],\n     [name*=countryName i], [name*=country-name i]", "select.idms-address-country" // Fix for Apple signup
];
const birthdayDay = "\n[name=bday-day i],\n[name*=birthday_day i], [name*=birthday-day i],\n[name=date_of_birth_day i], [name=date-of-birth-day i],\n[name^=birthdate_d i], [name^=birthdate-d i],\n[aria-label=\"birthday\" i][placeholder=\"day\" i]";
const birthdayMonth = "\n[name=bday-month i],\n[name*=birthday_month i], [name*=birthday-month i],\n[name=date_of_birth_month i], [name=date-of-birth-month i],\n[name^=birthdate_m i], [name^=birthdate-m i],\nselect[name=\"mm\" i]";
const birthdayYear = "\n[name=bday-year i],\n[name*=birthday_year i], [name*=birthday-year i],\n[name=date_of_birth_year i], [name=date-of-birth-year i],\n[name^=birthdate_y i], [name^=birthdate-y i],\n[aria-label=\"birthday\" i][placeholder=\"year\" i]";
const selectors = {
  // Generic
  genericTextField,
  submitButtonSelector,
  formInputsSelector,
  safeUniversalSelector,
  // Credentials
  emailAddress,
  username,
  password,
  // Credit Card
  cardName,
  cardNumber,
  cardSecurityCode,
  expirationMonth,
  expirationYear,
  expiration,
  // Identities
  firstName,
  middleName,
  lastName,
  fullName,
  phone,
  addressStreet,
  addressStreet2,
  addressCity,
  addressProvince,
  addressPostalCode,
  addressCountryCode,
  birthdayDay,
  birthdayMonth,
  birthdayYear
};
exports.selectors = selectors;

},{}],37:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCacheableVendorRegexes = createCacheableVendorRegexes;

/**
 * Given some ruleSets, create an efficient
 * lookup system for accessing cached regexes by name.
 *
 * @param {VendorRegexConfiguration["rules"]} rules
 * @param {VendorRegexConfiguration["ruleSets"]} ruleSets
 * @return {{RULES: Record<keyof VendorRegexRules, RegExp | undefined>}}
 */
function createCacheableVendorRegexes(rules, ruleSets) {
  const vendorRegExp = {
    RULES: rules,
    RULE_SETS: ruleSets,

    _getRule(name) {
      let rules = [];
      this.RULE_SETS.forEach(set => {
        if (set[name]) {
          var _set$name;

          // Add the rule.
          // We make the regex lower case so that we can match it against the
          // lower-cased field name and get a rough equivalent of a case-insensitive
          // match. This avoids a performance cliff with the "iu" flag on regular
          // expressions.
          rules.push("(".concat((_set$name = set[name]) === null || _set$name === void 0 ? void 0 : _set$name.toLowerCase(), ")").normalize('NFKC'));
        }
      });
      const value = new RegExp(rules.join('|'), 'u');
      Object.defineProperty(this.RULES, name, {
        get: undefined
      });
      Object.defineProperty(this.RULES, name, {
        value
      });
      return value;
    },

    init() {
      Object.keys(this.RULES).forEach(field => Object.defineProperty(this.RULES, field, {
        get() {
          return vendorRegExp._getRule(field);
        }

      }));
    }

  };
  vendorRegExp.init(); // @ts-ignore

  return vendorRegExp;
}

},{}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InContextSignup = void 0;

var _deviceApiCalls = require("./deviceApiCalls/__generated__/deviceApiCalls.js");

var _autofillUtils = require("./autofill-utils.js");

class InContextSignup {
  /**
   * @param {import("./DeviceInterface/InterfacePrototype").default} device
   */
  constructor(device) {
    this.device = device;
  }

  async init() {
    await this.refreshData();
    this.addNativeAccessibleGlobalFunctions();
  }

  addNativeAccessibleGlobalFunctions() {
    if (!this.device.globalConfig.hasModernWebkitAPI) return;

    try {
      // Set up a function which can be called from the native layer after completed sign-up or sign-in.
      Object.defineProperty(window, 'openAutofillAfterClosingEmailProtectionTab', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: () => {
          this.openAutofillTooltip();
        }
      });
    } catch (e) {// Ignore if function can't be set up, it's a UX enhancement not a critical flow
    }
  }

  async refreshData() {
    const incontextSignupDismissedAt = await this.device.deviceApi.request(new _deviceApiCalls.GetIncontextSignupDismissedAtCall(null));
    this.permanentlyDismissedAt = incontextSignupDismissedAt.permanentlyDismissedAt;
    this.isInstalledRecently = incontextSignupDismissedAt.isInstalledRecently;
  }

  async openAutofillTooltip() {
    var _this$device$uiContro, _this$device$activeFo;

    // Make sure we're working with the latest data
    await this.device.refreshData(); // Make sure the tooltip is closed before we try to open it

    await ((_this$device$uiContro = this.device.uiController) === null || _this$device$uiContro === void 0 ? void 0 : _this$device$uiContro.removeTooltip('stateChange')); // Make sure the input doesn't have focus so we can focus on it again

    const activeInput = (_this$device$activeFo = this.device.activeForm) === null || _this$device$activeFo === void 0 ? void 0 : _this$device$activeFo.activeInput;
    activeInput === null || activeInput === void 0 ? void 0 : activeInput.blur(); // Select the active input to open the tooltip

    const selectActiveInput = () => {
      activeInput === null || activeInput === void 0 ? void 0 : activeInput.focus();
    };

    if (document.hasFocus()) {
      selectActiveInput();
    } else {
      document.addEventListener('visibilitychange', () => {
        selectActiveInput();
      }, {
        once: true
      });
    }
  }

  isPermanentlyDismissed() {
    return Boolean(this.permanentlyDismissedAt);
  }

  isOnValidDomain() {
    // Only show in-context signup if we've high confidence that the page is
    // not internally hosted or an intranet
    return (0, _autofillUtils.isValidTLD)() && !(0, _autofillUtils.isLocalNetwork)();
  }

  isAllowedByDevice() {
    if (typeof this.isInstalledRecently === 'boolean') {
      return this.isInstalledRecently;
    } else {
      // Don't restrict in-context signup based on recent installation
      // if the device hasn't provided a clear indication
      return true;
    }
  }
  /**
   * @param {import('./Form/matching.js').SupportedSubTypes | "unknown"} [inputType]
   * @returns {boolean}
   */


  isAvailable() {
    var _this$device$settings, _this$device$settings2;

    let inputType = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'emailAddress';
    const isEmailInput = inputType === 'emailAddress';
    const isEmailProtectionEnabled = !!((_this$device$settings = this.device.settings) !== null && _this$device$settings !== void 0 && _this$device$settings.featureToggles.emailProtection);
    const isIncontextSignupEnabled = !!((_this$device$settings2 = this.device.settings) !== null && _this$device$settings2 !== void 0 && _this$device$settings2.featureToggles.emailProtection_incontext_signup);
    const isNotAlreadyLoggedIn = !this.device.isDeviceSignedIn();
    const isNotDismissed = !this.isPermanentlyDismissed();
    const isOnExpectedPage = this.device.globalConfig.isTopFrame || this.isOnValidDomain();
    const isAllowedByDevice = this.isAllowedByDevice();
    return isEmailInput && isEmailProtectionEnabled && isIncontextSignupEnabled && isNotAlreadyLoggedIn && isNotDismissed && isOnExpectedPage && isAllowedByDevice;
  }

  onIncontextSignup() {
    this.device.deviceApi.notify(new _deviceApiCalls.StartEmailProtectionSignupCall({}));
    this.device.firePixel({
      pixelName: 'incontext_primary_cta'
    });
  }

  onIncontextSignupDismissed() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      shouldHideTooltip: true
    };

    if (options.shouldHideTooltip) {
      this.device.removeAutofillUIFromPage('Email Protection in-context signup dismissed.');
      this.device.deviceApi.notify(new _deviceApiCalls.CloseAutofillParentCall(null));
    }

    this.permanentlyDismissedAt = new Date().getTime();
    this.device.deviceApi.notify(new _deviceApiCalls.SetIncontextSignupPermanentlyDismissedAtCall({
      value: this.permanentlyDismissedAt
    }));
    this.device.firePixel({
      pixelName: 'incontext_dismiss_persisted'
    });
  } // In-context signup can be closed when displayed as a stand-alone tooltip, e.g. extension


  onIncontextSignupClosed() {
    var _this$device$activeFo2;

    (_this$device$activeFo2 = this.device.activeForm) === null || _this$device$activeFo2 === void 0 ? void 0 : _this$device$activeFo2.dismissTooltip();
    this.device.firePixel({
      pixelName: 'incontext_close_x'
    });
  }

}

exports.InContextSignup = InContextSignup;

},{"./autofill-utils.js":55,"./deviceApiCalls/__generated__/deviceApiCalls.js":59}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PROVIDER_LOCKED = exports.AUTOGENERATED_KEY = void 0;
exports.appendGeneratedKey = appendGeneratedKey;
exports.createCredentialsTooltipItem = createCredentialsTooltipItem;
exports.fromPassword = fromPassword;

var _autofillUtils = require("../autofill-utils.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }

function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

const AUTOGENERATED_KEY = 'autogenerated';
exports.AUTOGENERATED_KEY = AUTOGENERATED_KEY;
const PROVIDER_LOCKED = 'provider_locked';
/**
 * @implements {TooltipItemRenderer}
 */

exports.PROVIDER_LOCKED = PROVIDER_LOCKED;

var _data = /*#__PURE__*/new WeakMap();

class CredentialsTooltipItem {
  /** @type {CredentialsObject} */

  /** @param {CredentialsObject} data */
  constructor(data) {
    _classPrivateFieldInitSpec(this, _data, {
      writable: true,
      value: void 0
    });

    _defineProperty(this, "id", () => String(_classPrivateFieldGet(this, _data).id));

    _defineProperty(this, "labelMedium", _subtype => {
      var _classPrivateFieldGet2;

      if (_classPrivateFieldGet(this, _data).username) {
        return _classPrivateFieldGet(this, _data).username;
      }

      if ((_classPrivateFieldGet2 = _classPrivateFieldGet(this, _data).origin) !== null && _classPrivateFieldGet2 !== void 0 && _classPrivateFieldGet2.url) {
        return "Password for ".concat((0, _autofillUtils.truncateFromMiddle)(_classPrivateFieldGet(this, _data).origin.url));
      }

      return '';
    });

    _defineProperty(this, "labelSmall", _subtype => {
      var _classPrivateFieldGet3;

      if ((_classPrivateFieldGet3 = _classPrivateFieldGet(this, _data).origin) !== null && _classPrivateFieldGet3 !== void 0 && _classPrivateFieldGet3.url) {
        return (0, _autofillUtils.truncateFromMiddle)(_classPrivateFieldGet(this, _data).origin.url);
      }

      return '•••••••••••••••';
    });

    _defineProperty(this, "credentialsProvider", () => _classPrivateFieldGet(this, _data).credentialsProvider);

    _classPrivateFieldSet(this, _data, data);
  }

}
/**
 * @implements {TooltipItemRenderer}
 */


var _data2 = /*#__PURE__*/new WeakMap();

class AutoGeneratedCredential {
  /** @type {CredentialsObject} */

  /** @param {CredentialsObject} data */
  constructor(data) {
    _classPrivateFieldInitSpec(this, _data2, {
      writable: true,
      value: void 0
    });

    _defineProperty(this, "id", () => String(_classPrivateFieldGet(this, _data2).id));

    _defineProperty(this, "label", _subtype => _classPrivateFieldGet(this, _data2).password);

    _defineProperty(this, "labelMedium", _subtype => 'Generated password');

    _defineProperty(this, "labelSmall", _subtype => 'Login information will be saved for this website');

    _classPrivateFieldSet(this, _data2, data);
  }

}
/**
 * Generate a stand-in 'CredentialsObject' from a
 * given (generated) password.
 *
 * @param {string} password
 * @param {string} username
 * @returns {CredentialsObject}
 */


function fromPassword(password, username) {
  return {
    [AUTOGENERATED_KEY]: true,
    password,
    username
  };
}
/**
 * @implements TooltipItemRenderer
 */


var _data3 = /*#__PURE__*/new WeakMap();

class ProviderLockedItem {
  /** @type {CredentialsObject} */

  /** @param {CredentialsObject} data */
  constructor(data) {
    _classPrivateFieldInitSpec(this, _data3, {
      writable: true,
      value: void 0
    });

    _defineProperty(this, "id", () => String(_classPrivateFieldGet(this, _data3).id));

    _defineProperty(this, "labelMedium", _subtype => 'Bitwarden is locked');

    _defineProperty(this, "labelSmall", _subtype => 'Unlock your vault to access credentials or generate passwords');

    _defineProperty(this, "credentialsProvider", () => _classPrivateFieldGet(this, _data3).credentialsProvider);

    _classPrivateFieldSet(this, _data3, data);
  }

}
/**
 * If the locally generated/stored password or username ends up being the same
 * as submitted in a subsequent form submission - then we mark the
 * credentials as 'autogenerated' so that the native layer can decide
 * how to process it
 *
 * @param {DataStorageObject} data
 * @param {object} [autofilledFields]
 * @param {string|null|undefined} [autofilledFields.username] - if present, it's the last username generated by something like email Protection
 * @param {string|null|undefined} [autofilledFields.password] - if present, it's the last generated password
 *
 */


function appendGeneratedKey(data) {
  var _data$credentials, _data$credentials2;

  let autofilledFields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let autogenerated = false; // does the current password match the most recently generated one?

  if (autofilledFields.password && ((_data$credentials = data.credentials) === null || _data$credentials === void 0 ? void 0 : _data$credentials.password) === autofilledFields.password) {
    autogenerated = true;
  } // does the current username match a recently generated one? (eg: email protection)


  if (autofilledFields.username && ((_data$credentials2 = data.credentials) === null || _data$credentials2 === void 0 ? void 0 : _data$credentials2.username) === autofilledFields.username) {
    autogenerated = true;
  } // if neither username nor password were generated, don't alter the outgoing data


  if (!autogenerated) return data; // if we get here, we're confident that something was generated + filled
  // so we mark the credential as 'autogenerated' for the benefit of native implementations

  return { ...data,
    credentials: { ...data.credentials,
      [AUTOGENERATED_KEY]: true
    }
  };
}
/**
 * Factory for creating a TooltipItemRenderer
 *
 * @param {CredentialsObject} data
 * @returns {TooltipItemRenderer}
 */


function createCredentialsTooltipItem(data) {
  if (data.id === PROVIDER_LOCKED) {
    return new ProviderLockedItem(data);
  }

  if (AUTOGENERATED_KEY in data && data.password) {
    return new AutoGeneratedCredential(data);
  }

  return new CredentialsTooltipItem(data);
}

},{"../autofill-utils.js":55}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CreditCardTooltipItem = void 0;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }

function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

var _data = /*#__PURE__*/new WeakMap();

/**
 * @implements {TooltipItemRenderer}
 */
class CreditCardTooltipItem {
  /** @type {CreditCardObject} */

  /** @param {CreditCardObject} data */
  constructor(data) {
    _classPrivateFieldInitSpec(this, _data, {
      writable: true,
      value: void 0
    });

    _defineProperty(this, "id", () => String(_classPrivateFieldGet(this, _data).id));

    _defineProperty(this, "labelMedium", _ => _classPrivateFieldGet(this, _data).title);

    _defineProperty(this, "labelSmall", _ => _classPrivateFieldGet(this, _data).displayNumber);

    _classPrivateFieldSet(this, _data, data);
  }

}

exports.CreditCardTooltipItem = CreditCardTooltipItem;

},{}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IdentityTooltipItem = void 0;

var _formatters = require("../Form/formatters.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }

function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

var _data = /*#__PURE__*/new WeakMap();

/**
 * @implements {TooltipItemRenderer}
 */
class IdentityTooltipItem {
  /** @type {IdentityObject} */

  /** @param {IdentityObject} data */
  constructor(data) {
    _classPrivateFieldInitSpec(this, _data, {
      writable: true,
      value: void 0
    });

    _defineProperty(this, "id", () => String(_classPrivateFieldGet(this, _data).id));

    _defineProperty(this, "labelMedium", subtype => {
      if (subtype === 'addressCountryCode') {
        return (0, _formatters.getCountryDisplayName)('en', _classPrivateFieldGet(this, _data).addressCountryCode || '');
      }

      if (_classPrivateFieldGet(this, _data).id === 'privateAddress') {
        return 'Generate Private Duck Address';
      }

      return _classPrivateFieldGet(this, _data)[subtype];
    });

    _defineProperty(this, "labelSmall", _ => {
      return _classPrivateFieldGet(this, _data).title;
    });

    _classPrivateFieldSet(this, _data, data);
  }

  label(subtype) {
    if (_classPrivateFieldGet(this, _data).id === 'privateAddress') {
      return _classPrivateFieldGet(this, _data)[subtype];
    }

    return null;
  }

}

exports.IdentityTooltipItem = IdentityTooltipItem;

},{"../Form/formatters.js":28}],42:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PasswordGenerator = void 0;

var _index = require("../packages/password/index.js");

var _rules = _interopRequireDefault(require("../packages/password/rules.json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }

function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

var _previous = /*#__PURE__*/new WeakMap();

/**
 * Create a password once and reuse it.
 */
class PasswordGenerator {
  constructor() {
    _classPrivateFieldInitSpec(this, _previous, {
      writable: true,
      value: null
    });
  }

  /** @returns {boolean} */
  get generated() {
    return _classPrivateFieldGet(this, _previous) !== null;
  }
  /** @returns {string|null} */


  get password() {
    return _classPrivateFieldGet(this, _previous);
  }
  /** @param {import('../packages/password').GenerateOptions} [params] */


  generate() {
    let params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    if (_classPrivateFieldGet(this, _previous)) {
      return _classPrivateFieldGet(this, _previous);
    }

    _classPrivateFieldSet(this, _previous, (0, _index.generate)({ ...params,
      rules: _rules.default
    }));

    return _classPrivateFieldGet(this, _previous);
  }

}

exports.PasswordGenerator = PasswordGenerator;

},{"../packages/password/index.js":9,"../packages/password/rules.json":13}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createScanner = createScanner;

var _Form = require("./Form/Form.js");

var _constants = require("./constants.js");

var _matching = require("./Form/matching.js");

var _autofillUtils = require("./autofill-utils.js");

var _deviceApiCalls = require("./deviceApiCalls/__generated__/deviceApiCalls.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const {
  MAX_INPUTS_PER_PAGE,
  MAX_FORMS_PER_PAGE,
  MAX_INPUTS_PER_FORM
} = _constants.constants;
/**
 * @typedef {{
 *     forms: Map<HTMLElement, import("./Form/Form").Form>;
 *     init(): (reason, ...rest)=> void;
 *     enqueue(elements: (HTMLElement|Document)[]): void;
 *     findEligibleInputs(context): Scanner;
 *     matching: import("./Form/matching").Matching;
 *     options: ScannerOptions;
 * }} Scanner
 *
 * @typedef {{
 *     initialDelay: number,
 *     bufferSize: number,
 *     debounceTimePeriod: number,
 *     maxInputsPerPage: number,
 *     maxFormsPerPage: number,
 *     maxInputsPerForm: number
 * }} ScannerOptions
 */

/** @type {ScannerOptions} */

const defaultScannerOptions = {
  // This buffer size is very large because it's an unexpected edge-case that
  // a DOM will be continually modified over and over without ever stopping. If we do see 1000 unique
  // new elements in the buffer however then this will prevent the algorithm from never ending.
  bufferSize: 50,
  // wait for a 500ms window of event silence before performing the scan
  debounceTimePeriod: 500,
  // how long to wait when performing the initial scan
  initialDelay: 0,
  // How many inputs is too many on the page. If we detect that there's above
  // this maximum, then we don't scan the page. This will prevent slowdowns on
  // large pages which are unlikely to require autofill anyway.
  maxInputsPerPage: MAX_INPUTS_PER_PAGE,
  maxFormsPerPage: MAX_FORMS_PER_PAGE,
  maxInputsPerForm: MAX_INPUTS_PER_FORM
};
/**
 * This allows:
 *   1) synchronous DOM scanning + mutations - via `createScanner(device).findEligibleInputs(document)`
 *   2) or, as above + a debounced mutation observer to re-run the scan after the given time
 */

class DefaultScanner {
  /** @type Map<HTMLElement, Form> */

  /** @type {any|undefined} the timer to reset */

  /** @type {Set<HTMLElement|Document>} stored changed elements until they can be processed */

  /** @type {ScannerOptions} */

  /** @type {HTMLInputElement | null} */

  /** @type {boolean} A flag to indicate the whole page will be re-scanned */

  /** @type {boolean} Indicates whether we called stopScanning */

  /** @type {import("./Form/matching").Matching} matching */

  /**
   * @param {import("./DeviceInterface/InterfacePrototype").default} device
   * @param {ScannerOptions} options
   */
  constructor(device, options) {
    _defineProperty(this, "forms", new Map());

    _defineProperty(this, "debounceTimer", void 0);

    _defineProperty(this, "changedElements", new Set());

    _defineProperty(this, "options", void 0);

    _defineProperty(this, "activeInput", null);

    _defineProperty(this, "rescanAll", false);

    _defineProperty(this, "stopped", false);

    _defineProperty(this, "matching", void 0);

    _defineProperty(this, "mutObs", new MutationObserver(mutationList => {
      /** @type {HTMLElement[]} */
      if (this.rescanAll) {
        // quick version if buffer full
        this.enqueue([]);
        return;
      }

      const outgoing = [];

      for (const mutationRecord of mutationList) {
        if (mutationRecord.type === 'childList') {
          for (let addedNode of mutationRecord.addedNodes) {
            if (!(addedNode instanceof HTMLElement)) continue;
            if (addedNode.nodeName === 'DDG-AUTOFILL') continue;
            outgoing.push(addedNode);
          }
        }
      }

      this.enqueue(outgoing);
    }));

    this.device = device;
    this.matching = (0, _matching.createMatching)();
    this.options = options;
    /** @type {number} A timestamp of the  */

    this.initTimeStamp = Date.now();
  }
  /**
   * Determine whether we should fire the credentials autoprompt. This is needed because some sites are blank
   * on page load and load scripts asynchronously, so our initial scan didn't set the autoprompt correctly
   * @returns {boolean}
   */


  get shouldAutoprompt() {
    return Date.now() - this.initTimeStamp <= 1500;
  }
  /**
   * Call this to scan once and then watch for changes.
   *
   * Call the returned function to remove listeners.
   * @returns {(reason: string, ...rest) => void}
   */


  init() {
    var _this = this;

    if (this.device.globalConfig.isExtension) {
      this.device.deviceApi.notify(new _deviceApiCalls.AddDebugFlagCall({
        flag: 'autofill'
      }));
    }

    const delay = this.options.initialDelay; // if the delay is zero, (chrome/firefox etc) then use `requestIdleCallback`

    if (delay === 0) {
      window.requestIdleCallback(() => this.scanAndObserve());
    } else {
      // otherwise, use the delay time to defer the initial scan
      setTimeout(() => this.scanAndObserve(), delay);
    }

    return function (reason) {
      for (var _len = arguments.length, rest = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        rest[_key - 1] = arguments[_key];
      }

      _this.stopScanner(reason, ...rest);
    };
  }
  /**
   * Scan the page and begin observing changes
   */


  scanAndObserve() {
    var _window$performance, _window$performance$m, _window$performance2, _window$performance2$;

    (_window$performance = window.performance) === null || _window$performance === void 0 ? void 0 : (_window$performance$m = _window$performance.mark) === null || _window$performance$m === void 0 ? void 0 : _window$performance$m.call(_window$performance, 'initial_scanner:init:start');
    this.findEligibleInputs(document);
    (_window$performance2 = window.performance) === null || _window$performance2 === void 0 ? void 0 : (_window$performance2$ = _window$performance2.mark) === null || _window$performance2$ === void 0 ? void 0 : _window$performance2$.call(_window$performance2, 'initial_scanner:init:end');
    (0, _autofillUtils.logPerformance)('initial_scanner');
    this.mutObs.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  /**
   * @param context
   */


  findEligibleInputs(context) {
    var _context$matches;

    // Avoid autofill on Email Protection web app
    if (this.device.globalConfig.isDDGDomain) {
      return this;
    }

    if ('matches' in context && (_context$matches = context.matches) !== null && _context$matches !== void 0 && _context$matches.call(context, this.matching.cssSelector('formInputsSelector'))) {
      this.addInput(context);
    } else {
      const inputs = context.querySelectorAll(this.matching.cssSelector('formInputsSelector'));

      if (inputs.length > this.options.maxInputsPerPage) {
        this.stopScanner('Too many input fields in the given context, stop scanning', context);
        return this;
      }

      inputs.forEach(input => this.addInput(input));
    }

    return this;
  }
  /**
   * Stops scanning, switches off the mutation observer and clears all forms
   * @param {string} reason
   * @param {...any} rest
   */


  stopScanner(reason) {
    var _this$device$activeFo;

    this.stopped = true;

    if ((0, _autofillUtils.shouldLog)()) {
      for (var _len2 = arguments.length, rest = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        rest[_key2 - 1] = arguments[_key2];
      }

      console.log(reason, ...rest);
    }

    const activeInput = (_this$device$activeFo = this.device.activeForm) === null || _this$device$activeFo === void 0 ? void 0 : _this$device$activeFo.activeInput; // remove Dax, listeners, timers, and observers

    clearTimeout(this.debounceTimer);
    this.changedElements.clear();
    this.mutObs.disconnect();
    this.forms.forEach(form => {
      form.destroy();
    });
    this.forms.clear(); // Bring the user back to the input they were interacting with

    activeInput === null || activeInput === void 0 ? void 0 : activeInput.focus();
  }
  /**
   * @param {HTMLElement|HTMLInputElement|HTMLSelectElement} input
   * @returns {HTMLFormElement|HTMLElement}
   */


  getParentForm(input) {
    if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
      if (input.form) {
        // Use input.form unless it encloses most of the DOM
        // In that case we proceed to identify more precise wrappers
        if (this.forms.has(input.form) || // If we've added the form we've already checked that it's not a page wrapper
        !(0, _autofillUtils.isFormLikelyToBeUsedAsPageWrapper)(input.form)) {
          return input.form;
        }
      }
    }

    let element = input; // traverse the DOM to search for related inputs

    while (element.parentElement && element.parentElement !== document.documentElement) {
      var _element$parentElemen;

      // Avoid overlapping containers or forms
      const siblingForm = (_element$parentElemen = element.parentElement) === null || _element$parentElemen === void 0 ? void 0 : _element$parentElemen.querySelector('form');

      if (siblingForm && siblingForm !== element) {
        return element;
      }

      element = element.parentElement;
      const inputs = element.querySelectorAll(this.matching.cssSelector('formInputsSelector'));
      const buttons = element.querySelectorAll(this.matching.cssSelector('submitButtonSelector')); // If we find a button or another input, we assume that's our form

      if (inputs.length > 1 || buttons.length) {
        // found related input, return common ancestor
        return element;
      }
    }

    return input;
  }
  /**
   * @param {HTMLInputElement|HTMLSelectElement} input
   */


  addInput(input) {
    if (this.stopped) return;
    const parentForm = this.getParentForm(input);

    if (parentForm instanceof HTMLFormElement && this.forms.has(parentForm)) {
      var _this$forms$get;

      // We've met the form, add the input
      (_this$forms$get = this.forms.get(parentForm)) === null || _this$forms$get === void 0 ? void 0 : _this$forms$get.addInput(input);
      return;
    } // Check if the forms we've seen are either disconnected,
    // or are parent/child of the currently-found form


    let previouslyFoundParent, childForm;

    for (const [formEl] of this.forms) {
      // Remove disconnected forms to avoid leaks
      if (!formEl.isConnected) {
        this.forms.delete(formEl);
        continue;
      }

      if (formEl.contains(parentForm)) {
        previouslyFoundParent = formEl;
        break;
      }

      if (parentForm.contains(formEl)) {
        childForm = formEl;
        break;
      }
    }

    if (previouslyFoundParent) {
      if (parentForm instanceof HTMLFormElement && parentForm !== previouslyFoundParent) {
        // If we had a prior parent but this is an explicit form, the previous was a false positive
        this.forms.delete(previouslyFoundParent);
      } else {
        var _this$forms$get2;

        // If we've already met the form or a descendant, add the input
        (_this$forms$get2 = this.forms.get(previouslyFoundParent)) === null || _this$forms$get2 === void 0 ? void 0 : _this$forms$get2.addInput(input);
      }
    } else {
      // if this form is an ancestor of an existing form, remove that before adding this
      if (childForm) {
        var _this$forms$get3;

        (_this$forms$get3 = this.forms.get(childForm)) === null || _this$forms$get3 === void 0 ? void 0 : _this$forms$get3.destroy();
        this.forms.delete(childForm);
      } // Only add the form if below the limit of forms per page


      if (this.forms.size < this.options.maxFormsPerPage) {
        this.forms.set(parentForm, new _Form.Form(parentForm, input, this.device, this.matching, this.shouldAutoprompt));
      } else {
        this.stopScanner('The page has too many forms, stop adding them.');
      }
    }
  }
  /**
   * enqueue elements to be re-scanned after the given
   * amount of time has elapsed.
   *
   * @param {(HTMLElement|Document)[]} htmlElements
   */


  enqueue(htmlElements) {
    // if the buffer limit is reached, stop trying to track elements and process body instead.
    if (this.changedElements.size >= this.options.bufferSize) {
      this.rescanAll = true;
      this.changedElements.clear();
    } else if (!this.rescanAll) {
      // otherwise keep adding each element to the queue
      for (let element of htmlElements) {
        this.changedElements.add(element);
      }
    }

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      var _window$performance3, _window$performance3$, _window$performance4, _window$performance4$;

      (_window$performance3 = window.performance) === null || _window$performance3 === void 0 ? void 0 : (_window$performance3$ = _window$performance3.mark) === null || _window$performance3$ === void 0 ? void 0 : _window$performance3$.call(_window$performance3, 'scanner:init:start');
      this.processChangedElements();
      this.changedElements.clear();
      this.rescanAll = false;
      (_window$performance4 = window.performance) === null || _window$performance4 === void 0 ? void 0 : (_window$performance4$ = _window$performance4.mark) === null || _window$performance4$ === void 0 ? void 0 : _window$performance4$.call(_window$performance4, 'scanner:init:end');
      (0, _autofillUtils.logPerformance)('scanner');
    }, this.options.debounceTimePeriod);
  }
  /**
   * re-scan the changed elements, but only if they
   * are still present in the DOM
   */


  processChangedElements() {
    if (this.rescanAll) {
      this.findEligibleInputs(document);
      return;
    }

    for (let element of this.changedElements) {
      if (element.isConnected) {
        this.findEligibleInputs(element);
      }
    }
  }
  /**
   * Watch for changes in the DOM, and enqueue elements to be scanned
   * @type {MutationObserver}
   */


}
/**
 * @param {import("./DeviceInterface/InterfacePrototype").default} device
 * @param {Partial<ScannerOptions>} [scannerOptions]
 * @returns {Scanner}
 */


function createScanner(device, scannerOptions) {
  return new DefaultScanner(device, { ...defaultScannerOptions,
    ...scannerOptions
  });
}

},{"./Form/Form.js":25,"./Form/matching.js":35,"./autofill-utils.js":55,"./constants.js":58,"./deviceApiCalls/__generated__/deviceApiCalls.js":59}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Settings = void 0;

var _index = require("../packages/device-api/index.js");

var _deviceApiCalls = require("./deviceApiCalls/__generated__/deviceApiCalls.js");

var _validatorsZod = require("./deviceApiCalls/__generated__/validators.zod.js");

var _autofillUtils = require("./autofill-utils.js");

var _appleUtils = require("@duckduckgo/content-scope-scripts/src/apple-utils");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Some Type helpers to prevent duplication
 * @typedef {import("./deviceApiCalls/__generated__/validators-ts").AutofillFeatureToggles} AutofillFeatureToggles
 * @typedef {import("./deviceApiCalls/__generated__/validators-ts").AvailableInputTypes} AvailableInputTypes
 * @typedef {import("./deviceApiCalls/__generated__/validators-ts").RuntimeConfiguration} RuntimeConfiguration
 * @typedef {import("../packages/device-api").DeviceApi} DeviceApi
 */

/**
 * The Settings class encapsulates the concept of 1) feature toggles + 2) available input types.
 *
 * 1) Feature toggles are boolean flags that can represent a device's capabilities. That may be user-toggled
 * or not, we don't make that distinction.
 *
 * 2) Available Input Types are indicators to whether the given platform can provide data for a given type.
 * For example, a user might have credentials saved for https://example.com, so when the page loads, but **before**
 * we can decorate any fields, we determine this first.
 */
class Settings {
  /** @type {GlobalConfig} */

  /** @type {DeviceApi} */

  /** @type {AutofillFeatureToggles | null} */

  /** @type {AvailableInputTypes | null} */

  /** @type {RuntimeConfiguration | null | undefined} */

  /** @type {boolean | null} */

  /**
   * @param {GlobalConfig} config
   * @param {DeviceApi} deviceApi
   */
  constructor(config, deviceApi) {
    _defineProperty(this, "globalConfig", void 0);

    _defineProperty(this, "deviceApi", void 0);

    _defineProperty(this, "_featureToggles", null);

    _defineProperty(this, "_availableInputTypes", null);

    _defineProperty(this, "_runtimeConfiguration", null);

    _defineProperty(this, "_enabled", null);

    this.deviceApi = deviceApi;
    this.globalConfig = config;
  }
  /**
   * Feature toggles are delivered as part of the Runtime Configuration - a flexible design that
   * allows data per user + remote config to be accessed together.
   *
   * Once we access the Runtime Configuration, we then extract the autofill-specific settings via
   * `runtimeConfig.userPreferences.features.autofill.settings` and validate that separately.
   *
   * The 2-step validation occurs because RuntimeConfiguration will be coming from a shared library
   * and does not know about the shape of Autofill specific settings.
   *
   * @returns {Promise<AutofillFeatureToggles>}
   */


  async getFeatureToggles() {
    try {
      var _runtimeConfig$userPr, _runtimeConfig$userPr2, _runtimeConfig$userPr3;

      const runtimeConfig = await this._getRuntimeConfiguration();
      const autofillSettings = (0, _index.validate)((_runtimeConfig$userPr = runtimeConfig.userPreferences) === null || _runtimeConfig$userPr === void 0 ? void 0 : (_runtimeConfig$userPr2 = _runtimeConfig$userPr.features) === null || _runtimeConfig$userPr2 === void 0 ? void 0 : (_runtimeConfig$userPr3 = _runtimeConfig$userPr2.autofill) === null || _runtimeConfig$userPr3 === void 0 ? void 0 : _runtimeConfig$userPr3.settings, _validatorsZod.autofillSettingsSchema);
      return autofillSettings.featureToggles;
    } catch (e) {
      // these are the fallbacks for when a platform hasn't implemented the calls above.
      if (this.globalConfig.isDDGTestMode) {
        console.log('isDDGTestMode: getFeatureToggles: ❌', e);
      }

      return Settings.defaults.featureToggles;
    }
  }
  /**
   * If the platform in question is happy to derive it's 'enabled' state from the RuntimeConfiguration,
   * then they should use this. Currently only Windows supports this, but we aim to move all platforms to
   * support this going forward.
   * @returns {Promise<boolean|null>}
   */


  async getEnabled() {
    try {
      const runtimeConfig = await this._getRuntimeConfiguration();
      const enabled = (0, _autofillUtils.autofillEnabled)(runtimeConfig, _appleUtils.processConfig);
      return enabled;
    } catch (e) {
      // these are the fallbacks for when a platform hasn't implemented the calls above. (like on android)
      if (this.globalConfig.isDDGTestMode) {
        console.log('isDDGTestMode: getFeatureToggles: ❌', e);
      }

      return null;
    }
  }
  /**
   * Get runtime configuration, but only once.
   *
   * Some platforms may be reading this directly from inlined variables, whilst others
   * may make a DeviceApiCall.
   *
   * Currently, it's only read once - but we should be open to the idea that we may need
   * this to be called multiple times in the future.
   *
   * @returns {Promise<RuntimeConfiguration>}
   * @throws
   * @private
   */


  async _getRuntimeConfiguration() {
    if (this._runtimeConfiguration) return this._runtimeConfiguration;
    const runtimeConfig = await this.deviceApi.request(new _deviceApiCalls.GetRuntimeConfigurationCall(null));
    this._runtimeConfiguration = runtimeConfig;
    return this._runtimeConfiguration;
  }
  /**
   * Available Input Types are boolean indicators to represent which input types the
   * current **user** has data available for.
   *
   * @returns {Promise<AvailableInputTypes>}
   */


  async getAvailableInputTypes() {
    try {
      return await this.deviceApi.request(new _deviceApiCalls.GetAvailableInputTypesCall(null));
    } catch (e) {
      if (this.globalConfig.isDDGTestMode) {
        console.log('isDDGTestMode: getAvailableInputTypes: ❌', e);
      }

      return Settings.defaults.availableInputTypes;
    }
  }
  /**
   * To 'refresh' settings means to re-call APIs to determine new state. This may
   * only occur once per page, but it must be done before any page scanning/decorating can happen
   *
   * @returns {Promise<{
   *      availableInputTypes: AvailableInputTypes,
   *      featureToggles: AutofillFeatureToggles,
   *      enabled: boolean | null
   * }>}
   */


  async refresh() {
    this.setEnabled(await this.getEnabled());
    this.setFeatureToggles(await this.getFeatureToggles());
    this.setAvailableInputTypes(await this.getAvailableInputTypes()); // If 'this.enabled' is a boolean it means we were able to set it correctly and therefor respect its value

    if (typeof this.enabled === 'boolean') {
      if (!this.enabled) {
        return Settings.defaults;
      }
    }

    return {
      featureToggles: this.featureToggles,
      availableInputTypes: this.availableInputTypes,
      enabled: this.enabled
    };
  }
  /**
   * Checks if input type is one which we can't autofill
   * @param {{
   *   mainType: SupportedMainTypes
   *   subtype: import('./Form/matching.js').SupportedSubTypes | "unknown"
   * }} types
   * @returns {boolean}
   */


  isTypeUnavailable(_ref) {
    let {
      mainType,
      subtype
    } = _ref;
    if (mainType === 'unknown') return true;

    if (!this.featureToggles["inputType_".concat(mainType)] && subtype !== 'emailAddress') {
      return true;
    }

    return false;
  }
  /**
   * Requests data from remote
   * @returns {Promise<>}
   */


  async populateData() {
    const availableInputTypesFromRemote = await this.getAvailableInputTypes();
    this.setAvailableInputTypes(availableInputTypesFromRemote);
  }
  /**
   * Requests data from remote if not available
   * @param {{
   *   mainType: SupportedMainTypes
   *   subtype: import('./Form/matching.js').SupportedSubTypes | "unknown"
   * }} types
   * @returns {Promise<boolean>}
   */


  async populateDataIfNeeded(_ref2) {
    var _this$availableInputT;

    let {
      mainType,
      subtype
    } = _ref2;
    if (this.isTypeUnavailable({
      mainType,
      subtype
    })) return false;

    if (((_this$availableInputT = this.availableInputTypes) === null || _this$availableInputT === void 0 ? void 0 : _this$availableInputT[mainType]) === undefined) {
      await this.populateData();
      return true;
    }

    return false;
  }
  /**
   * Checks if items will show in the autofill menu, including in-context signup.
   * Triggers side-effect if input types is not already available.
   * @param {{
   *   mainType: SupportedMainTypes
   *   subtype: import('./Form/matching.js').SupportedSubTypes | "unknown"
   * }} types
   * @param {import("./InContextSignup.js").InContextSignup?} inContextSignup
   * @returns {boolean}
   */


  canAutofillType(_ref3, inContextSignup) {
    var _this$availableInputT6;

    let {
      mainType,
      subtype
    } = _ref3;
    if (this.isTypeUnavailable({
      mainType,
      subtype
    })) return false; // If it's an email field and Email Protection is enabled, return true regardless of other options

    const isEmailProtectionEnabled = this.featureToggles.emailProtection && this.availableInputTypes.email;

    if (subtype === 'emailAddress' && isEmailProtectionEnabled) {
      return true;
    }

    if (inContextSignup !== null && inContextSignup !== void 0 && inContextSignup.isAvailable(subtype)) {
      return true;
    }

    if (subtype === 'fullName') {
      var _this$availableInputT2, _this$availableInputT3;

      return Boolean(((_this$availableInputT2 = this.availableInputTypes.identities) === null || _this$availableInputT2 === void 0 ? void 0 : _this$availableInputT2.firstName) || ((_this$availableInputT3 = this.availableInputTypes.identities) === null || _this$availableInputT3 === void 0 ? void 0 : _this$availableInputT3.lastName));
    }

    if (subtype === 'expiration') {
      var _this$availableInputT4, _this$availableInputT5;

      return Boolean(((_this$availableInputT4 = this.availableInputTypes.creditCards) === null || _this$availableInputT4 === void 0 ? void 0 : _this$availableInputT4.expirationMonth) || ((_this$availableInputT5 = this.availableInputTypes.creditCards) === null || _this$availableInputT5 === void 0 ? void 0 : _this$availableInputT5.expirationYear));
    }

    return Boolean((_this$availableInputT6 = this.availableInputTypes[mainType]) === null || _this$availableInputT6 === void 0 ? void 0 : _this$availableInputT6[subtype]);
  }
  /** @returns {AutofillFeatureToggles} */


  get featureToggles() {
    if (this._featureToggles === null) throw new Error('feature toggles accessed before being set');
    return this._featureToggles;
  }
  /** @param {AutofillFeatureToggles} input */


  setFeatureToggles(input) {
    this._featureToggles = input;
  }
  /** @returns {AvailableInputTypes} */


  get availableInputTypes() {
    if (this._availableInputTypes === null) throw new Error('available input types accessed before being set');
    return this._availableInputTypes;
  }
  /** @param {AvailableInputTypes} value */


  setAvailableInputTypes(value) {
    this._availableInputTypes = { ...this._availableInputTypes,
      ...value
    };
  }

  static default(globalConfig, deviceApi) {
    const settings = new Settings(globalConfig, deviceApi);
    settings.setFeatureToggles(Settings.defaults.featureToggles);
    settings.setAvailableInputTypes(Settings.defaults.availableInputTypes);
    return settings;
  }
  /** @returns {boolean|null} */


  get enabled() {
    return this._enabled;
  }
  /**
   * @param {boolean|null} enabled
   */


  setEnabled(enabled) {
    this._enabled = enabled;
  }

}

exports.Settings = Settings;

_defineProperty(Settings, "defaults", {
  /** @type {AutofillFeatureToggles} */
  featureToggles: {
    credentials_saving: false,
    password_generation: false,
    emailProtection: false,
    emailProtection_incontext_signup: false,
    inputType_identities: false,
    inputType_credentials: false,
    inputType_creditCards: false,
    inlineIcon_credentials: false
  },

  /** @type {AvailableInputTypes} */
  availableInputTypes: {
    credentials: {
      username: false,
      password: false
    },
    identities: {
      firstName: false,
      middleName: false,
      lastName: false,
      birthdayDay: false,
      birthdayMonth: false,
      birthdayYear: false,
      addressStreet: false,
      addressStreet2: false,
      addressCity: false,
      addressProvince: false,
      addressPostalCode: false,
      addressCountryCode: false,
      phone: false,
      emailAddress: false
    },
    creditCards: {
      cardName: false,
      cardSecurityCode: false,
      expirationMonth: false,
      expirationYear: false,
      cardNumber: false
    },
    email: false
  },

  /** @type {boolean | null} */
  enabled: null
});

},{"../packages/device-api/index.js":6,"./autofill-utils.js":55,"./deviceApiCalls/__generated__/deviceApiCalls.js":59,"./deviceApiCalls/__generated__/validators.zod.js":60,"@duckduckgo/content-scope-scripts/src/apple-utils":1}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _autofillUtils = require("../autofill-utils.js");

var _HTMLTooltip = _interopRequireDefault(require("./HTMLTooltip.js"));

var _Credentials = require("../InputTypes/Credentials.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class DataHTMLTooltip extends _HTMLTooltip.default {
  renderEmailProtectionIncontextSignup(isOtherItems) {
    const dataTypeClass = "tooltip__button--data--identities";
    const providerIconClass = 'tooltip__button--data--duckduckgo';
    return "\n            ".concat(isOtherItems ? '<hr />' : '', "\n            <button id=\"incontextSignup\" class=\"tooltip__button tooltip__button--data ").concat(dataTypeClass, " ").concat(providerIconClass, " js-get-email-signup\">\n                <span class=\"tooltip__button__text-container\">\n                    <span class=\"label label--medium\">\n                        Hide your email and block trackers\n                    </span>\n                    <span class=\"label label--small\">\n                        Create a unique, random address that also removes hidden trackers and forwards email to your inbox.\n                    </span>\n                </span>\n            </button>\n        ");
  }
  /**
   * @param {InputTypeConfigs} config
   * @param {TooltipItemRenderer[]} items
   * @param {{
   *   onSelect(id:string): void
   *   onManage(type:InputTypeConfigs['type']): void
   *   onIncontextSignupDismissed?(data: {
   *      hasOtherOptions: Boolean
   *   }): void
   *   onIncontextSignup?(): void
   * }} callbacks
   */


  render(config, items, callbacks) {
    const {
      wrapperClass,
      css
    } = this.options;
    const isTopAutofill = wrapperClass === null || wrapperClass === void 0 ? void 0 : wrapperClass.includes('top-autofill');
    let hasAddedSeparator = false; // Only show an hr above the first duck address button, but it can be either personal or private

    const shouldShowSeparator = (dataId, index) => {
      const shouldShow = ['personalAddress', 'privateAddress'].includes(dataId) && !hasAddedSeparator;
      if (shouldShow) hasAddedSeparator = true; // Don't show the separator if we want to show it, but it's unnecessary as the first item in the menu

      const isFirst = index === 0;
      return shouldShow && !isFirst;
    }; // Only show manage Manage… when it's topAutofill, the provider is unlocked, and it's not just EmailProtection


    const shouldShowManageButton = isTopAutofill && items.some(item => !['personalAddress', 'privateAddress', _Credentials.PROVIDER_LOCKED].includes(item.id()));
    const topClass = wrapperClass || '';
    const dataTypeClass = "tooltip__button--data--".concat(config.type);
    this.shadow.innerHTML = "\n".concat(css, "\n<div class=\"wrapper wrapper--data ").concat(topClass, "\" hidden>\n    <div class=\"tooltip tooltip--data").concat(this.options.isIncontextSignupAvailable() ? ' tooltip--incontext-signup' : '', "\">\n        ").concat(items.map((item, index) => {
      var _item$credentialsProv, _item$labelSmall, _item$label;

      const credentialsProvider = (_item$credentialsProv = item.credentialsProvider) === null || _item$credentialsProv === void 0 ? void 0 : _item$credentialsProv.call(item);
      const providerIconClass = credentialsProvider ? "tooltip__button--data--".concat(credentialsProvider) : ''; // these 2 are optional

      const labelSmall = (_item$labelSmall = item.labelSmall) === null || _item$labelSmall === void 0 ? void 0 : _item$labelSmall.call(item, this.subtype);
      const label = (_item$label = item.label) === null || _item$label === void 0 ? void 0 : _item$label.call(item, this.subtype);
      return "\n            ".concat(shouldShowSeparator(item.id(), index) ? '<hr />' : '', "\n            <button id=\"").concat(item.id(), "\" class=\"tooltip__button tooltip__button--data ").concat(dataTypeClass, " ").concat(providerIconClass, " js-autofill-button\">\n                <span class=\"tooltip__button__text-container\">\n                    <span class=\"label label--medium\">").concat((0, _autofillUtils.escapeXML)(item.labelMedium(this.subtype)), "</span>\n                    ").concat(label ? "<span class=\"label\">".concat((0, _autofillUtils.escapeXML)(label), "</span>") : '', "\n                    ").concat(labelSmall ? "<span class=\"label label--small\">".concat((0, _autofillUtils.escapeXML)(labelSmall), "</span>") : '', "\n                </span>\n            </button>\n        ");
    }).join(''), "\n        ").concat(this.options.isIncontextSignupAvailable() ? this.renderEmailProtectionIncontextSignup(items.length > 0) : '', "\n        ").concat(shouldShowManageButton ? "\n            <hr />\n            <button id=\"manage-button\" class=\"tooltip__button tooltip__button--manage\" type=\"button\">\n                <span class=\"tooltip__button__text-container\">\n                    <span class=\"label label--medium\">Manage ".concat(config.displayName, "\u2026</span>\n                </span>\n            </button>") : '', "\n    </div>\n</div>");
    this.wrapper = this.shadow.querySelector('.wrapper');
    this.tooltip = this.shadow.querySelector('.tooltip');
    this.autofillButtons = this.shadow.querySelectorAll('.js-autofill-button');
    this.autofillButtons.forEach(btn => {
      this.registerClickableButton(btn, () => {
        // Fire only if the cursor is hovering the button
        if (btn.matches('.wrapper:not(.top-autofill) button:hover, .currentFocus')) {
          callbacks.onSelect(btn.id);
        } else {
          console.warn('The button doesn\'t seem to be hovered. Please check.');
        }
      });
    });
    this.manageButton = this.shadow.getElementById('manage-button');

    if (this.manageButton) {
      this.registerClickableButton(this.manageButton, () => {
        callbacks.onManage(config.type);
      });
    }

    const getIncontextSignup = this.shadow.querySelector('.js-get-email-signup');

    if (getIncontextSignup) {
      this.registerClickableButton(getIncontextSignup, () => {
        var _callbacks$onIncontex, _callbacks$onIncontex2;

        (_callbacks$onIncontex = callbacks.onIncontextSignupDismissed) === null || _callbacks$onIncontex === void 0 ? void 0 : _callbacks$onIncontex.call(callbacks, {
          hasOtherOptions: items.length > 0
        });
        (_callbacks$onIncontex2 = callbacks.onIncontextSignup) === null || _callbacks$onIncontex2 === void 0 ? void 0 : _callbacks$onIncontex2.call(callbacks);
      });
    }

    this.init();
    return this;
  }

}

var _default = DataHTMLTooltip;
exports.default = _default;

},{"../InputTypes/Credentials.js":39,"../autofill-utils.js":55,"./HTMLTooltip.js":48}],46:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _autofillUtils = require("../autofill-utils.js");

var _HTMLTooltip = _interopRequireDefault(require("./HTMLTooltip.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class EmailHTMLTooltip extends _HTMLTooltip.default {
  /**
   * @param {import("../DeviceInterface/InterfacePrototype").default} device
   */
  render(device) {
    this.device = device;
    this.addresses = device.getLocalAddresses();
    this.shadow.innerHTML = "\n".concat(this.options.css, "\n<div class=\"wrapper wrapper--email\" hidden>\n    <div class=\"tooltip tooltip--email\">\n        <button class=\"tooltip__button tooltip__button--email js-use-personal\">\n            <span class=\"tooltip__button--email__primary-text\">\n                Use <span class=\"js-address\">").concat((0, _autofillUtils.formatDuckAddress)((0, _autofillUtils.escapeXML)(this.addresses.personalAddress)), "</span>\n            </span>\n            <span class=\"tooltip__button--email__secondary-text\">Block email trackers</span>\n        </button>\n        <button class=\"tooltip__button tooltip__button--email js-use-private\">\n            <span class=\"tooltip__button--email__primary-text\">Generate a Private Duck Address</span>\n            <span class=\"tooltip__button--email__secondary-text\">Block email trackers & hide address</span>\n        </button>\n    </div>\n    <div class=\"tooltip--email__caret\"></div>\n</div>");
    this.wrapper = this.shadow.querySelector('.wrapper');
    this.tooltip = this.shadow.querySelector('.tooltip');
    this.usePersonalButton = this.shadow.querySelector('.js-use-personal');
    this.usePrivateButton = this.shadow.querySelector('.js-use-private');
    this.addressEl = this.shadow.querySelector('.js-address');

    this.updateAddresses = addresses => {
      if (addresses && this.addressEl) {
        this.addresses = addresses;
        this.addressEl.textContent = (0, _autofillUtils.formatDuckAddress)(addresses.personalAddress);
      }
    };

    const firePixel = this.device.firePixel.bind(this.device);
    this.registerClickableButton(this.usePersonalButton, () => {
      this.fillForm('personalAddress');
      firePixel({
        pixelName: 'autofill_personal_address'
      });
    });
    this.registerClickableButton(this.usePrivateButton, () => {
      this.fillForm('privateAddress');
      firePixel({
        pixelName: 'autofill_private_address'
      });
    }); // Get the alias from the extension

    this.device.getAddresses().then(this.updateAddresses);
    this.init();
    return this;
  }
  /**
   * @param {'personalAddress' | 'privateAddress'} id
   */


  async fillForm(id) {
    var _this$device;

    const address = this.addresses[id];
    const formattedAddress = (0, _autofillUtils.formatDuckAddress)(address);
    (_this$device = this.device) === null || _this$device === void 0 ? void 0 : _this$device.selectedDetail({
      email: formattedAddress,
      id
    }, 'email');
  }

}

var _default = EmailHTMLTooltip;
exports.default = _default;

},{"../autofill-utils.js":55,"./HTMLTooltip.js":48}],47:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _HTMLTooltip = _interopRequireDefault(require("./HTMLTooltip.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class EmailSignupHTMLTooltip extends _HTMLTooltip.default {
  /**
   * @param {import("../DeviceInterface/InterfacePrototype").default} device
   */
  render(device) {
    this.device = device;
    this.shadow.innerHTML = "\n".concat(this.options.css, "\n<div class=\"wrapper wrapper--email\" hidden>\n    <div class=\"tooltip tooltip--email tooltip--email-signup\">\n        <button class=\"close-tooltip js-close-email-signup\" aria-label=\"Close\"></button>\n        <h1>\n            Hide your email and block trackers\n        </h1>\n        <p>\n            Create a unique, random address that also removes hidden trackers and forwards email to your inbox.\n        </p>\n        <div class=\"notice-controls\">\n            <a href=\"https://duckduckgo.com/email/start-incontext\" target=\"_blank\" class=\"primary js-get-email-signup\">\n                Protect My Email\n            </a>\n            <button class=\"ghost js-dismiss-email-signup\">\n                Don't Show Again\n            </button>\n        </div>\n    </div>\n    <div class=\"tooltip--email__caret\"></div>\n</div>");
    this.tooltip = this.shadow.querySelector('.tooltip');
    this.closeEmailSignup = this.shadow.querySelector('.js-close-email-signup');
    this.registerClickableButton(this.closeEmailSignup, () => {
      var _device$inContextSign;

      (_device$inContextSign = device.inContextSignup) === null || _device$inContextSign === void 0 ? void 0 : _device$inContextSign.onIncontextSignupClosed();
    });
    this.dismissEmailSignup = this.shadow.querySelector('.js-dismiss-email-signup');
    this.registerClickableButton(this.dismissEmailSignup, () => {
      var _device$inContextSign2;

      (_device$inContextSign2 = device.inContextSignup) === null || _device$inContextSign2 === void 0 ? void 0 : _device$inContextSign2.onIncontextSignupDismissed();
    });
    this.getEmailSignup = this.shadow.querySelector('.js-get-email-signup');
    this.registerClickableButton(this.getEmailSignup, () => {
      var _device$inContextSign3;

      (_device$inContextSign3 = device.inContextSignup) === null || _device$inContextSign3 === void 0 ? void 0 : _device$inContextSign3.onIncontextSignup();
    });
    this.init();
    return this;
  }

}

var _default = EmailSignupHTMLTooltip;
exports.default = _default;

},{"./HTMLTooltip.js":48}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultOptions = exports.default = exports.HTMLTooltip = void 0;

var _autofillUtils = require("../autofill-utils.js");

var _matching = require("../Form/matching.js");

var _styles = require("./styles/styles.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @typedef {object} HTMLTooltipOptions
 * @property {boolean} testMode
 * @property {string | null} [wrapperClass]
 * @property {(top: number, left: number) => string} [tooltipPositionClass]
 * @property {(top: number, left: number, isAboveInput: boolean) => string} [caretPositionClass]
 * @property {(details: {height: number, width: number}) => void} [setSize] - if this is set, it will be called initially once + every times the size changes
 * @property {() => void} remove
 * @property {string} css
 * @property {boolean} checkVisibility
 * @property {boolean} hasCaret
 * @property {() => boolean} isIncontextSignupAvailable
 */

/**
 * @typedef {object}  TransformRuleObj
 * @property {HTMLTooltipOptions['caretPositionClass']} getRuleString
 * @property {number | null} index
 */

/** @type {HTMLTooltipOptions} */
const defaultOptions = {
  wrapperClass: '',
  tooltipPositionClass: (top, left) => "\n        .tooltip {\n            transform: translate(".concat(Math.floor(left), "px, ").concat(Math.floor(top), "px) !important;\n        }\n    "),
  caretPositionClass: (top, left, isAboveInput) => "\n        .tooltip--email__caret {\n            ".concat(isAboveInput ? "transform: translate(".concat(Math.floor(left), "px, ").concat(Math.floor(top), "px) rotate(180deg); transform-origin: 18px !important;") : "transform: translate(".concat(Math.floor(left), "px, ").concat(Math.floor(top), "px) !important;"), "\n        }"),
  css: "<style>".concat(_styles.CSS_STYLES, "</style>"),
  setSize: undefined,
  remove: () => {
    /** noop */
  },
  testMode: false,
  checkVisibility: true,
  hasCaret: false,
  isIncontextSignupAvailable: () => false
};
exports.defaultOptions = defaultOptions;

class HTMLTooltip {
  /** @type {HTMLTooltipOptions} */

  /**
   * @param config
   * @param inputType
   * @param getPosition
   * @param {HTMLTooltipOptions} options
   */
  constructor(config, inputType, getPosition, options) {
    _defineProperty(this, "isAboveInput", false);

    _defineProperty(this, "options", void 0);

    _defineProperty(this, "resObs", new ResizeObserver(entries => entries.forEach(() => this.checkPosition())));

    _defineProperty(this, "mutObsCheckPositionWhenIdle", _autofillUtils.whenIdle.call(this, this.checkPosition));

    _defineProperty(this, "mutObs", new MutationObserver(mutationList => {
      for (const mutationRecord of mutationList) {
        if (mutationRecord.type === 'childList') {
          // Only check added nodes
          mutationRecord.addedNodes.forEach(el => {
            if (el.nodeName === 'DDG-AUTOFILL') return;
            this.ensureIsLastInDOM();
          });
        }
      }

      this.mutObsCheckPositionWhenIdle();
    }));

    _defineProperty(this, "clickableButtons", new Map());

    this.options = options;
    this.shadow = document.createElement('ddg-autofill').attachShadow({
      mode: options.testMode ? 'open' : 'closed'
    });
    this.host = this.shadow.host;
    this.config = config;
    this.subtype = (0, _matching.getSubtypeFromType)(inputType);
    this.tooltip = null;
    this.getPosition = getPosition;
    const forcedVisibilityStyles = {
      'display': 'block',
      'visibility': 'visible',
      'opacity': '1'
    }; // @ts-ignore how to narrow this.host to HTMLElement?

    (0, _autofillUtils.addInlineStyles)(this.host, forcedVisibilityStyles);
    this.count = 0;
    this.device = null;
    /**
     * @type {{
     *   'tooltip': TransformRuleObj,
     *   'caret': TransformRuleObj
     * }}
     */

    this.transformRules = {
      caret: {
        getRuleString: this.options.caretPositionClass,
        index: null
      },
      tooltip: {
        getRuleString: this.options.tooltipPositionClass,
        index: null
      }
    };
  }

  get isHidden() {
    return this.tooltip.parentNode.hidden;
  }

  append() {
    document.body.appendChild(this.host);
  }

  remove() {
    var _this$device;

    (_this$device = this.device) === null || _this$device === void 0 ? void 0 : _this$device.activeForm.resetIconStylesToInitial();
    window.removeEventListener('scroll', this, {
      capture: true
    });
    this.resObs.disconnect();
    this.mutObs.disconnect();
    this.lift();
  }

  lift() {
    this.left = null;
    this.top = null;
    document.body.removeChild(this.host);
  }

  handleEvent(event) {
    switch (event.type) {
      case 'scroll':
        this.checkPosition();
        break;
    }
  }

  focus(x, y) {
    var _this$shadow$elementF, _this$shadow$elementF2;

    const focusableElements = 'button';
    const currentFocusClassName = 'currentFocus';
    const currentFocused = this.shadow.querySelectorAll(".".concat(currentFocusClassName));
    [...currentFocused].forEach(el => {
      el.classList.remove(currentFocusClassName);
    });
    (_this$shadow$elementF = this.shadow.elementFromPoint(x, y)) === null || _this$shadow$elementF === void 0 ? void 0 : (_this$shadow$elementF2 = _this$shadow$elementF.closest(focusableElements)) === null || _this$shadow$elementF2 === void 0 ? void 0 : _this$shadow$elementF2.classList.add(currentFocusClassName);
  }

  checkPosition() {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
    }

    this.animationFrame = window.requestAnimationFrame(() => {
      if (this.isHidden) return;
      const {
        left,
        bottom,
        height,
        top
      } = this.getPosition();

      if (left !== this.left || bottom !== this.top) {
        const coords = {
          left,
          top: bottom
        };
        this.updatePosition('tooltip', coords);

        if (this.options.hasCaret) {
          // Recalculate tooltip top as it may have changed after update potition above
          const {
            top: tooltipTop
          } = this.tooltip.getBoundingClientRect();
          this.isAboveInput = top > tooltipTop;
          const borderWidth = 2;
          const caretTop = this.isAboveInput ? coords.top - height - borderWidth : coords.top;
          this.updatePosition('caret', { ...coords,
            top: caretTop
          });
        }
      }

      this.animationFrame = null;
    });
  }

  getOverridePosition(_ref) {
    let {
      left,
      top
    } = _ref;
    const tooltipBoundingBox = this.tooltip.getBoundingClientRect();
    const smallScreenWidth = tooltipBoundingBox.width * 2;
    const spacing = 5; // If overflowing from the bottom, move to above the input

    if (tooltipBoundingBox.bottom > window.innerHeight) {
      const inputPosition = this.getPosition();
      const caretHeight = 14;
      const overriddenTopPosition = top - tooltipBoundingBox.height - inputPosition.height - caretHeight;
      if (overriddenTopPosition >= 0) return {
        left,
        top: overriddenTopPosition
      };
    } // If overflowing from the left on smaller screen, center in the window


    if (tooltipBoundingBox.left < 0 && window.innerWidth <= smallScreenWidth) {
      const leftOverflow = Math.abs(tooltipBoundingBox.left);
      const leftPosWhenCentered = (window.innerWidth - tooltipBoundingBox.width) / 2;
      const overriddenLeftPosition = left + leftOverflow + leftPosWhenCentered;
      return {
        left: overriddenLeftPosition,
        top
      };
    } // If overflowing from the left on larger screen, move so it's just on screen on the left


    if (tooltipBoundingBox.left < 0 && window.innerWidth > smallScreenWidth) {
      const leftOverflow = Math.abs(tooltipBoundingBox.left);
      const overriddenLeftPosition = left + leftOverflow + spacing;
      return {
        left: overriddenLeftPosition,
        top
      };
    } // If overflowing from the right, move so it's just on screen on the right


    if (tooltipBoundingBox.right > window.innerWidth) {
      const rightOverflow = tooltipBoundingBox.right - window.innerWidth;
      const overriddenLeftPosition = left - rightOverflow - spacing;
      return {
        left: overriddenLeftPosition,
        top
      };
    }
  }
  /**
   * @param {'tooltip' | 'caret'} element
   * @param {{
   *     left: number,
   *     top: number
   * }} coords
   */


  applyPositionalStyles(element, _ref2) {
    var _ruleObj$getRuleStrin;

    let {
      left,
      top
    } = _ref2;
    const shadow = this.shadow;
    const ruleObj = this.transformRules[element];

    if (ruleObj.index) {
      if (shadow.styleSheets[0].rules[ruleObj.index]) {
        // If we have already set the rule, remove it…
        shadow.styleSheets[0].deleteRule(ruleObj.index);
      }
    } else {
      // …otherwise, set the index as the very last rule
      ruleObj.index = shadow.styleSheets[0].rules.length;
    }

    const cssRule = (_ruleObj$getRuleStrin = ruleObj.getRuleString) === null || _ruleObj$getRuleStrin === void 0 ? void 0 : _ruleObj$getRuleStrin.call(ruleObj, top, left, this.isAboveInput);

    if (typeof cssRule === 'string') {
      shadow.styleSheets[0].insertRule(cssRule, ruleObj.index);
    }
  }
  /**
   * @param {'tooltip' | 'caret'} element
   * @param {{
   *     left: number,
   *     top: number
   * }} coords
   */


  updatePosition(element, _ref3) {
    let {
      left,
      top
    } = _ref3;

    // If the stylesheet is not loaded wait for load (Chrome bug)
    if (!this.shadow.styleSheets.length) {
      var _this$stylesheet;

      (_this$stylesheet = this.stylesheet) === null || _this$stylesheet === void 0 ? void 0 : _this$stylesheet.addEventListener('load', () => this.checkPosition());
      return;
    }

    this.left = left;
    this.top = top;
    this.applyPositionalStyles(element, {
      left,
      top
    });

    if (this.options.hasCaret) {
      const overridePosition = this.getOverridePosition({
        left,
        top
      });
      if (overridePosition) this.updatePosition(element, overridePosition);
    }
  }

  ensureIsLastInDOM() {
    this.count = this.count || 0; // If DDG el is not the last in the doc, move it there

    if (document.body.lastElementChild !== this.host) {
      // Try up to 15 times to avoid infinite loop in case someone is doing the same
      if (this.count < 15) {
        this.lift();
        this.append();
        this.checkPosition();
        this.count++;
      } else {
        // Remove the tooltip from the form to cleanup listeners and observers
        this.options.remove();
        console.info("DDG autofill bailing out");
      }
    }
  }

  setActiveButton(e) {
    this.activeButton = e.target;
  }

  unsetActiveButton() {
    this.activeButton = null;
  }

  registerClickableButton(btn, handler) {
    this.clickableButtons.set(btn, handler); // Needed because clicks within the shadow dom don't provide this info to the outside

    btn.addEventListener('mouseenter', e => this.setActiveButton(e));
    btn.addEventListener('mouseleave', () => this.unsetActiveButton());
  }

  dispatchClick() {
    const handler = this.clickableButtons.get(this.activeButton);

    if (handler) {
      if (this.activeButton.matches('.wrapper:not(.top-autofill) button:hover, .wrapper:not(.top-autofill) a:hover, .currentFocus')) {
        (0, _autofillUtils.safeExecute)(this.activeButton, handler, {
          checkVisibility: this.options.checkVisibility
        });
      } else {
        console.warn('The button doesn\'t seem to be hovered. Please check.');
      }
    }
  }

  setupSizeListener() {
    // Listen to layout and paint changes to register the size
    const observer = new PerformanceObserver(() => {
      this.setSize();
    });
    observer.observe({
      entryTypes: ['layout-shift', 'paint']
    });
  }

  setSize() {
    var _this$options$setSize, _this$options;

    const innerNode = this.shadow.querySelector('.wrapper--data'); // Shouldn't be possible

    if (!innerNode) return;
    const details = {
      height: innerNode.clientHeight,
      width: innerNode.clientWidth
    };
    (_this$options$setSize = (_this$options = this.options).setSize) === null || _this$options$setSize === void 0 ? void 0 : _this$options$setSize.call(_this$options, details);
  }

  init() {
    var _this$stylesheet2;

    this.animationFrame = null;
    this.top = 0;
    this.left = 0;
    this.transformRuleIndex = null;
    this.stylesheet = this.shadow.querySelector('link, style'); // Un-hide once the style and web fonts have loaded, to avoid flashing
    // unstyled content and layout shifts

    (_this$stylesheet2 = this.stylesheet) === null || _this$stylesheet2 === void 0 ? void 0 : _this$stylesheet2.addEventListener('load', () => {
      Promise.allSettled([document.fonts.load("normal 13px 'DDG_ProximaNova'"), document.fonts.load("bold 13px 'DDG_ProximaNova'")]).then(() => {
        this.tooltip.parentNode.removeAttribute('hidden');
        this.checkPosition();
      });
    });
    this.append();
    this.resObs.observe(document.body);
    this.mutObs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    window.addEventListener('scroll', this, {
      capture: true
    });
    this.setSize();

    if (typeof this.options.setSize === 'function') {
      this.setupSizeListener();
    }
  }

}

exports.HTMLTooltip = HTMLTooltip;
var _default = HTMLTooltip;
exports.default = _default;

},{"../Form/matching.js":35,"../autofill-utils.js":55,"./styles/styles.js":54}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HTMLTooltipUIController = void 0;

var _autofillUtils = require("../../autofill-utils.js");

var _inputTypeConfig = require("../../Form/inputTypeConfig.js");

var _matching = require("../../Form/matching.js");

var _DataHTMLTooltip = _interopRequireDefault(require("../DataHTMLTooltip.js"));

var _EmailHTMLTooltip = _interopRequireDefault(require("../EmailHTMLTooltip.js"));

var _EmailSignupHTMLTooltip = _interopRequireDefault(require("../EmailSignupHTMLTooltip.js"));

var _HTMLTooltip = require("../HTMLTooltip.js");

var _UIController = require("./UIController.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @typedef HTMLTooltipControllerOptions
 * @property {"modern" | "legacy" | "emailsignup"} tooltipKind - A choice between the newer Autofill UI vs the older ones used in the extension
 * @property {import("../../DeviceInterface/InterfacePrototype").default} device - The device interface that's currently running
 * regardless of whether this Controller has an open tooltip, or not
 */

/**
 * This encapsulates all the logic relating to showing/hiding the HTML Tooltip
 *
 * Note: This could be displayed in the current webpage (for example, in the extension)
 * or within a webview overlay (like on macOS & upcoming in windows)
 */
class HTMLTooltipUIController extends _UIController.UIController {
  /** @type {import("../HTMLTooltip.js").HTMLTooltip | null} */

  /** @type {HTMLTooltipControllerOptions} */

  /** @type {import('../HTMLTooltip.js').HTMLTooltipOptions} */

  /**
   * Overwritten when calling createTooltip
   * @type {import('../../Form/matching').SupportedTypes}
   */

  /**
   * @param {HTMLTooltipControllerOptions} options
   * @param {Partial<import('../HTMLTooltip.js').HTMLTooltipOptions>} htmlTooltipOptions
   */
  constructor(options) {
    let htmlTooltipOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _HTMLTooltip.defaultOptions;
    super();

    _defineProperty(this, "_activeTooltip", null);

    _defineProperty(this, "_options", void 0);

    _defineProperty(this, "_htmlTooltipOptions", void 0);

    _defineProperty(this, "_activeInputType", 'unknown');

    _defineProperty(this, "_activeInput", void 0);

    _defineProperty(this, "_activeInputOriginalAutocomplete", void 0);

    this._options = options;
    this._htmlTooltipOptions = Object.assign({}, _HTMLTooltip.defaultOptions, htmlTooltipOptions);
    window.addEventListener('pointerdown', this, true);
    window.addEventListener('pointerup', this, true);
  }

  /**
   * Cleans up after this UI controller by removing the tooltip and all
   * listeners.
   */
  destroy() {
    this.removeTooltip();
    window.removeEventListener('pointerdown', this, true);
    window.removeEventListener('pointerup', this, true);
  }
  /**
   * @param {import('./UIController').AttachArgs} args
   */


  attach(args) {
    if (this.getActiveTooltip()) {
      return;
    }

    const {
      topContextData,
      getPosition,
      input,
      form
    } = args;
    const tooltip = this.createTooltip(getPosition, topContextData);
    this.setActiveTooltip(tooltip);
    form.showingTooltip(input);
    this._activeInput = input;
    this._activeInputOriginalAutocomplete = input.getAttribute('autocomplete');
    input.setAttribute('autocomplete', 'off');
  }
  /**
   * Actually create the HTML Tooltip
   * @param {PosFn} getPosition
   * @param {TopContextData} topContextData
   * @return {import("../HTMLTooltip").HTMLTooltip}
   */


  createTooltip(getPosition, topContextData) {
    this._attachListeners();

    const config = (0, _inputTypeConfig.getInputConfigFromType)(topContextData.inputType);
    this._activeInputType = topContextData.inputType;
    /**
     * @type {import('../HTMLTooltip').HTMLTooltipOptions}
     */

    const tooltipOptions = { ...this._htmlTooltipOptions,
      remove: () => this.removeTooltip(),
      isIncontextSignupAvailable: () => {
        var _this$_options$device;

        const subtype = (0, _matching.getSubtypeFromType)(topContextData.inputType);
        return !!((_this$_options$device = this._options.device.inContextSignup) !== null && _this$_options$device !== void 0 && _this$_options$device.isAvailable(subtype));
      }
    };

    if (this._options.tooltipKind === 'legacy') {
      this._options.device.firePixel({
        pixelName: 'autofill_show'
      });

      return new _EmailHTMLTooltip.default(config, topContextData.inputType, getPosition, tooltipOptions).render(this._options.device);
    }

    if (this._options.tooltipKind === 'emailsignup') {
      this._options.device.firePixel({
        pixelName: 'incontext_show'
      });

      return new _EmailSignupHTMLTooltip.default(config, topContextData.inputType, getPosition, tooltipOptions).render(this._options.device);
    } // collect the data for each item to display


    const data = this._dataForAutofill(config, topContextData.inputType, topContextData); // convert the data into tool tip item renderers


    const asRenderers = data.map(d => config.tooltipItem(d)); // construct the autofill

    return new _DataHTMLTooltip.default(config, topContextData.inputType, getPosition, tooltipOptions).render(config, asRenderers, {
      onSelect: id => {
        this._onSelect(topContextData.inputType, data, id);
      },
      onManage: type => {
        this._onManage(type);
      },
      onIncontextSignupDismissed: flags => {
        this._onIncontextSignupDismissed(flags);
      },
      onIncontextSignup: () => {
        this._onIncontextSignup();
      }
    });
  }

  updateItems(data) {
    if (this._activeInputType === 'unknown') return;
    const config = (0, _inputTypeConfig.getInputConfigFromType)(this._activeInputType); // convert the data into tool tip item renderers

    const asRenderers = data.map(d => config.tooltipItem(d));
    const activeTooltip = this.getActiveTooltip();

    if (activeTooltip instanceof _DataHTMLTooltip.default) {
      activeTooltip === null || activeTooltip === void 0 ? void 0 : activeTooltip.render(config, asRenderers, {
        onSelect: id => {
          this._onSelect(this._activeInputType, data, id);
        },
        onManage: type => {
          this._onManage(type);
        },
        onIncontextSignupDismissed: flags => {
          this._onIncontextSignupDismissed(flags);
        },
        onIncontextSignup: () => {
          this._onIncontextSignup();
        }
      });
    } // TODO: can we remove this timeout once implemented with real APIs?
    // The timeout is needed because clientHeight and clientWidth were returning 0


    setTimeout(() => {
      var _this$getActiveToolti;

      (_this$getActiveToolti = this.getActiveTooltip()) === null || _this$getActiveToolti === void 0 ? void 0 : _this$getActiveToolti.setSize();
    }, 10);
  }

  _attachListeners() {
    window.addEventListener('input', this);
    window.addEventListener('keydown', this, true);
  }

  _removeListeners() {
    window.removeEventListener('input', this);
    window.removeEventListener('keydown', this, true);
  }

  handleEvent(event) {
    switch (event.type) {
      case 'keydown':
        if (['Escape', 'Tab', 'Enter'].includes(event.code)) {
          if (event.code === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
          }

          this.removeTooltip();
        }

        break;

      case 'input':
        this.removeTooltip();
        break;

      case 'pointerdown':
        {
          this._pointerDownListener(event);

          break;
        }

      case 'pointerup':
        {
          this._pointerUpListener(event);

          break;
        }
    }
  } // Global listener for event delegation


  _pointerDownListener(e) {
    if (!e.isTrusted) return; // Ignore events on the Dax icon, we handle those elsewhere

    if ((0, _autofillUtils.isEventWithinDax)(e, e.target)) return; // @ts-ignore

    if (e.target.nodeName === 'DDG-AUTOFILL') {
      e.preventDefault();
      e.stopImmediatePropagation(); // Ignore pointer down events, we'll handle them on pointer up
    } else {
      this.removeTooltip().catch(e => {
        console.error('error removing tooltip', e);
      });
    }
  } // Global listener for event delegation


  _pointerUpListener(e) {
    if (!e.isTrusted) return; // Ignore events on the Dax icon, we handle those elsewhere

    if ((0, _autofillUtils.isEventWithinDax)(e, e.target)) return; // @ts-ignore

    if (e.target.nodeName === 'DDG-AUTOFILL') {
      e.preventDefault();
      e.stopImmediatePropagation();
      const isMainMouseButton = e.button === 0;
      if (!isMainMouseButton) return;
      const activeTooltip = this.getActiveTooltip();
      activeTooltip === null || activeTooltip === void 0 ? void 0 : activeTooltip.dispatchClick();
    }
  }

  async removeTooltip(_via) {
    this._htmlTooltipOptions.remove();

    if (this._activeTooltip) {
      this._removeListeners();

      this._activeTooltip.remove();

      this._activeTooltip = null;
    }

    if (this._activeInput) {
      if (this._activeInputOriginalAutocomplete) {
        this._activeInput.setAttribute('autocomplete', this._activeInputOriginalAutocomplete);
      } else {
        this._activeInput.removeAttribute('autocomplete');
      }

      this._activeInput = null;
      this._activeInputOriginalAutocomplete = null;
    }
  }
  /**
   * @returns {import("../HTMLTooltip.js").HTMLTooltip|null}
   */


  getActiveTooltip() {
    return this._activeTooltip;
  }
  /**
   * @param {import("../HTMLTooltip.js").HTMLTooltip} value
   */


  setActiveTooltip(value) {
    this._activeTooltip = value;
  }
  /**
   * Collect the data that's needed to populate the Autofill UI.
   *
   * Note: ideally we'd pass this data instead, so that we didn't have a circular dependency
   *
   * @param {InputTypeConfigs} config - This is the selected `InputTypeConfig` based on the type of field
   * @param {import('../../Form/matching').SupportedTypes} inputType - The input type for the current field
   * @param {TopContextData} topContextData
   */


  _dataForAutofill(config, inputType, topContextData) {
    return this._options.device.dataForAutofill(config, inputType, topContextData);
  }
  /**
   * When a field is selected, call the `onSelect` method from the device.
   *
   * Note: ideally we'd pass this data instead, so that we didn't have a circular dependency
   *
   * @param {import('../../Form/matching').SupportedTypes} inputType
   * @param {(CreditCardObject | IdentityObject | CredentialsObject)[]} data
   * @param {CreditCardObject['id']|IdentityObject['id']|CredentialsObject['id']} id
   */


  _onSelect(inputType, data, id) {
    return this._options.device.onSelect(inputType, data, id);
  }
  /**
   * Called when clicking on the Manage… button in the html tooltip
   *
   * @param {SupportedMainTypes} type
   * @returns {*}
   * @private
   */


  _onManage(type) {
    this.removeTooltip();

    switch (type) {
      case 'credentials':
        return this._options.device.openManagePasswords();

      case 'creditCards':
        return this._options.device.openManageCreditCards();

      case 'identities':
        return this._options.device.openManageIdentities();

      default: // noop

    }
  }

  _onIncontextSignupDismissed(_ref) {
    var _this$_options$device2;

    let {
      hasOtherOptions
    } = _ref;
    (_this$_options$device2 = this._options.device.inContextSignup) === null || _this$_options$device2 === void 0 ? void 0 : _this$_options$device2.onIncontextSignupDismissed({
      shouldHideTooltip: !hasOtherOptions
    }); // If there are other options available, just force a re-render

    if (hasOtherOptions) {
      const topContextData = this._options.device.getTopContextData();

      if (!topContextData) return;
      const config = (0, _inputTypeConfig.getInputConfigFromType)(topContextData.inputType);

      const data = this._dataForAutofill(config, topContextData.inputType, topContextData);

      this.updateItems(data);
    }
  }

  _onIncontextSignup() {
    var _this$_options$device3;

    (_this$_options$device3 = this._options.device.inContextSignup) === null || _this$_options$device3 === void 0 ? void 0 : _this$_options$device3.onIncontextSignup();
  }

  isActive() {
    return Boolean(this.getActiveTooltip());
  }

}

exports.HTMLTooltipUIController = HTMLTooltipUIController;

},{"../../Form/inputTypeConfig.js":30,"../../Form/matching.js":35,"../../autofill-utils.js":55,"../DataHTMLTooltip.js":45,"../EmailHTMLTooltip.js":46,"../EmailSignupHTMLTooltip.js":47,"../HTMLTooltip.js":48,"./UIController.js":52}],50:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NativeUIController = void 0;

var _UIController = require("./UIController.js");

var _matching = require("../../Form/matching.js");

var _deviceApiCalls = require("../../deviceApiCalls/__generated__/deviceApiCalls.js");

var _Credentials = require("../../InputTypes/Credentials.js");

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }

function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

var _passwordStatus = /*#__PURE__*/new WeakMap();

/**
 * `NativeController` should be used in situations where you DO NOT
 * want any Autofill-controlled user interface.
 *
 * Examples are with iOS/Android, where 'attaching' only means
 * messaging a native layer to show a native tooltip.
 *
 * @example
 *
 * ```javascript
 * const controller = new NativeController();
 * controller.attach(...);
 * ```
 */
class NativeUIController extends _UIController.UIController {
  constructor() {
    super(...arguments);

    _classPrivateFieldInitSpec(this, _passwordStatus, {
      writable: true,
      value: 'default'
    });
  }

  /**
   * @param {import('./UIController').AttachArgs} args
   */
  attach(args) {
    const {
      form,
      input,
      device,
      trigger,
      triggerMetaData,
      topContextData
    } = args;
    const inputType = (0, _matching.getInputType)(input);
    const mainType = (0, _matching.getMainTypeFromType)(inputType);
    const subType = (0, _matching.getSubtypeFromType)(inputType);

    if (mainType === 'unknown') {
      throw new Error('unreachable, should not be here if (mainType === "unknown")');
    }

    if (trigger === 'autoprompt') {
      window.scrollTo({
        behavior: 'smooth',
        top: form.form.getBoundingClientRect().top - document.body.getBoundingClientRect().top - 50
      });
    }
    /** @type {import('../../deviceApiCalls/__generated__/validators-ts').GetAutofillDataRequest} */


    let payload = {
      inputType,
      mainType,
      subType,
      trigger
    }; // append generated password if enabled

    if (device.settings.featureToggles.password_generation) {
      payload = this.appendGeneratedPassword(topContextData, payload, triggerMetaData);
    }

    device.deviceApi.request(new _deviceApiCalls.GetAutofillDataCall(payload)).then(resp => {
      switch (resp.action) {
        case 'fill':
          {
            if (mainType in resp) {
              form.autofillData(resp[mainType], mainType);
            } else {
              throw new Error("action: \"fill\" cannot occur because \"".concat(mainType, "\" was missing"));
            }

            break;
          }

        case 'focus':
          {
            var _form$activeInput;

            (_form$activeInput = form.activeInput) === null || _form$activeInput === void 0 ? void 0 : _form$activeInput.focus();
            break;
          }

        case 'acceptGeneratedPassword':
          {
            var _topContextData$crede;

            form.autofillData({
              password: (_topContextData$crede = topContextData.credentials) === null || _topContextData$crede === void 0 ? void 0 : _topContextData$crede[0].password,
              [_Credentials.AUTOGENERATED_KEY]: true
            }, mainType);
            break;
          }

        case 'rejectGeneratedPassword':
          {
            var _form$activeInput2;

            _classPrivateFieldSet(this, _passwordStatus, 'rejected');

            form.touchAllInputs('credentials');
            (_form$activeInput2 = form.activeInput) === null || _form$activeInput2 === void 0 ? void 0 : _form$activeInput2.focus();
            break;
          }

        default:
          {
            if (args.device.isTestMode()) {
              console.warn('response not handled', resp);
            }
          }
      }
    }).catch(e => {
      console.error('NativeTooltip::device.getAutofillData(payload)');
      console.error(e);
    });
  }
  /**
   * If a password exists in `topContextData`, we can append it to the outgoing data
   * in a way that native platforms can easily understand.
   *
   * @param {TopContextData} topContextData
   * @param {import('../../deviceApiCalls/__generated__/validators-ts.js').GetAutofillDataRequest} outgoingData
   * @param {import('../../UI/controllers/UIController.js').AttachArgs['triggerMetaData']} triggerMetaData
   * @return {import('../../deviceApiCalls/__generated__/validators-ts.js').GetAutofillDataRequest}
   */


  appendGeneratedPassword(topContextData, outgoingData, triggerMetaData) {
    var _topContextData$crede2;

    const autoGeneratedCredential = (_topContextData$crede2 = topContextData.credentials) === null || _topContextData$crede2 === void 0 ? void 0 : _topContextData$crede2.find(credential => credential.autogenerated); // if there's no generated password, we don't need to do anything

    if (!(autoGeneratedCredential !== null && autoGeneratedCredential !== void 0 && autoGeneratedCredential.password)) {
      return outgoingData;
    }

    function suggestPassword() {
      if (!(autoGeneratedCredential !== null && autoGeneratedCredential !== void 0 && autoGeneratedCredential.password)) throw new Error('unreachable');
      return { ...outgoingData,
        generatedPassword: {
          value: autoGeneratedCredential.password,
          username: autoGeneratedCredential.username
        }
      };
    } // for explicit opt-in, we should *always* append the password
    // this can occur when the user clicks icon directly - in that instance we ignore
    // any internal state and just append the password to the outgoing data


    if (triggerMetaData.type === 'explicit-opt-in') {
      return suggestPassword();
    } // When the opt-in is 'implicit' though we only append the password if the user has not previously rejected it.
    // This helps the situation where the user has rejected a password for the username field, but then
    // taps into the confirm password field


    if (triggerMetaData.type === 'implicit-opt-in' && _classPrivateFieldGet(this, _passwordStatus) !== 'rejected') {
      return suggestPassword();
    } // if we get here there's nothing to do


    return outgoingData;
  }

}

exports.NativeUIController = NativeUIController;

},{"../../Form/matching.js":35,"../../InputTypes/Credentials.js":39,"../../deviceApiCalls/__generated__/deviceApiCalls.js":59,"./UIController.js":52}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OverlayUIController = void 0;

var _UIController = require("./UIController.js");

var _matching = require("../../Form/matching.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }

function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

var _state = /*#__PURE__*/new WeakMap();

/**
 * @typedef {import('../../deviceApiCalls/__generated__/validators-ts').GetAutofillDataRequest} GetAutofillDataRequest
 * @typedef {import('../../deviceApiCalls/__generated__/validators-ts').TriggerContext} TriggerContext
 *
 * @typedef OverlayControllerOptions
 * @property {() => Promise<void>} remove - A callback that will be fired when the tooltip should be removed
 * @property {(details: GetAutofillDataRequest) => Promise<void>} show - A callback that will be fired when the tooltip should be shown
 */

/**
 * Use this `OverlayController` when you want to control an overlay, but don't have
 * your own UI to display.
 *
 * For example, on macOS this `OverlayController` would run in the main webpage
 * and would then signal to its native side when the overlay should show/close
 *
 * @example `show` and `remove` can be implemented to match your native side's messaging needs
 *
 * ```javascript
 * const controller = new OverlayController({
 *     remove: async () => this.closeAutofillParent(),
 *     show: async (details) => this.show(details),
 *     onPointerDown: (e) => this.onPointerDown(e)
 * })
 *
 * controller.attach(...)
 * ```
 */
class OverlayUIController extends _UIController.UIController {
  /** @type {"idle" | "parentShown"} */

  /** @type {import('../HTMLTooltip.js').HTMLTooltip | null} */

  /**
   * @type {OverlayControllerOptions}
   */

  /**
   * @param {OverlayControllerOptions} options
   */
  constructor(options) {
    super();

    _classPrivateFieldInitSpec(this, _state, {
      writable: true,
      value: 'idle'
    });

    _defineProperty(this, "_activeTooltip", null);

    _defineProperty(this, "_options", void 0);

    this._options = options; // We always register this 'pointerdown' event, regardless of
    // whether we have a tooltip currently open or not. This is to ensure
    // we can clear out any existing state before opening a new one.

    window.addEventListener('pointerdown', this, true);
  }
  /**
   * @param {import('./UIController').AttachArgs} args
   */


  attach(args) {
    const {
      getPosition,
      topContextData,
      click,
      input
    } = args; // Do not attach the tooltip if the input is not in the DOM

    if (!input.parentNode) return; // If the input is removed from the DOM while the tooltip is attached, remove it

    this._mutObs = new MutationObserver(mutationList => {
      for (const mutationRecord of mutationList) {
        mutationRecord.removedNodes.forEach(el => {
          if (el.contains(input)) {
            this.removeTooltip('mutation observer');
          }
        });
      }
    });

    this._mutObs.observe(document.body, {
      childList: true,
      subtree: true
    });

    const position = getPosition(); // If the element is not in viewport, scroll there and recurse. 50ms is arbitrary

    if (!click && !this.elementIsInViewport(position)) {
      var _this$_mutObs;

      input.scrollIntoView(true);
      (_this$_mutObs = this._mutObs) === null || _this$_mutObs === void 0 ? void 0 : _this$_mutObs.disconnect();
      setTimeout(() => {
        this.attach(args);
      }, 50);
      return;
    }

    _classPrivateFieldSet(this, _state, 'parentShown');

    this.showTopTooltip(click, position, topContextData).catch(e => {
      console.error('error from showTopTooltip', e);

      _classPrivateFieldSet(this, _state, 'idle');
    });
  }
  /**
   * @param {{ x: number; y: number; height: number; width: number; }} inputDimensions
   * @returns {boolean}
   */


  elementIsInViewport(inputDimensions) {
    if (inputDimensions.x < 0 || inputDimensions.y < 0 || inputDimensions.x + inputDimensions.width > document.documentElement.clientWidth || inputDimensions.y + inputDimensions.height > document.documentElement.clientHeight) {
      return false;
    }

    const viewport = document.documentElement;

    if (inputDimensions.x + inputDimensions.width > viewport.clientWidth || inputDimensions.y + inputDimensions.height > viewport.clientHeight) {
      return false;
    }

    return true;
  }
  /**
   * @param {{ x: number; y: number; } | null} click
   * @param {{ x: number; y: number; height: number; width: number; }} inputDimensions
   * @param {TopContextData} data
   */


  async showTopTooltip(click, inputDimensions, data) {
    let diffX = inputDimensions.x;
    let diffY = inputDimensions.y;

    if (click) {
      diffX -= click.x;
      diffY -= click.y;
    } else if (!this.elementIsInViewport(inputDimensions)) {
      // If the focus event is outside the viewport ignore, we've already tried to scroll to it
      return;
    }

    if (!data.inputType) {
      throw new Error('No input type found');
    }

    const mainType = (0, _matching.getMainTypeFromType)(data.inputType);
    const subType = (0, _matching.getSubtypeFromType)(data.inputType);

    if (mainType === 'unknown') {
      throw new Error('unreachable, should not be here if (mainType === "unknown")');
    }
    /** @type {GetAutofillDataRequest} */


    const details = {
      inputType: data.inputType,
      mainType,
      subType,
      serializedInputContext: JSON.stringify(data),
      triggerContext: {
        wasFromClick: Boolean(click),
        inputTop: Math.floor(diffY),
        inputLeft: Math.floor(diffX),
        inputHeight: Math.floor(inputDimensions.height),
        inputWidth: Math.floor(inputDimensions.width)
      }
    };

    try {
      _classPrivateFieldSet(this, _state, 'parentShown');

      this._attachListeners();

      await this._options.show(details);
    } catch (e) {
      console.error('could not show parent', e);

      _classPrivateFieldSet(this, _state, 'idle');
    }
  }

  _attachListeners() {
    window.addEventListener('scroll', this);
    window.addEventListener('keydown', this, true);
    window.addEventListener('input', this);
  }

  _removeListeners() {
    window.removeEventListener('scroll', this);
    window.removeEventListener('keydown', this, true);
    window.removeEventListener('input', this);
  }

  handleEvent(event) {
    switch (event.type) {
      case 'scroll':
        {
          this.removeTooltip(event.type);
          break;
        }

      case 'keydown':
        {
          if (['Escape', 'Tab', 'Enter'].includes(event.code)) {
            if (event.code === 'Escape') {
              event.preventDefault();
              event.stopImmediatePropagation();
            }

            this.removeTooltip(event.type);
          }

          break;
        }

      case 'input':
        {
          this.removeTooltip(event.type);
          break;
        }

      case 'pointerdown':
        {
          this.removeTooltip(event.type);
          break;
        }
    }
  }
  /**
   * @param {string} trigger
   * @returns {Promise<void>}
   */


  async removeTooltip(trigger) {
    var _this$_mutObs2;

    // for none pointer events, check to see if the tooltip is open before trying to close it
    if (trigger !== 'pointerdown') {
      if (_classPrivateFieldGet(this, _state) !== 'parentShown') {
        return;
      }
    }

    try {
      await this._options.remove();
    } catch (e) {
      console.error('Could not close parent', e);
    }

    _classPrivateFieldSet(this, _state, 'idle');

    this._removeListeners();

    (_this$_mutObs2 = this._mutObs) === null || _this$_mutObs2 === void 0 ? void 0 : _this$_mutObs2.disconnect();
  }

  isActive() {
    return _classPrivateFieldGet(this, _state) === 'parentShown';
  }

}

exports.OverlayUIController = OverlayUIController;

},{"../../Form/matching.js":35,"./UIController.js":52}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UIController = void 0;

/**
 * @typedef AttachArgs The argument required to 'attach' a tooltip
 * @property {import("../../Form/Form").Form} form the Form that triggered this 'attach' call
 * @property {HTMLInputElement} input the input field that triggered this 'attach' call
 * @property {() => { x: number; y: number; height: number; width: number; }} getPosition A function that provides positioning information
 * @property {{x: number, y: number}|null} click The click positioning
 * @property {TopContextData} topContextData
 * @property {import("../../DeviceInterface/InterfacePrototype").default} device
 * @property {import('../../deviceApiCalls/__generated__/validators-ts').GetAutofillDataRequest['trigger']} trigger
 * @property {{type: 'explicit-opt-in' | 'implicit-opt-in' | 'transactional'}} triggerMetaData - metadata about the trigger, used to make client-side decisions
 */

/**
 * This is the base interface that `UIControllers` should extend/implement
 */
class UIController {
  /**
   * Implement this method to control what happen when Autofill
   * has enough information to 'attach' a tooltip.
   *
   * @param {AttachArgs} _args
   * @returns {void}
   */
  attach(_args) {
    throw new Error('must implement attach');
  }
  /**
   * Implement this if your tooltip can be created from positioning
   * + topContextData.
   *
   * For example, in an 'overlay' on macOS/Windows this is needed since
   * there's no page information to call 'attach' above.
   *
   * @param {PosFn} _pos
   * @param {TopContextData} _topContextData
   * @returns {any | null}
   */


  createTooltip(_pos, _topContextData) {}
  /**
   * @param {string} _via
   */


  removeTooltip(_via) {}
  /**
   * Set the currently open HTMLTooltip instance
   *
   * @param {import("../HTMLTooltip.js").HTMLTooltip} _tooltip
   */


  setActiveTooltip(_tooltip) {}
  /**
   * Get the currently open HTMLTooltip instance, if one exists
   *
   * @returns {import("../HTMLTooltip.js").HTMLTooltip | null}
   */


  getActiveTooltip() {
    return null;
  }
  /**
   * Indicate whether the controller deems itself 'active'
   *
   * @returns {boolean}
   */


  isActive() {
    return false;
  }
  /**
   * Updates the items in the tooltip based on new data. Currently only supporting credentials.
   * @param {CredentialsObject[]} _data
   */


  updateItems(_data) {}

  destroy() {}

}

exports.UIController = UIController;

},{}],53:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ddgPasswordIconFocused = exports.ddgPasswordIconFilled = exports.ddgPasswordIconBaseWhite = exports.ddgPasswordIconBase = exports.ddgIdentityIconBase = exports.ddgCcIconFilled = exports.ddgCcIconBase = void 0;
const ddgPasswordIconBase = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjRweCIgaGVpZ2h0PSIyNHB4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+ZGRnLXBhc3N3b3JkLWljb24tYmFzZTwvdGl0bGU+CiAgICA8ZyBpZD0iZGRnLXBhc3N3b3JkLWljb24tYmFzZSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgaWQ9IlVuaW9uIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0LjAwMDAwMCwgNC4wMDAwMDApIiBmaWxsPSIjMDAwMDAwIj4KICAgICAgICAgICAgPHBhdGggZD0iTTExLjMzMzMsMi42NjY2NyBDMTAuMjI4OCwyLjY2NjY3IDkuMzMzMzMsMy41NjIxIDkuMzMzMzMsNC42NjY2NyBDOS4zMzMzMyw1Ljc3MTI0IDEwLjIyODgsNi42NjY2NyAxMS4zMzMzLDYuNjY2NjcgQzEyLjQzNzksNi42NjY2NyAxMy4zMzMzLDUuNzcxMjQgMTMuMzMzMyw0LjY2NjY3IEMxMy4zMzMzLDMuNTYyMSAxMi40Mzc5LDIuNjY2NjcgMTEuMzMzMywyLjY2NjY3IFogTTEwLjY2NjcsNC42NjY2NyBDMTAuNjY2Nyw0LjI5ODQ4IDEwLjk2NTEsNCAxMS4zMzMzLDQgQzExLjcwMTUsNCAxMiw0LjI5ODQ4IDEyLDQuNjY2NjcgQzEyLDUuMDM0ODYgMTEuNzAxNSw1LjMzMzMzIDExLjMzMzMsNS4zMzMzMyBDMTAuOTY1MSw1LjMzMzMzIDEwLjY2NjcsNS4wMzQ4NiAxMC42NjY3LDQuNjY2NjcgWiIgaWQ9IlNoYXBlIj48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMC42NjY3LDAgQzcuNzIxMTUsMCA1LjMzMzMzLDIuMzg3ODEgNS4zMzMzMyw1LjMzMzMzIEM1LjMzMzMzLDUuNzYxMTkgNS4zODM4NSw2LjE3Nzk4IDUuNDc5NDUsNi41Nzc3NSBMMC4xOTUyNjIsMTEuODYxOSBDMC4wNzAyMzc5LDExLjk4NyAwLDEyLjE1NjUgMCwxMi4zMzMzIEwwLDE1LjMzMzMgQzAsMTUuNzAxNSAwLjI5ODQ3NywxNiAwLjY2NjY2NywxNiBMMy4zMzMzMywxNiBDNC4wNjk3MSwxNiA0LjY2NjY3LDE1LjQwMyA0LjY2NjY3LDE0LjY2NjcgTDQuNjY2NjcsMTQgTDUuMzMzMzMsMTQgQzYuMDY5NzEsMTQgNi42NjY2NywxMy40MDMgNi42NjY2NywxMi42NjY3IEw2LjY2NjY3LDExLjMzMzMgTDgsMTEuMzMzMyBDOC4xNzY4MSwxMS4zMzMzIDguMzQ2MzgsMTEuMjYzMSA4LjQ3MTQxLDExLjEzODEgTDkuMTU5MDYsMTAuNDUwNCBDOS42Mzc3MiwxMC41OTEyIDEwLjE0MzksMTAuNjY2NyAxMC42NjY3LDEwLjY2NjcgQzEzLjYxMjIsMTAuNjY2NyAxNiw4LjI3ODg1IDE2LDUuMzMzMzMgQzE2LDIuMzg3ODEgMTMuNjEyMiwwIDEwLjY2NjcsMCBaIE02LjY2NjY3LDUuMzMzMzMgQzYuNjY2NjcsMy4xMjQxOSA4LjQ1NzUzLDEuMzMzMzMgMTAuNjY2NywxLjMzMzMzIEMxMi44NzU4LDEuMzMzMzMgMTQuNjY2NywzLjEyNDE5IDE0LjY2NjcsNS4zMzMzMyBDMTQuNjY2Nyw3LjU0MjQ3IDEyLjg3NTgsOS4zMzMzMyAxMC42NjY3LDkuMzMzMzMgQzEwLjE1NTgsOS4zMzMzMyA5LjY2ODg2LDkuMjM3OSA5LjIyMTUyLDkuMDY0NSBDOC45NzUyOCw4Ljk2OTA1IDguNjk1OTEsOS4wMjc5NSA4LjUwOTE2LDkuMjE0NjkgTDcuNzIzODYsMTAgTDYsMTAgQzUuNjMxODEsMTAgNS4zMzMzMywxMC4yOTg1IDUuMzMzMzMsMTAuNjY2NyBMNS4zMzMzMywxMi42NjY3IEw0LDEyLjY2NjcgQzMuNjMxODEsMTIuNjY2NyAzLjMzMzMzLDEyLjk2NTEgMy4zMzMzMywxMy4zMzMzIEwzLjMzMzMzLDE0LjY2NjcgTDEuMzMzMzMsMTQuNjY2NyBMMS4zMzMzMywxMi42MDk1IEw2LjY5Nzg3LDcuMjQ0OTQgQzYuODc1MDIsNy4wNjc3OSA2LjkzNzksNi44MDYyOSA2Ljg2MDY1LDYuNTY3OTggQzYuNzM0ODksNi4xNzk5NyA2LjY2NjY3LDUuNzY1MjcgNi42NjY2Nyw1LjMzMzMzIFoiIGlkPSJTaGFwZSI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+';
exports.ddgPasswordIconBase = ddgPasswordIconBase;
const ddgPasswordIconBaseWhite = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjRweCIgaGVpZ2h0PSIyNHB4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+ZGRnLXBhc3N3b3JkLWljb24tYmFzZS13aGl0ZTwvdGl0bGU+CiAgICA8ZyBpZD0iZGRnLXBhc3N3b3JkLWljb24tYmFzZS13aGl0ZSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgaWQ9IlVuaW9uIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0LjAwMDAwMCwgNC4wMDAwMDApIiBmaWxsPSIjRkZGRkZGIj4KICAgICAgICAgICAgPHBhdGggZD0iTTExLjMzMzMsMi42NjY2NyBDMTAuMjI4OCwyLjY2NjY3IDkuMzMzMzMsMy41NjIxIDkuMzMzMzMsNC42NjY2NyBDOS4zMzMzMyw1Ljc3MTI0IDEwLjIyODgsNi42NjY2NyAxMS4zMzMzLDYuNjY2NjcgQzEyLjQzNzksNi42NjY2NyAxMy4zMzMzLDUuNzcxMjQgMTMuMzMzMyw0LjY2NjY3IEMxMy4zMzMzLDMuNTYyMSAxMi40Mzc5LDIuNjY2NjcgMTEuMzMzMywyLjY2NjY3IFogTTEwLjY2NjcsNC42NjY2NyBDMTAuNjY2Nyw0LjI5ODQ4IDEwLjk2NTEsNCAxMS4zMzMzLDQgQzExLjcwMTUsNCAxMiw0LjI5ODQ4IDEyLDQuNjY2NjcgQzEyLDUuMDM0ODYgMTEuNzAxNSw1LjMzMzMzIDExLjMzMzMsNS4zMzMzMyBDMTAuOTY1MSw1LjMzMzMzIDEwLjY2NjcsNS4wMzQ4NiAxMC42NjY3LDQuNjY2NjcgWiIgaWQ9IlNoYXBlIj48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMC42NjY3LDAgQzcuNzIxMTUsMCA1LjMzMzMzLDIuMzg3ODEgNS4zMzMzMyw1LjMzMzMzIEM1LjMzMzMzLDUuNzYxMTkgNS4zODM4NSw2LjE3Nzk4IDUuNDc5NDUsNi41Nzc3NSBMMC4xOTUyNjIsMTEuODYxOSBDMC4wNzAyMzc5LDExLjk4NyAwLDEyLjE1NjUgMCwxMi4zMzMzIEwwLDE1LjMzMzMgQzAsMTUuNzAxNSAwLjI5ODQ3NywxNiAwLjY2NjY2NywxNiBMMy4zMzMzMywxNiBDNC4wNjk3MSwxNiA0LjY2NjY3LDE1LjQwMyA0LjY2NjY3LDE0LjY2NjcgTDQuNjY2NjcsMTQgTDUuMzMzMzMsMTQgQzYuMDY5NzEsMTQgNi42NjY2NywxMy40MDMgNi42NjY2NywxMi42NjY3IEw2LjY2NjY3LDExLjMzMzMgTDgsMTEuMzMzMyBDOC4xNzY4MSwxMS4zMzMzIDguMzQ2MzgsMTEuMjYzMSA4LjQ3MTQxLDExLjEzODEgTDkuMTU5MDYsMTAuNDUwNCBDOS42Mzc3MiwxMC41OTEyIDEwLjE0MzksMTAuNjY2NyAxMC42NjY3LDEwLjY2NjcgQzEzLjYxMjIsMTAuNjY2NyAxNiw4LjI3ODg1IDE2LDUuMzMzMzMgQzE2LDIuMzg3ODEgMTMuNjEyMiwwIDEwLjY2NjcsMCBaIE02LjY2NjY3LDUuMzMzMzMgQzYuNjY2NjcsMy4xMjQxOSA4LjQ1NzUzLDEuMzMzMzMgMTAuNjY2NywxLjMzMzMzIEMxMi44NzU4LDEuMzMzMzMgMTQuNjY2NywzLjEyNDE5IDE0LjY2NjcsNS4zMzMzMyBDMTQuNjY2Nyw3LjU0MjQ3IDEyLjg3NTgsOS4zMzMzMyAxMC42NjY3LDkuMzMzMzMgQzEwLjE1NTgsOS4zMzMzMyA5LjY2ODg2LDkuMjM3OSA5LjIyMTUyLDkuMDY0NSBDOC45NzUyOCw4Ljk2OTA1IDguNjk1OTEsOS4wMjc5NSA4LjUwOTE2LDkuMjE0NjkgTDcuNzIzODYsMTAgTDYsMTAgQzUuNjMxODEsMTAgNS4zMzMzMywxMC4yOTg1IDUuMzMzMzMsMTAuNjY2NyBMNS4zMzMzMywxMi42NjY3IEw0LDEyLjY2NjcgQzMuNjMxODEsMTIuNjY2NyAzLjMzMzMzLDEyLjk2NTEgMy4zMzMzMywxMy4zMzMzIEwzLjMzMzMzLDE0LjY2NjcgTDEuMzMzMzMsMTQuNjY2NyBMMS4zMzMzMywxMi42MDk1IEw2LjY5Nzg3LDcuMjQ0OTQgQzYuODc1MDIsNy4wNjc3OSA2LjkzNzksNi44MDYyOSA2Ljg2MDY1LDYuNTY3OTggQzYuNzM0ODksNi4xNzk5NyA2LjY2NjY3LDUuNzY1MjcgNi42NjY2Nyw1LjMzMzMzIFoiIGlkPSJTaGFwZSI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+';
exports.ddgPasswordIconBaseWhite = ddgPasswordIconBaseWhite;
const ddgPasswordIconFilled = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjRweCIgaGVpZ2h0PSIyNHB4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+ZGRnLXBhc3N3b3JkLWljb24tZmlsbGVkPC90aXRsZT4KICAgIDxnIGlkPSJkZGctcGFzc3dvcmQtaWNvbi1maWxsZWQiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJTaGFwZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNC4wMDAwMDAsIDQuMDAwMDAwKSIgZmlsbD0iIzc2NDMxMCI+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMS4yNSwyLjc1IEMxMC4xNDU0LDIuNzUgOS4yNSwzLjY0NTQzIDkuMjUsNC43NSBDOS4yNSw1Ljg1NDU3IDEwLjE0NTQsNi43NSAxMS4yNSw2Ljc1IEMxMi4zNTQ2LDYuNzUgMTMuMjUsNS44NTQ1NyAxMy4yNSw0Ljc1IEMxMy4yNSwzLjY0NTQzIDEyLjM1NDYsMi43NSAxMS4yNSwyLjc1IFogTTEwLjc1LDQuNzUgQzEwLjc1LDQuNDczODYgMTAuOTczOSw0LjI1IDExLjI1LDQuMjUgQzExLjUyNjEsNC4yNSAxMS43NSw0LjQ3Mzg2IDExLjc1LDQuNzUgQzExLjc1LDUuMDI2MTQgMTEuNTI2MSw1LjI1IDExLjI1LDUuMjUgQzEwLjk3MzksNS4yNSAxMC43NSw1LjAyNjE0IDEwLjc1LDQuNzUgWiI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTAuNjI1LDAgQzcuNjU2NDcsMCA1LjI1LDIuNDA2NDcgNS4yNSw1LjM3NSBDNS4yNSw1Ljc4MDk4IDUuMjk1MTQsNi4xNzcxNCA1LjM4MDg4LDYuNTU4NDYgTDAuMjE5NjcsMTEuNzE5NyBDMC4wNzkwMTc2LDExLjg2MDMgMCwxMi4wNTExIDAsMTIuMjUgTDAsMTUuMjUgQzAsMTUuNjY0MiAwLjMzNTc4NiwxNiAwLjc1LDE2IEwzLjc0NjYxLDE2IEM0LjMwMDc2LDE2IDQuNzUsMTUuNTUwOCA0Ljc1LDE0Ljk5NjYgTDQuNzUsMTQgTDUuNzQ2NjEsMTQgQzYuMzAwNzYsMTQgNi43NSwxMy41NTA4IDYuNzUsMTIuOTk2NiBMNi43NSwxMS41IEw4LDExLjUgQzguMTk4OTEsMTEuNSA4LjM4OTY4LDExLjQyMSA4LjUzMDMzLDExLjI4MDMgTDkuMjQwNzgsMTAuNTY5OSBDOS42ODMwNCwxMC42ODc1IDEwLjE0NzIsMTAuNzUgMTAuNjI1LDEwLjc1IEMxMy41OTM1LDEwLjc1IDE2LDguMzQzNTMgMTYsNS4zNzUgQzE2LDIuNDA2NDcgMTMuNTkzNSwwIDEwLjYyNSwwIFogTTYuNzUsNS4zNzUgQzYuNzUsMy4yMzQ5IDguNDg0OSwxLjUgMTAuNjI1LDEuNSBDMTIuNzY1MSwxLjUgMTQuNSwzLjIzNDkgMTQuNSw1LjM3NSBDMTQuNSw3LjUxNTEgMTIuNzY1MSw5LjI1IDEwLjYyNSw5LjI1IEMxMC4xNTQ1LDkuMjUgOS43MDUyOCw5LjE2NjUgOS4yOTAxMSw5LjAxNDE2IEM5LjAxNTgxLDguOTEzNSA4LjcwODAzLDguOTgxMzEgOC41MDE0Miw5LjE4NzkyIEw3LjY4OTM0LDEwIEw2LDEwIEM1LjU4NTc5LDEwIDUuMjUsMTAuMzM1OCA1LjI1LDEwLjc1IEw1LjI1LDEyLjUgTDQsMTIuNSBDMy41ODU3OSwxMi41IDMuMjUsMTIuODM1OCAzLjI1LDEzLjI1IEwzLjI1LDE0LjUgTDEuNSwxNC41IEwxLjUsMTIuNTYwNyBMNi43NDgyNiw3LjMxMjQgQzYuOTQ2NjYsNy4xMTQgNy4wMTc3Myw2LjgyMTQ1IDYuOTMyNDUsNi41NTQxMyBDNi44MTQxNSw2LjE4MzI3IDYuNzUsNS43ODczNSA2Ljc1LDUuMzc1IFoiPjwvcGF0aD4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPg==';
exports.ddgPasswordIconFilled = ddgPasswordIconFilled;
const ddgPasswordIconFocused = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjRweCIgaGVpZ2h0PSIyNHB4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+ZGRnLXBhc3N3b3JkLWljb24tZm9jdXNlZDwvdGl0bGU+CiAgICA8ZyBpZD0iZGRnLXBhc3N3b3JkLWljb24tZm9jdXNlZCIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgaWQ9Ikljb24tQ29udGFpbmVyIiBmaWxsPSIjMDAwMDAwIj4KICAgICAgICAgICAgPHJlY3QgaWQ9IlJlY3RhbmdsZSIgZmlsbC1vcGFjaXR5PSIwLjEiIGZpbGwtcnVsZT0ibm9uemVybyIgeD0iMCIgeT0iMCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iMTIiPjwvcmVjdD4KICAgICAgICAgICAgPGcgaWQ9Ikdyb3VwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0LjAwMDAwMCwgNC4wMDAwMDApIiBmaWxsLW9wYWNpdHk9IjAuOSI+CiAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTEuMjUsMi43NSBDMTAuMTQ1NCwyLjc1IDkuMjUsMy42NDU0MyA5LjI1LDQuNzUgQzkuMjUsNS44NTQ1NyAxMC4xNDU0LDYuNzUgMTEuMjUsNi43NSBDMTIuMzU0Niw2Ljc1IDEzLjI1LDUuODU0NTcgMTMuMjUsNC43NSBDMTMuMjUsMy42NDU0MyAxMi4zNTQ2LDIuNzUgMTEuMjUsMi43NSBaIE0xMC43NSw0Ljc1IEMxMC43NSw0LjQ3Mzg2IDEwLjk3MzksNC4yNSAxMS4yNSw0LjI1IEMxMS41MjYxLDQuMjUgMTEuNzUsNC40NzM4NiAxMS43NSw0Ljc1IEMxMS43NSw1LjAyNjE0IDExLjUyNjEsNS4yNSAxMS4yNSw1LjI1IEMxMC45NzM5LDUuMjUgMTAuNzUsNS4wMjYxNCAxMC43NSw0Ljc1IFoiIGlkPSJTaGFwZSI+PC9wYXRoPgogICAgICAgICAgICAgICAgPHBhdGggZD0iTTEwLjYyNSwwIEM3LjY1NjUsMCA1LjI1LDIuNDA2NDcgNS4yNSw1LjM3NSBDNS4yNSw1Ljc4MDk4IDUuMjk1MTQsNi4xNzcxIDUuMzgwODgsNi41NTg1IEwwLjIxOTY3LDExLjcxOTcgQzAuMDc5MDIsMTEuODYwMyAwLDEyLjA1MTEgMCwxMi4yNSBMMCwxNS4yNSBDMCwxNS42NjQyIDAuMzM1NzksMTYgMC43NSwxNiBMMy43NDY2MSwxNiBDNC4zMDA3NiwxNiA0Ljc1LDE1LjU1MDggNC43NSwxNC45OTY2IEw0Ljc1LDE0IEw1Ljc0NjYxLDE0IEM2LjMwMDgsMTQgNi43NSwxMy41NTA4IDYuNzUsMTIuOTk2NiBMNi43NSwxMS41IEw4LDExLjUgQzguMTk4OSwxMS41IDguMzg5NywxMS40MjEgOC41MzAzLDExLjI4MDMgTDkuMjQwOCwxMC41Njk5IEM5LjY4MywxMC42ODc1IDEwLjE0NzIsMTAuNzUgMTAuNjI1LDEwLjc1IEMxMy41OTM1LDEwLjc1IDE2LDguMzQzNSAxNiw1LjM3NSBDMTYsMi40MDY0NyAxMy41OTM1LDAgMTAuNjI1LDAgWiBNNi43NSw1LjM3NSBDNi43NSwzLjIzNDkgOC40ODQ5LDEuNSAxMC42MjUsMS41IEMxMi43NjUxLDEuNSAxNC41LDMuMjM0OSAxNC41LDUuMzc1IEMxNC41LDcuNTE1MSAxMi43NjUxLDkuMjUgMTAuNjI1LDkuMjUgQzEwLjE1NDUsOS4yNSA5LjcwNTMsOS4xNjY1IDkuMjkwMSw5LjAxNDIgQzkuMDE1OCw4LjkxMzUgOC43MDgsOC45ODEzIDguNTAxNCw5LjE4NzkgTDcuNjg5MywxMCBMNiwxMCBDNS41ODU3OSwxMCA1LjI1LDEwLjMzNTggNS4yNSwxMC43NSBMNS4yNSwxMi41IEw0LDEyLjUgQzMuNTg1NzksMTIuNSAzLjI1LDEyLjgzNTggMy4yNSwxMy4yNSBMMy4yNSwxNC41IEwxLjUsMTQuNSBMMS41LDEyLjU2MDcgTDYuNzQ4Myw3LjMxMjQgQzYuOTQ2Nyw3LjExNCA3LjAxNzcsNi44MjE0IDYuOTMyNSw2LjU1NDEgQzYuODE0MSw2LjE4MzMgNi43NSw1Ljc4NzM1IDYuNzUsNS4zNzUgWiIgaWQ9IlNoYXBlIj48L3BhdGg+CiAgICAgICAgICAgIDwvZz4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPg==';
exports.ddgPasswordIconFocused = ddgPasswordIconFocused;
const ddgCcIconBase = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSI+CiAgICA8cGF0aCBkPSJNNSA5Yy0uNTUyIDAtMSAuNDQ4LTEgMXYyYzAgLjU1Mi40NDggMSAxIDFoM2MuNTUyIDAgMS0uNDQ4IDEtMXYtMmMwLS41NTItLjQ0OC0xLTEtMUg1eiIgZmlsbD0iIzAwMCIvPgogICAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xIDZjMC0yLjIxIDEuNzktNCA0LTRoMTRjMi4yMSAwIDQgMS43OSA0IDR2MTJjMCAyLjIxLTEuNzkgNC00IDRINWMtMi4yMSAwLTQtMS43OS00LTRWNnptNC0yYy0xLjEwNSAwLTIgLjg5NS0yIDJ2OWgxOFY2YzAtMS4xMDUtLjg5NS0yLTItMkg1em0wIDE2Yy0xLjEwNSAwLTItLjg5NS0yLTJoMThjMCAxLjEwNS0uODk1IDItMiAySDV6IiBmaWxsPSIjMDAwIi8+Cjwvc3ZnPgo=';
exports.ddgCcIconBase = ddgCcIconBase;
const ddgCcIconFilled = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSI+CiAgICA8cGF0aCBkPSJNNSA5Yy0uNTUyIDAtMSAuNDQ4LTEgMXYyYzAgLjU1Mi40NDggMSAxIDFoM2MuNTUyIDAgMS0uNDQ4IDEtMXYtMmMwLS41NTItLjQ0OC0xLTEtMUg1eiIgZmlsbD0iIzc2NDMxMCIvPgogICAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xIDZjMC0yLjIxIDEuNzktNCA0LTRoMTRjMi4yMSAwIDQgMS43OSA0IDR2MTJjMCAyLjIxLTEuNzkgNC00IDRINWMtMi4yMSAwLTQtMS43OS00LTRWNnptNC0yYy0xLjEwNSAwLTIgLjg5NS0yIDJ2OWgxOFY2YzAtMS4xMDUtLjg5NS0yLTItMkg1em0wIDE2Yy0xLjEwNSAwLTItLjg5NS0yLTJoMThjMCAxLjEwNS0uODk1IDItMiAySDV6IiBmaWxsPSIjNzY0MzEwIi8+Cjwvc3ZnPgo=';
exports.ddgCcIconFilled = ddgCcIconFilled;
const ddgIdentityIconBase = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSI+CiAgICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTEyIDIxYzIuMTQzIDAgNC4xMTEtLjc1IDUuNjU3LTItLjYyNi0uNTA2LTEuMzE4LS45MjctMi4wNi0xLjI1LTEuMS0uNDgtMi4yODUtLjczNS0zLjQ4Ni0uNzUtMS4yLS4wMTQtMi4zOTIuMjExLTMuNTA0LjY2NC0uODE3LjMzMy0xLjU4Ljc4My0yLjI2NCAxLjMzNiAxLjU0NiAxLjI1IDMuNTE0IDIgNS42NTcgMnptNC4zOTctNS4wODNjLjk2Ny40MjIgMS44NjYuOTggMi42NzIgMS42NTVDMjAuMjc5IDE2LjAzOSAyMSAxNC4xMDQgMjEgMTJjMC00Ljk3LTQuMDMtOS05LTlzLTkgNC4wMy05IDljMCAyLjEwNC43MjIgNC4wNCAxLjkzMiA1LjU3Mi44NzQtLjczNCAxLjg2LTEuMzI4IDIuOTIxLTEuNzYgMS4zNi0uNTU0IDIuODE2LS44MyA0LjI4My0uODExIDEuNDY3LjAxOCAyLjkxNi4zMyA0LjI2LjkxNnpNMTIgMjNjNi4wNzUgMCAxMS00LjkyNSAxMS0xMVMxOC4wNzUgMSAxMiAxIDEgNS45MjUgMSAxMnM0LjkyNSAxMSAxMSAxMXptMy0xM2MwIDEuNjU3LTEuMzQzIDMtMyAzcy0zLTEuMzQzLTMtMyAxLjM0My0zIDMtMyAzIDEuMzQzIDMgM3ptMiAwYzAgMi43NjEtMi4yMzkgNS01IDVzLTUtMi4yMzktNS01IDIuMjM5LTUgNS01IDUgMi4yMzkgNSA1eiIgZmlsbD0iIzAwMCIvPgo8L3N2Zz4KPHBhdGggeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTEyIDIxYzIuMTQzIDAgNC4xMTEtLjc1IDUuNjU3LTItLjYyNi0uNTA2LTEuMzE4LS45MjctMi4wNi0xLjI1LTEuMS0uNDgtMi4yODUtLjczNS0zLjQ4Ni0uNzUtMS4yLS4wMTQtMi4zOTIuMjExLTMuNTA0LjY2NC0uODE3LjMzMy0xLjU4Ljc4My0yLjI2NCAxLjMzNiAxLjU0NiAxLjI1IDMuNTE0IDIgNS42NTcgMnptNC4zOTctNS4wODNjLjk2Ny40MjIgMS44NjYuOTggMi42NzIgMS42NTVDMjAuMjc5IDE2LjAzOSAyMSAxNC4xMDQgMjEgMTJjMC00Ljk3LTQuMDMtOS05LTlzLTkgNC4wMy05IDljMCAyLjEwNC43MjIgNC4wNCAxLjkzMiA1LjU3Mi44NzQtLjczNCAxLjg2LTEuMzI4IDIuOTIxLTEuNzYgMS4zNi0uNTU0IDIuODE2LS44MyA0LjI4My0uODExIDEuNDY3LjAxOCAyLjkxNi4zMyA0LjI2LjkxNnpNMTIgMjNjNi4wNzUgMCAxMS00LjkyNSAxMS0xMVMxOC4wNzUgMSAxMiAxIDEgNS45MjUgMSAxMnM0LjkyNSAxMSAxMSAxMXptMy0xM2MwIDEuNjU3LTEuMzQzIDMtMyAzcy0zLTEuMzQzLTMtMyAxLjM0My0zIDMtMyAzIDEuMzQzIDMgM3ptMiAwYzAgMi43NjEtMi4yMzkgNS01IDVzLTUtMi4yMzktNS01IDIuMjM5LTUgNS01IDUgMi4yMzkgNSA1eiIgZmlsbD0iIzAwMCIvPgo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSJub25lIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAyMWMyLjE0MyAwIDQuMTExLS43NSA1LjY1Ny0yLS42MjYtLjUwNi0xLjMxOC0uOTI3LTIuMDYtMS4yNS0xLjEtLjQ4LTIuMjg1LS43MzUtMy40ODYtLjc1LTEuMi0uMDE0LTIuMzkyLjIxMS0zLjUwNC42NjQtLjgxNy4zMzMtMS41OC43ODMtMi4yNjQgMS4zMzYgMS41NDYgMS4yNSAzLjUxNCAyIDUuNjU3IDJ6bTQuMzk3LTUuMDgzYy45NjcuNDIyIDEuODY2Ljk4IDIuNjcyIDEuNjU1QzIwLjI3OSAxNi4wMzkgMjEgMTQuMTA0IDIxIDEyYzAtNC45Ny00LjAzLTktOS05cy05IDQuMDMtOSA5YzAgMi4xMDQuNzIyIDQuMDQgMS45MzIgNS41NzIuODc0LS43MzQgMS44Ni0xLjMyOCAyLjkyMS0xLjc2IDEuMzYtLjU1NCAyLjgxNi0uODMgNC4yODMtLjgxMSAxLjQ2Ny4wMTggMi45MTYuMzMgNC4yNi45MTZ6TTEyIDIzYzYuMDc1IDAgMTEtNC45MjUgMTEtMTFTMTguMDc1IDEgMTIgMSAxIDUuOTI1IDEgMTJzNC45MjUgMTEgMTEgMTF6bTMtMTNjMCAxLjY1Ny0xLjM0MyAzLTMgM3MtMy0xLjM0My0zLTMgMS4zNDMtMyAzLTMgMyAxLjM0MyAzIDN6bTIgMGMwIDIuNzYxLTIuMjM5IDUtNSA1cy01LTIuMjM5LTUtNSAyLjIzOS01IDUtNSA1IDIuMjM5IDUgNXoiIGZpbGw9IiMwMDAiLz4KPC9zdmc+Cg==";
exports.ddgIdentityIconBase = ddgIdentityIconBase;

},{}],54:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CSS_STYLES = void 0;
const CSS_STYLES = ":root {\n    color-scheme: light dark;\n}\n\n.wrapper *, .wrapper *::before, .wrapper *::after {\n    box-sizing: border-box;\n}\n.wrapper {\n    position: fixed;\n    top: 0;\n    left: 0;\n    padding: 0;\n    font-family: 'DDG_ProximaNova', 'Proxima Nova', system-ui, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',\n    'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;\n    -webkit-font-smoothing: antialiased;\n    z-index: 2147483647;\n}\n.wrapper--data {\n    font-family: 'SF Pro Text', system-ui, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',\n    'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;\n}\n:not(.top-autofill) .tooltip {\n    position: absolute;\n    width: 300px;\n    max-width: calc(100vw - 25px);\n    transform: translate(-1000px, -1000px);\n    z-index: 2147483647;\n}\n.tooltip--data, #topAutofill {\n    background-color: rgba(242, 240, 240, 1);\n    -webkit-backdrop-filter: blur(40px);\n    backdrop-filter: blur(40px);\n}\n@media (prefers-color-scheme: dark) {\n    .tooltip--data, #topAutofill {\n        background: rgb(100, 98, 102, .9);\n    }\n}\n.tooltip--data {\n    padding: 6px;\n    font-size: 13px;\n    line-height: 14px;\n    width: 315px;\n    max-height: 290px;\n    overflow-y: auto;\n}\n.top-autofill .tooltip--data {\n    min-height: 100vh;\n}\n.tooltip--data.tooltip--incontext-signup {\n    width: 360px;\n}\n:not(.top-autofill) .tooltip--data {\n    top: 100%;\n    left: 100%;\n    border: 0.5px solid rgba(255, 255, 255, 0.2);\n    border-radius: 6px;\n    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.32);\n}\n@media (prefers-color-scheme: dark) {\n    :not(.top-autofill) .tooltip--data {\n        border: 1px solid rgba(255, 255, 255, 0.2);\n    }\n}\n:not(.top-autofill) .tooltip--email {\n    top: calc(100% + 6px);\n    right: calc(100% - 48px);\n    padding: 8px;\n    border: 1px solid #D0D0D0;\n    border-radius: 10px;\n    background-color: #FFFFFF;\n    font-size: 14px;\n    line-height: 1.3;\n    color: #333333;\n    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);\n}\n.tooltip--email__caret {\n    position: absolute;\n    transform: translate(-1000px, -1000px);\n    z-index: 2147483647;\n}\n.tooltip--email__caret::before,\n.tooltip--email__caret::after {\n    content: \"\";\n    width: 0;\n    height: 0;\n    border-left: 10px solid transparent;\n    border-right: 10px solid transparent;\n    display: block;\n    border-bottom: 8px solid #D0D0D0;\n    position: absolute;\n    right: -28px;\n}\n.tooltip--email__caret::before {\n    border-bottom-color: #D0D0D0;\n    top: -1px;\n}\n.tooltip--email__caret::after {\n    border-bottom-color: #FFFFFF;\n    top: 0px;\n}\n\n/* Buttons */\n.tooltip__button {\n    display: flex;\n    width: 100%;\n    padding: 8px 8px 8px 0px;\n    font-family: inherit;\n    color: inherit;\n    background: transparent;\n    border: none;\n    border-radius: 6px;\n}\n.tooltip__button.currentFocus,\n.wrapper:not(.top-autofill) .tooltip__button:hover {\n    background-color: #3969EF;\n    color: #FFFFFF;\n}\n\n/* Data autofill tooltip specific */\n.tooltip__button--data {\n    position: relative;\n    min-height: 48px;\n    flex-direction: row;\n    justify-content: flex-start;\n    font-size: inherit;\n    font-weight: 500;\n    line-height: 16px;\n    text-align: left;\n    border-radius: 3px;\n}\n.tooltip--data__item-container {\n    max-height: 220px;\n    overflow: auto;\n}\n.tooltip__button--data:first-child {\n    margin-top: 0;\n}\n.tooltip__button--data:last-child {\n    margin-bottom: 0;\n}\n.tooltip__button--data::before {\n    content: '';\n    flex-shrink: 0;\n    display: block;\n    width: 32px;\n    height: 32px;\n    margin: 0 8px;\n    background-size: 20px 20px;\n    background-repeat: no-repeat;\n    background-position: center 6px;\n}\n#provider_locked::after {\n    position: absolute;\n    content: '';\n    flex-shrink: 0;\n    display: block;\n    width: 32px;\n    height: 32px;\n    margin: 0 8px;\n    background-size: 11px 13px;\n    background-repeat: no-repeat;\n    background-position: right bottom;\n}\n.tooltip__button--data.currentFocus:not(.tooltip__button--data--bitwarden)::before,\n.wrapper:not(.top-autofill) .tooltip__button--data:not(.tooltip__button--data--bitwarden):hover::before {\n    filter: invert(100%);\n}\n@media (prefers-color-scheme: dark) {\n    .tooltip__button--data:not(.tooltip__button--data--bitwarden)::before,\n    .tooltip__button--data:not(.tooltip__button--data--bitwarden)::before {\n        filter: invert(100%);\n        opacity: .9;\n    }\n}\n.tooltip__button__text-container {\n    margin: auto 0;\n}\n.label {\n    display: block;\n    font-weight: 400;\n    letter-spacing: -0.25px;\n    color: rgba(0,0,0,.8);\n    font-size: 13px;\n    line-height: 1;\n}\n.label + .label {\n    margin-top: 2px;\n}\n.label.label--medium {\n    font-weight: 500;\n    letter-spacing: -0.25px;\n    color: rgba(0,0,0,.9);\n}\n.label.label--small {\n    font-size: 11px;\n    font-weight: 400;\n    letter-spacing: 0.06px;\n    color: rgba(0,0,0,0.6);\n}\n@media (prefers-color-scheme: dark) {\n    .tooltip--data .label {\n        color: #ffffff;\n    }\n    .tooltip--data .label--medium {\n        color: #ffffff;\n    }\n    .tooltip--data .label--small {\n        color: #cdcdcd;\n    }\n}\n.tooltip__button.currentFocus .label,\n.wrapper:not(.top-autofill) .tooltip__button:hover .label {\n    color: #FFFFFF;\n}\n\n.tooltip__button--manage {\n    font-size: 13px;\n    padding: 5px 9px;\n    border-radius: 3px;\n    margin: 0;\n}\n\n/* Icons */\n.tooltip__button--data--credentials::before {\n    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik05LjYzNiA4LjY4MkM5LjYzNiA1LjU0NCAxMi4xOCAzIDE1LjMxOCAzIDE4LjQ1NiAzIDIxIDUuNTQ0IDIxIDguNjgyYzAgMy4xMzgtMi41NDQgNS42ODItNS42ODIgNS42ODItLjY5MiAwLTEuMzUzLS4xMjQtMS45NjQtLjM0OS0uMzcyLS4xMzctLjc5LS4wNDEtMS4wNjYuMjQ1bC0uNzEzLjc0SDEwYy0uNTUyIDAtMSAuNDQ4LTEgMXYySDdjLS41NTIgMC0xIC40NDgtMSAxdjJIM3YtMi44ODFsNi42NjgtNi42NjhjLjI2NS0uMjY2LjM2LS42NTguMjQ0LTEuMDE1LS4xNzktLjU1MS0uMjc2LTEuMTQtLjI3Ni0xLjc1NHpNMTUuMzE4IDFjLTQuMjQyIDAtNy42ODIgMy40NC03LjY4MiA3LjY4MiAwIC42MDcuMDcxIDEuMi4yMDUgMS43NjdsLTYuNTQ4IDYuNTQ4Yy0uMTg4LjE4OC0uMjkzLjQ0Mi0uMjkzLjcwOFYyMmMwIC4yNjUuMTA1LjUyLjI5My43MDcuMTg3LjE4OC40NDIuMjkzLjcwNy4yOTNoNGMxLjEwNSAwIDItLjg5NSAyLTJ2LTFoMWMxLjEwNSAwIDItLjg5NSAyLTJ2LTFoMWMuMjcyIDAgLjUzMi0uMTEuNzItLjMwNmwuNTc3LS42Yy42NDUuMTc2IDEuMzIzLjI3IDIuMDIxLjI3IDQuMjQzIDAgNy42ODItMy40NCA3LjY4Mi03LjY4MkMyMyA0LjQzOSAxOS41NiAxIDE1LjMxOCAxek0xNSA4YzAtLjU1Mi40NDgtMSAxLTFzMSAuNDQ4IDEgMS0uNDQ4IDEtMSAxLTEtLjQ0OC0xLTF6bTEtM2MtMS42NTcgMC0zIDEuMzQzLTMgM3MxLjM0MyAzIDMgMyAzLTEuMzQzIDMtMy0xLjM0My0zLTMtM3oiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iLjkiLz4KPC9zdmc+');\n}\n.tooltip__button--data--creditCards::before {\n    background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSI+CiAgICA8cGF0aCBkPSJNNSA5Yy0uNTUyIDAtMSAuNDQ4LTEgMXYyYzAgLjU1Mi40NDggMSAxIDFoM2MuNTUyIDAgMS0uNDQ4IDEtMXYtMmMwLS41NTItLjQ0OC0xLTEtMUg1eiIgZmlsbD0iIzAwMCIvPgogICAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xIDZjMC0yLjIxIDEuNzktNCA0LTRoMTRjMi4yMSAwIDQgMS43OSA0IDR2MTJjMCAyLjIxLTEuNzkgNC00IDRINWMtMi4yMSAwLTQtMS43OS00LTRWNnptNC0yYy0xLjEwNSAwLTIgLjg5NS0yIDJ2OWgxOFY2YzAtMS4xMDUtLjg5NS0yLTItMkg1em0wIDE2Yy0xLjEwNSAwLTItLjg5NS0yLTJoMThjMCAxLjEwNS0uODk1IDItMiAySDV6IiBmaWxsPSIjMDAwIi8+Cjwvc3ZnPgo=');\n}\n.tooltip__button--data--identities::before {\n    background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSI+CiAgICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTEyIDIxYzIuMTQzIDAgNC4xMTEtLjc1IDUuNjU3LTItLjYyNi0uNTA2LTEuMzE4LS45MjctMi4wNi0xLjI1LTEuMS0uNDgtMi4yODUtLjczNS0zLjQ4Ni0uNzUtMS4yLS4wMTQtMi4zOTIuMjExLTMuNTA0LjY2NC0uODE3LjMzMy0xLjU4Ljc4My0yLjI2NCAxLjMzNiAxLjU0NiAxLjI1IDMuNTE0IDIgNS42NTcgMnptNC4zOTctNS4wODNjLjk2Ny40MjIgMS44NjYuOTggMi42NzIgMS42NTVDMjAuMjc5IDE2LjAzOSAyMSAxNC4xMDQgMjEgMTJjMC00Ljk3LTQuMDMtOS05LTlzLTkgNC4wMy05IDljMCAyLjEwNC43MjIgNC4wNCAxLjkzMiA1LjU3Mi44NzQtLjczNCAxLjg2LTEuMzI4IDIuOTIxLTEuNzYgMS4zNi0uNTU0IDIuODE2LS44MyA0LjI4My0uODExIDEuNDY3LjAxOCAyLjkxNi4zMyA0LjI2LjkxNnpNMTIgMjNjNi4wNzUgMCAxMS00LjkyNSAxMS0xMVMxOC4wNzUgMSAxMiAxIDEgNS45MjUgMSAxMnM0LjkyNSAxMSAxMSAxMXptMy0xM2MwIDEuNjU3LTEuMzQzIDMtMyAzcy0zLTEuMzQzLTMtMyAxLjM0My0zIDMtMyAzIDEuMzQzIDMgM3ptMiAwYzAgMi43NjEtMi4yMzkgNS01IDVzLTUtMi4yMzktNS01IDIuMjM5LTUgNS01IDUgMi4yMzkgNSA1eiIgZmlsbD0iIzAwMCIvPgo8L3N2Zz4=');\n}\n.tooltip__button--data--credentials.tooltip__button--data--bitwarden::before {\n    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iOCIgZmlsbD0iIzE3NUREQyIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTE4LjU2OTYgNS40MzM1NUMxOC41MDg0IDUuMzc0NDIgMTguNDM0NyA1LjMyNzYzIDE4LjM1MzEgNS4yOTYxMUMxOC4yNzE1IDUuMjY0NiAxOC4xODM3IDUuMjQ5MDQgMTguMDk1MyA1LjI1MDQxSDUuOTIxOTFDNS44MzMyNiA1LjI0NzI5IDUuNzQ0OTMgNS4yNjIwNSA1LjY2MzA0IDUuMjkzNjdDNS41ODExNSA1LjMyNTI5IDUuNTA3NjUgNS4zNzMwMiA1LjQ0NzYyIDUuNDMzNTVDNS4zMjE3IDUuNTUwMTMgNS4yNTA2NSA1LjcwODE1IDUuMjUgNS44NzMxVjEzLjM4MjFDNS4yNTMzNiAxMy45NTM1IDUuMzc0MDggMTQuNTE5MSA1LjYwNTcyIDE1LjA0ODdDNS44MTkzMSAxNS41NzI4IDYuMTEyMDcgMTYuMDY2MSA2LjQ3NTI0IDE2LjUxMzlDNi44NDIgMTYuOTY4MyA3LjI1OTI5IDE3LjM4NTcgNy43MjAyNSAxNy43NTkzQzguMTQwNTMgMTguMTI1NiA4LjU4OTcxIDE4LjQ2MjMgOS4wNjQwNyAxOC43NjY2QzkuNDU5MzEgMTkuMDIzIDkuOTEzODMgMTkuMjc5NCAxMC4zNDg2IDE5LjUxNzVDMTAuNzgzNCAxOS43NTU2IDExLjA5OTYgMTkuOTIwNCAxMS4yNzc0IDE5Ljk5MzdDMTEuNDU1MyAyMC4wNjY5IDExLjYxMzQgMjAuMTQwMiAxMS43MTIyIDIwLjE5NTFDMTEuNzk5MiAyMC4yMzEzIDExLjg5MzUgMjAuMjUgMTEuOTg4OCAyMC4yNUMxMi4wODQyIDIwLjI1IDEyLjE3ODUgMjAuMjMxMyAxMi4yNjU1IDIwLjE5NTFDMTIuNDIxMiAyMC4xMzYzIDEyLjU3MjkgMjAuMDY5IDEyLjcyIDE5Ljk5MzdDMTIuNzcxMSAxOS45Njc0IDEyLjgzMzUgMTkuOTM2NiAxMi45MDY5IDE5LjkwMDRDMTMuMDg5MSAxOS44MTA1IDEzLjMzODggMTkuNjg3MiAxMy42NDg5IDE5LjUxNzVDMTQuMDgzNiAxOS4yNzk0IDE0LjUxODQgMTkuMDIzIDE0LjkzMzQgMTguNzY2NkMxNS40MDQgMTguNDU3NyAxNS44NTI4IDE4LjEyMTIgMTYuMjc3MiAxNy43NTkzQzE2LjczMzEgMTcuMzgwOSAxNy4xNDk5IDE2Ljk2NCAxNy41MjIyIDE2LjUxMzlDMTcuODc4IDE2LjA2MTcgMTguMTcwMiAxNS41NjkzIDE4LjM5MTcgMTUuMDQ4N0MxOC42MjM0IDE0LjUxOTEgMTguNzQ0MSAxMy45NTM1IDE4Ljc0NzQgMTMuMzgyMVY1Ljg3MzFDMTguNzU1NyA1Ljc5MjE0IDE4Ljc0MzkgNS43MTA1IDE4LjcxMzEgNS42MzQzNUMxOC42ODIzIDUuNTU4MiAxOC42MzMyIDUuNDg5NTQgMTguNTY5NiA1LjQzMzU1Wk0xNy4wMDg0IDEzLjQ1NTNDMTcuMDA4NCAxNi4xODQyIDEyLjAwODYgMTguNTI4NSAxMi4wMDg2IDE4LjUyODVWNi44NjIwOUgxNy4wMDg0VjEzLjQ1NTNaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K');\n}\n#provider_locked:after {\n    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTEiIGhlaWdodD0iMTMiIHZpZXdCb3g9IjAgMCAxMSAxMyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEgNy42MDA1N1Y3LjYwMjVWOS41MjI1QzEgMTAuMDgwMSAxLjIyMTUxIDEwLjYxNDkgMS42MTU4MSAxMS4wMDkyQzIuMDEwMSAxMS40MDM1IDIuNTQ0ODggMTEuNjI1IDMuMTAyNSAxMS42MjVINy4yNzI1QzcuNTQ4NjEgMTEuNjI1IDcuODIyMDEgMTEuNTcwNiA4LjA3NzA5IDExLjQ2NUM4LjMzMjE4IDExLjM1OTMgOC41NjM5NiAxMS4yMDQ0IDguNzU5MTkgMTEuMDA5MkM4Ljk1NDQzIDEwLjgxNCA5LjEwOTMgMTAuNTgyMiA5LjIxNDk2IDEwLjMyNzFDOS4zMjA2MiAxMC4wNzIgOS4zNzUgOS43OTg2MSA5LjM3NSA5LjUyMjVMOS4zNzUgNy42MDI1TDkuMzc1IDcuNjAwNTdDOS4zNzQxNSA3LjE2MTMxIDkuMjM1NzQgNi43MzMzNSA4Ljk3OTIyIDYuMzc2NzhDOC44NzY4MyA2LjIzNDQ2IDguNzU3NjggNi4xMDYzNyA4LjYyNSA1Ljk5NDg5VjUuMTg3NUM4LjYyNSA0LjI3NTgyIDguMjYyODQgMy40MDE0OCA3LjYxODE4IDIuNzU2ODJDNi45NzM1MiAyLjExMjE2IDYuMDk5MTggMS43NSA1LjE4NzUgMS43NUM0LjI3NTgyIDEuNzUgMy40MDE0OCAyLjExMjE2IDIuNzU2ODIgMi43NTY4MkMyLjExMjE2IDMuNDAxNDggMS43NSA0LjI3NTgyIDEuNzUgNS4xODc1VjUuOTk0ODlDMS42MTczMiA2LjEwNjM3IDEuNDk4MTcgNi4yMzQ0NiAxLjM5NTc4IDYuMzc2NzhDMS4xMzkyNiA2LjczMzM1IDEuMDAwODUgNy4xNjEzMSAxIDcuNjAwNTdaTTQuOTY4NyA0Ljk2ODdDNS4wMjY5NCA0LjkxMDQ3IDUuMTA1MzIgNC44NzY5OSA1LjE4NzUgNC44NzUwN0M1LjI2OTY4IDQuODc2OTkgNS4zNDgwNiA0LjkxMDQ3IDUuNDA2MyA0Ljk2ODdDNS40NjU0MiA1LjAyNzgzIDUuNDk5MDQgNS4xMDc3NCA1LjUgNS4xOTEzVjUuNUg0Ljg3NVY1LjE5MTNDNC44NzU5NiA1LjEwNzc0IDQuOTA5NTggNS4wMjc4MyA0Ljk2ODcgNC45Njg3WiIgZmlsbD0iIzIyMjIyMiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=');\n}\n\nhr {\n    display: block;\n    margin: 5px 9px;\n    border: none; /* reset the border */\n    border-top: 1px solid rgba(0,0,0,.1);\n}\n\nhr:first-child {\n    display: none;\n}\n\n@media (prefers-color-scheme: dark) {\n    hr {\n        border-top: 1px solid rgba(255,255,255,.2);\n    }\n}\n\n#privateAddress {\n    align-items: flex-start;\n}\n#personalAddress::before,\n#privateAddress::before,\n#incontextSignup::before,\n#personalAddress.currentFocus::before,\n#personalAddress:hover::before,\n#privateAddress.currentFocus::before,\n#privateAddress:hover::before {\n    filter: none;\n    /* This is the same icon as `daxBase64` in `src/Form/logo-svg.js` */\n    background-image: url('data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMTI4IDEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxwYXRoIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0ibTY0IDEyOGMzNS4zNDYgMCA2NC0yOC42NTQgNjQtNjRzLTI4LjY1NC02NC02NC02NC02NCAyOC42NTQtNjQgNjQgMjguNjU0IDY0IDY0IDY0eiIgZmlsbD0iI2RlNTgzMyIgZmlsbC1ydWxlPSJldmVub2RkIi8+CiAgICA8cGF0aCBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Im03MyAxMTEuNzVjMC0uNS4xMjMtLjYxNC0xLjQ2Ni0zLjc4Mi00LjIyNC04LjQ1OS04LjQ3LTIwLjM4NC02LjU0LTI4LjA3NS4zNTMtMS4zOTctMy45NzgtNTEuNzQ0LTcuMDQtNTMuMzY1LTMuNDAyLTEuODEzLTcuNTg4LTQuNjktMTEuNDE4LTUuMzMtMS45NDMtLjMxLTQuNDktLjE2NC02LjQ4Mi4xMDUtLjM1My4wNDctLjM2OC42ODMtLjAzLjc5OCAxLjMwOC40NDMgMi44OTUgMS4yMTIgMy44MyAyLjM3NS4xNzguMjItLjA2LjU2Ni0uMzQyLjU3Ny0uODgyLjAzMi0yLjQ4Mi40MDItNC41OTMgMi4xOTUtLjI0NC4yMDctLjA0MS41OTIuMjczLjUzIDQuNTM2LS44OTcgOS4xNy0uNDU1IDExLjkgMi4wMjcuMTc3LjE2LjA4NC40NS0uMTQ3LjUxMi0yMy42OTQgNi40NC0xOS4wMDMgMjcuMDUtMTIuNjk2IDUyLjM0NCA1LjYxOSAyMi41MyA3LjczMyAyOS43OTIgOC40IDMyLjAwNGEuNzE4LjcxOCAwIDAgMCAuNDIzLjQ2N2M4LjE1NiAzLjI0OCAyNS45MjggMy4zOTIgMjUuOTI4LTIuMTMyeiIgZmlsbD0iI2RkZCIgZmlsbC1ydWxlPSJldmVub2RkIi8+CiAgICA8cGF0aCBkPSJtNzYuMjUgMTE2LjVjLTIuODc1IDEuMTI1LTguNSAxLjYyNS0xMS43NSAxLjYyNS00Ljc2NCAwLTExLjYyNS0uNzUtMTQuMTI1LTEuODc1LTEuNTQ0LTQuNzUxLTYuMTY0LTE5LjQ4LTEwLjcyNy0zOC4xODVsLS40NDctMS44MjctLjAwNC0uMDE1Yy01LjQyNC0yMi4xNTctOS44NTUtNDAuMjUzIDE0LjQyNy00NS45MzguMjIyLS4wNTIuMzMtLjMxNy4xODQtLjQ5Mi0yLjc4Ni0zLjMwNS04LjAwNS00LjM4OC0xNC42MDUtMi4xMTEtLjI3LjA5My0uNTA2LS4xOC0uMzM3LS40MTIgMS4yOTQtMS43ODMgMy44MjMtMy4xNTUgNS4wNzEtMy43NTYuMjU4LS4xMjQuMjQyLS41MDItLjAzLS41ODhhMjcuODc3IDI3Ljg3NyAwIDAgMCAtMy43NzItLjljLS4zNy0uMDU5LS40MDMtLjY5My0uMDMyLS43NDMgOS4zNTYtMS4yNTkgMTkuMTI1IDEuNTUgMjQuMDI4IDcuNzI2YS4zMjYuMzI2IDAgMCAwIC4xODYuMTE0YzE3Ljk1MiAzLjg1NiAxOS4yMzggMzIuMjM1IDE3LjE3IDMzLjUyOC0uNDA4LjI1NS0xLjcxNS4xMDgtMy40MzgtLjA4NS02Ljk4Ni0uNzgxLTIwLjgxOC0yLjMyOS05LjQwMiAxOC45NDguMTEzLjIxLS4wMzYuNDg4LS4yNzIuNTI1LTYuNDM4IDEgMS44MTIgMjEuMTczIDcuODc1IDM0LjQ2MXoiIGZpbGw9IiNmZmYiLz4KICAgIDxwYXRoIGQ9Im04NC4yOCA5MC42OThjLTEuMzY3LS42MzMtNi42MjEgMy4xMzUtMTAuMTEgNi4wMjgtLjcyOC0xLjAzMS0yLjEwMy0xLjc4LTUuMjAzLTEuMjQyLTIuNzEzLjQ3Mi00LjIxMSAxLjEyNi00Ljg4IDIuMjU0LTQuMjgzLTEuNjIzLTExLjQ4OC00LjEzLTEzLjIyOS0xLjcxLTEuOTAyIDIuNjQ2LjQ3NiAxNS4xNjEgMy4wMDMgMTYuNzg2IDEuMzIuODQ5IDcuNjMtMy4yMDggMTAuOTI2LTYuMDA1LjUzMi43NDkgMS4zODggMS4xNzggMy4xNDggMS4xMzcgMi42NjItLjA2MiA2Ljk3OS0uNjgxIDcuNjQ5LTEuOTIxLjA0LS4wNzUuMDc1LS4xNjQuMTA1LS4yNjYgMy4zODggMS4yNjYgOS4zNSAyLjYwNiAxMC42ODIgMi40MDYgMy40Ny0uNTIxLS40ODQtMTYuNzIzLTIuMDktMTcuNDY3eiIgZmlsbD0iIzNjYTgyYiIvPgogICAgPHBhdGggZD0ibTc0LjQ5IDk3LjA5N2MuMTQ0LjI1Ni4yNi41MjYuMzU4LjguNDgzIDEuMzUyIDEuMjcgNS42NDguNjc0IDYuNzA5LS41OTUgMS4wNjItNC40NTkgMS41NzQtNi44NDMgMS42MTVzLTIuOTItLjgzMS0zLjQwMy0yLjE4MWMtLjM4Ny0xLjA4MS0uNTc3LTMuNjIxLS41NzItNS4wNzUtLjA5OC0yLjE1OC42OS0yLjkxNiA0LjMzNC0zLjUwNiAyLjY5Ni0uNDM2IDQuMTIxLjA3MSA0Ljk0NC45NCAzLjgyOC0yLjg1NyAxMC4yMTUtNi44ODkgMTAuODM4LTYuMTUyIDMuMTA2IDMuNjc0IDMuNDk5IDEyLjQyIDIuODI2IDE1LjkzOS0uMjIgMS4xNTEtMTAuNTA1LTEuMTM5LTEwLjUwNS0yLjM4IDAtNS4xNTItMS4zMzctNi41NjUtMi42NS02Ljcxem0tMjIuNTMtMS42MDljLjg0My0xLjMzMyA3LjY3NC4zMjUgMTEuNDI0IDEuOTkzIDAgMC0uNzcgMy40OTEuNDU2IDcuNjA0LjM1OSAxLjIwMy04LjYyNyA2LjU1OC05LjggNS42MzctMS4zNTUtMS4wNjUtMy44NS0xMi40MzItMi4wOC0xNS4yMzR6IiBmaWxsPSIjNGNiYTNjIi8+CiAgICA8cGF0aCBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Im01NS4yNjkgNjguNDA2Yy41NTMtMi40MDMgMy4xMjctNi45MzIgMTIuMzIxLTYuODIyIDQuNjQ4LS4wMTkgMTAuNDIyLS4wMDIgMTQuMjUtLjQzNmE1MS4zMTIgNTEuMzEyIDAgMCAwIDEyLjcyNi0zLjA5NWMzLjk4LTEuNTE5IDUuMzkyLTEuMTggNS44ODctLjI3Mi41NDQuOTk5LS4wOTcgMi43MjItMS40ODggNC4zMDktMi42NTYgMy4wMy03LjQzMSA1LjM4LTE1Ljg2NSA2LjA3Ni04LjQzMy42OTgtMTQuMDItMS41NjUtMTYuNDI1IDIuMTE4LTEuMDM4IDEuNTg5LS4yMzYgNS4zMzMgNy45MiA2LjUxMiAxMS4wMiAxLjU5IDIwLjA3Mi0xLjkxNyAyMS4xOS4yMDEgMS4xMTkgMi4xMTgtNS4zMjMgNi40MjgtMTYuMzYyIDYuNTE4cy0xNy45MzQtMy44NjUtMjAuMzc5LTUuODNjLTMuMTAyLTIuNDk1LTQuNDktNi4xMzMtMy43NzUtOS4yNzl6IiBmaWxsPSIjZmMzIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz4KICAgIDxnIGZpbGw9IiMxNDMwN2UiIG9wYWNpdHk9Ii44Ij4KICAgICAgPHBhdGggZD0ibTY5LjMyNyA0Mi4xMjdjLjYxNi0xLjAwOCAxLjk4MS0xLjc4NiA0LjIxNi0xLjc4NiAyLjIzNCAwIDMuMjg1Ljg4OSA0LjAxMyAxLjg4LjE0OC4yMDItLjA3Ni40NC0uMzA2LjM0YTU5Ljg2OSA1OS44NjkgMCAwIDEgLS4xNjgtLjA3M2MtLjgxNy0uMzU3LTEuODItLjc5NS0zLjU0LS44Mi0xLjgzOC0uMDI2LTIuOTk3LjQzNS0zLjcyNy44MzEtLjI0Ni4xMzQtLjYzNC0uMTMzLS40ODgtLjM3MnptLTI1LjE1NyAxLjI5YzIuMTctLjkwNyAzLjg3Ni0uNzkgNS4wODEtLjUwNC4yNTQuMDYuNDMtLjIxMy4yMjctLjM3Ny0uOTM1LS43NTUtMy4wMy0xLjY5Mi01Ljc2LS42NzQtMi40MzcuOTA5LTMuNTg1IDIuNzk2LTMuNTkyIDQuMDM4LS4wMDIuMjkyLjYuMzE3Ljc1Ni4wNy40Mi0uNjcgMS4xMi0xLjY0NiAzLjI4OS0yLjU1M3oiLz4KICAgICAgPHBhdGggY2xpcC1ydWxlPSJldmVub2RkIiBkPSJtNzUuNDQgNTUuOTJhMy40NyAzLjQ3IDAgMCAxIC0zLjQ3NC0zLjQ2MiAzLjQ3IDMuNDcgMCAwIDEgMy40NzUtMy40NiAzLjQ3IDMuNDcgMCAwIDEgMy40NzQgMy40NiAzLjQ3IDMuNDcgMCAwIDEgLTMuNDc1IDMuNDYyem0yLjQ0Ny00LjYwOGEuODk5Ljg5OSAwIDAgMCAtMS43OTkgMGMwIC40OTQuNDA1Ljg5NS45Ljg5NS40OTkgMCAuOS0uNC45LS44OTV6bS0yNS40NjQgMy41NDJhNC4wNDIgNC4wNDIgMCAwIDEgLTQuMDQ5IDQuMDM3IDQuMDQ1IDQuMDQ1IDAgMCAxIC00LjA1LTQuMDM3IDQuMDQ1IDQuMDQ1IDAgMCAxIDQuMDUtNC4wMzcgNC4wNDUgNC4wNDUgMCAwIDEgNC4wNSA0LjAzN3ptLTEuMTkzLTEuMzM4YTEuMDUgMS4wNSAwIDAgMCAtMi4wOTcgMCAxLjA0OCAxLjA0OCAwIDAgMCAyLjA5NyAweiIgZmlsbC1ydWxlPSJldmVub2RkIi8+CiAgICA8L2c+CiAgICA8cGF0aCBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Im02NCAxMTcuNzVjMjkuNjg1IDAgNTMuNzUtMjQuMDY1IDUzLjc1LTUzLjc1cy0yNC4wNjUtNTMuNzUtNTMuNzUtNTMuNzUtNTMuNzUgMjQuMDY1LTUzLjc1IDUzLjc1IDI0LjA2NSA1My43NSA1My43NSA1My43NXptMCA1YzMyLjQ0NyAwIDU4Ljc1LTI2LjMwMyA1OC43NS01OC43NXMtMjYuMzAzLTU4Ljc1LTU4Ljc1LTU4Ljc1LTU4Ljc1IDI2LjMwMy01OC43NSA1OC43NSAyNi4zMDMgNTguNzUgNTguNzUgNTguNzV6IiBmaWxsPSIjZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+');\n}\n\n/* Email tooltip specific */\n.tooltip__button--email {\n    flex-direction: column;\n    justify-content: center;\n    align-items: flex-start;\n    font-size: 14px;\n    padding: 4px 8px;\n}\n.tooltip__button--email__primary-text {\n    font-weight: bold;\n}\n.tooltip__button--email__secondary-text {\n    font-size: 12px;\n}\n\n/* Email Protection signup notice */\n:not(.top-autofill) .tooltip--email-signup {\n    text-align: left;\n    color: #222222;\n    padding: 16px 20px;\n    width: 380px;\n}\n\n.tooltip--email-signup h1 {\n    font-weight: 700;\n    font-size: 16px;\n    line-height: 1.5;\n    margin: 0;\n}\n\n.tooltip--email-signup p {\n    font-weight: 400;\n    font-size: 14px;\n    line-height: 1.4;\n}\n\n.notice-controls {\n    display: flex;\n}\n\n.tooltip--email-signup .notice-controls > * {\n    border-radius: 8px;\n    border: 0;\n    cursor: pointer;\n    display: inline-block;\n    font-family: inherit;\n    font-style: normal;\n    font-weight: bold;\n    padding: 8px 12px;\n    text-decoration: none;\n}\n\n.notice-controls .ghost {\n    margin-left: 1rem;\n}\n\n.tooltip--email-signup a.primary {\n    background: #3969EF;\n    color: #fff;\n}\n\n.tooltip--email-signup a.primary:hover,\n.tooltip--email-signup a.primary:focus {\n    background: #2b55ca;\n}\n\n.tooltip--email-signup a.primary:active {\n    background: #1e42a4;\n}\n\n.tooltip--email-signup button.ghost {\n    background: transparent;\n    color: #3969EF;\n}\n\n.tooltip--email-signup button.ghost:hover,\n.tooltip--email-signup button.ghost:focus {\n    background-color: rgba(0, 0, 0, 0.06);\n    color: #2b55ca;\n}\n\n.tooltip--email-signup button.ghost:active {\n    background-color: rgba(0, 0, 0, 0.12);\n    color: #1e42a4;\n}\n\n.tooltip--email-signup button.close-tooltip {\n    background-color: transparent;\n    background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTMiIHZpZXdCb3g9IjAgMCAxMiAxMyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0wLjI5Mjg5NCAwLjY1NjkwN0MwLjY4MzQxOCAwLjI2NjM4MyAxLjMxNjU4IDAuMjY2MzgzIDEuNzA3MTEgMC42NTY5MDdMNiA0Ljk0OThMMTAuMjkyOSAwLjY1NjkwN0MxMC42ODM0IDAuMjY2MzgzIDExLjMxNjYgMC4yNjYzODMgMTEuNzA3MSAwLjY1NjkwN0MxMi4wOTc2IDEuMDQ3NDMgMTIuMDk3NiAxLjY4MDYgMTEuNzA3MSAyLjA3MTEyTDcuNDE0MjEgNi4zNjQwMUwxMS43MDcxIDEwLjY1NjlDMTIuMDk3NiAxMS4wNDc0IDEyLjA5NzYgMTEuNjgwNiAxMS43MDcxIDEyLjA3MTFDMTEuMzE2NiAxMi40NjE2IDEwLjY4MzQgMTIuNDYxNiAxMC4yOTI5IDEyLjA3MTFMNiA3Ljc3ODIzTDEuNzA3MTEgMTIuMDcxMUMxLjMxNjU4IDEyLjQ2MTYgMC42ODM0MTcgMTIuNDYxNiAwLjI5Mjg5MyAxMi4wNzExQy0wLjA5NzYzMTEgMTEuNjgwNiAtMC4wOTc2MzExIDExLjA0NzQgMC4yOTI4OTMgMTAuNjU2OUw0LjU4NTc5IDYuMzY0MDFMMC4yOTI4OTQgMi4wNzExMkMtMC4wOTc2MzA2IDEuNjgwNiAtMC4wOTc2MzA2IDEuMDQ3NDMgMC4yOTI4OTQgMC42NTY5MDdaIiBmaWxsPSJibGFjayIgZmlsbC1vcGFjaXR5PSIwLjg0Ii8+Cjwvc3ZnPgo=);\n    background-position: center center;\n    background-repeat: no-repeat;\n    border: 0;\n    cursor: pointer;\n    padding: 16px;\n    position: absolute;\n    right: 12px;\n    top: 12px;\n}\n";
exports.CSS_STYLES = CSS_STYLES;

},{}],55:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buttonMatchesFormType = exports.autofillEnabled = exports.addInlineStyles = exports.SIGN_IN_MSG = exports.ADDRESS_DOMAIN = void 0;
exports.escapeXML = escapeXML;
exports.isEventWithinDax = exports.isAutofillEnabledFromProcessedConfig = exports.getTextShallow = exports.getDaxBoundingBox = exports.formatDuckAddress = void 0;
exports.isFormLikelyToBeUsedAsPageWrapper = isFormLikelyToBeUsedAsPageWrapper;
exports.isLikelyASubmitButton = exports.isIncontextSignupEnabledFromProcessedConfig = void 0;
exports.isLocalNetwork = isLocalNetwork;
exports.isPotentiallyViewable = void 0;
exports.isValidTLD = isValidTLD;
exports.logPerformance = logPerformance;
exports.setValue = exports.sendAndWaitForAnswer = exports.safeExecute = exports.removeInlineStyles = exports.notifyWebApp = void 0;
exports.shouldLog = shouldLog;
exports.shouldLogPerformance = shouldLogPerformance;
exports.truncateFromMiddle = truncateFromMiddle;
exports.wasAutofilledByChrome = void 0;
exports.whenIdle = whenIdle;

var _matching = require("./Form/matching.js");

const SIGN_IN_MSG = {
  signMeIn: true
}; // Send a message to the web app (only on DDG domains)

exports.SIGN_IN_MSG = SIGN_IN_MSG;

const notifyWebApp = message => {
  window.postMessage(message, window.origin);
};
/**
 * Sends a message and returns a Promise that resolves with the response
 * @param {{} | Function} msgOrFn - a fn to call or an object to send via postMessage
 * @param {String} expectedResponse - the name of the response
 * @returns {Promise<*>}
 */


exports.notifyWebApp = notifyWebApp;

const sendAndWaitForAnswer = (msgOrFn, expectedResponse) => {
  if (typeof msgOrFn === 'function') {
    msgOrFn();
  } else {
    window.postMessage(msgOrFn, window.origin);
  }

  return new Promise(resolve => {
    const handler = e => {
      if (e.origin !== window.origin) return;
      if (!e.data || e.data && !(e.data[expectedResponse] || e.data.type === expectedResponse)) return;
      resolve(e.data);
      window.removeEventListener('message', handler);
    };

    window.addEventListener('message', handler);
  });
};
/**
 * @param {Pick<GlobalConfig, 'contentScope' | 'userUnprotectedDomains' | 'userPreferences'>} globalConfig
 * @param [processConfig]
 * @return {boolean}
 */


exports.sendAndWaitForAnswer = sendAndWaitForAnswer;

const autofillEnabled = (globalConfig, processConfig) => {
  if (!globalConfig.contentScope) {
    // Return enabled for platforms that haven't implemented the config yet
    return true;
  }

  const {
    contentScope,
    userUnprotectedDomains,
    userPreferences
  } = globalConfig; // Check config on Apple platforms

  const processedConfig = processConfig(contentScope, userUnprotectedDomains, userPreferences);
  return isAutofillEnabledFromProcessedConfig(processedConfig);
};

exports.autofillEnabled = autofillEnabled;

const isAutofillEnabledFromProcessedConfig = processedConfig => {
  const site = processedConfig.site;

  if (site.isBroken || !site.enabledFeatures.includes('autofill')) {
    if (shouldLog()) {
      console.log('⚠️ Autofill disabled by remote config');
    }

    return false;
  }

  return true;
};

exports.isAutofillEnabledFromProcessedConfig = isAutofillEnabledFromProcessedConfig;

const isIncontextSignupEnabledFromProcessedConfig = processedConfig => {
  const site = processedConfig.site;

  if (site.isBroken || !site.enabledFeatures.includes('incontextSignup')) {
    if (shouldLog()) {
      console.log('⚠️ In-context signup disabled by remote config');
    }

    return false;
  }

  return true;
}; // Access the original setter (needed to bypass React's implementation on mobile)
// @ts-ignore


exports.isIncontextSignupEnabledFromProcessedConfig = isIncontextSignupEnabledFromProcessedConfig;
const originalSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
/**
 * Ensures the value is set properly and dispatches events to simulate real user action
 * @param {HTMLInputElement} el
 * @param {string} val
 * @param {GlobalConfig} [config]
 * @return {boolean}
 */

const setValueForInput = (el, val, config) => {
  // Avoid keyboard flashing on Android
  if (!(config !== null && config !== void 0 && config.isAndroid)) {
    el.focus();
  } // todo(Shane): Not sending a 'key' property on these events can cause exceptions on 3rd party listeners that expect it


  el.dispatchEvent(new Event('keydown', {
    bubbles: true
  }));
  originalSet === null || originalSet === void 0 ? void 0 : originalSet.call(el, val);
  const events = [new Event('input', {
    bubbles: true
  }), // todo(Shane): Not sending a 'key' property on these events can cause exceptions on 3rd party listeners that expect it
  new Event('keyup', {
    bubbles: true
  }), new Event('change', {
    bubbles: true
  })];
  events.forEach(ev => el.dispatchEvent(ev)); // We call this again to make sure all forms are happy

  originalSet === null || originalSet === void 0 ? void 0 : originalSet.call(el, val);
  events.forEach(ev => el.dispatchEvent(ev));
  el.blur();
  return true;
};
/**
 * Fires events on a select element to simulate user interaction
 * @param {HTMLSelectElement} el
 */


const fireEventsOnSelect = el => {
  /** @type {Event[]} */
  const events = [new Event('mousedown', {
    bubbles: true
  }), new Event('mouseup', {
    bubbles: true
  }), new Event('click', {
    bubbles: true
  }), new Event('change', {
    bubbles: true
  })]; // Events fire on the select el, not option

  events.forEach(ev => el.dispatchEvent(ev));
  events.forEach(ev => el.dispatchEvent(ev));
  el.blur();
};
/**
 * Selects an option of a select element
 * We assume Select is only used for dates, i.e. in the credit card
 * @param {HTMLSelectElement} el
 * @param {string} val
 * @return {boolean}
 */


const setValueForSelect = (el, val) => {
  const subtype = (0, _matching.getInputSubtype)(el);
  const isMonth = subtype.includes('Month');
  const isZeroBasedNumber = isMonth && el.options[0].value === '0' && el.options.length === 12;
  const stringVal = String(val);
  const numberVal = Number(val); // Loop first through all values because they tend to be more precise

  for (const option of el.options) {
    // If values for months are zero-based (Jan === 0), add one to match our data type
    let value = option.value;

    if (isZeroBasedNumber) {
      value = "".concat(Number(value) + 1);
    } // TODO: try to match localised month names
    // TODO: implement alternative versions of values (abbreviations for States/Provinces or variations like USA, US, United States, etc.)


    if (value === stringVal || Number(value) === numberVal) {
      if (option.selected) return false;
      option.selected = true;
      fireEventsOnSelect(el);
      return true;
    }
  }

  for (const option of el.options) {
    if (option.innerText === stringVal || Number(option.innerText) === numberVal) {
      if (option.selected) return false;
      option.selected = true;
      fireEventsOnSelect(el);
      return true;
    }
  } // If we didn't find a matching option return false


  return false;
};
/**
 * Sets or selects a value to a form element
 * @param {HTMLInputElement | HTMLSelectElement} el
 * @param {string} val
 * @param {GlobalConfig} [config]
 * @return {boolean}
 */


const setValue = (el, val, config) => {
  if (el instanceof HTMLInputElement) return setValueForInput(el, val, config);
  if (el instanceof HTMLSelectElement) return setValueForSelect(el, val);
  return false;
};
/**
 * Use IntersectionObserver v2 to make sure the element is visible when clicked
 * https://developers.google.com/web/updates/2019/02/intersectionobserver-v2
 */


exports.setValue = setValue;

const safeExecute = function (el, fn) {
  let _opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  // TODO: temporary fix to misterious bug in Chrome
  // const {checkVisibility = true} = opts
  const intObs = new IntersectionObserver(changes => {
    for (const change of changes) {
      // Feature detection
      if (typeof change.isVisible === 'undefined') {
        // The browser doesn't support Intersection Observer v2, falling back to v1 behavior.
        change.isVisible = true;
      }

      if (change.isIntersecting) {
        /**
         * If 'checkVisibility' is 'false' (like on Windows), then we always execute the function
         * During testing it was found that windows does not `change.isVisible` properly.
         */
        // TODO: temporary fix to misterious bug in Chrome
        // if (!checkVisibility || change.isVisible) {
        //     fn()
        // }
        fn();
      }
    }

    intObs.disconnect();
  }, {
    trackVisibility: true,
    delay: 100
  });
  intObs.observe(el);
};
/**
 * Checks that an element is potentially viewable (even if off-screen)
 * @param {HTMLElement} el
 * @return {boolean}
 */


exports.safeExecute = safeExecute;

const isPotentiallyViewable = el => {
  const computedStyle = window.getComputedStyle(el);
  const opacity = parseFloat(computedStyle.getPropertyValue('opacity') || '1');
  const visibility = computedStyle.getPropertyValue('visibility');
  const opacityThreshold = 0.6;
  return el.clientWidth !== 0 && el.clientHeight !== 0 && opacity > opacityThreshold && visibility !== 'hidden';
};
/**
 * Gets the bounding box of the icon
 * @param {HTMLInputElement} input
 * @returns {{top: number, left: number, bottom: number, width: number, x: number, y: number, right: number, height: number}}
 */


exports.isPotentiallyViewable = isPotentiallyViewable;

const getDaxBoundingBox = input => {
  const {
    right: inputRight,
    top: inputTop,
    height: inputHeight
  } = input.getBoundingClientRect();
  const inputRightPadding = parseInt(getComputedStyle(input).paddingRight);
  const width = 30;
  const height = 30;
  const top = inputTop + (inputHeight - height) / 2;
  const right = inputRight - inputRightPadding;
  const left = right - width;
  const bottom = top + height;
  return {
    bottom,
    height,
    left,
    right,
    top,
    width,
    x: left,
    y: top
  };
};
/**
 * Check if a mouse event is within the icon
 * @param {MouseEvent} e
 * @param {HTMLInputElement} input
 * @returns {boolean}
 */


exports.getDaxBoundingBox = getDaxBoundingBox;

const isEventWithinDax = (e, input) => {
  const {
    left,
    right,
    top,
    bottom
  } = getDaxBoundingBox(input);
  const withinX = e.clientX >= left && e.clientX <= right;
  const withinY = e.clientY >= top && e.clientY <= bottom;
  return withinX && withinY;
};
/**
 * Adds inline styles from a prop:value object
 * @param {HTMLElement} el
 * @param {Object<string, string>} styles
 */


exports.isEventWithinDax = isEventWithinDax;

const addInlineStyles = (el, styles) => Object.entries(styles).forEach(_ref => {
  let [property, val] = _ref;
  return el.style.setProperty(property, val, 'important');
});
/**
 * Removes inline styles from a prop:value object
 * @param {HTMLElement} el
 * @param {Object<string, string>} styles
 */


exports.addInlineStyles = addInlineStyles;

const removeInlineStyles = (el, styles) => Object.keys(styles).forEach(property => el.style.removeProperty(property));

exports.removeInlineStyles = removeInlineStyles;
const ADDRESS_DOMAIN = '@duck.com';
/**
 * Given a username, returns the full email address
 * @param {string} address
 * @returns {string}
 */

exports.ADDRESS_DOMAIN = ADDRESS_DOMAIN;

const formatDuckAddress = address => address + ADDRESS_DOMAIN;
/**
 * Escapes any occurrences of &, ", <, > or / with XML entities.
 * @param {string} str The string to escape.
 * @return {string} The escaped string.
 */


exports.formatDuckAddress = formatDuckAddress;

function escapeXML(str) {
  const replacements = {
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
    '<': '&lt;',
    '>': '&gt;',
    '/': '&#x2F;'
  };
  return String(str).replace(/[&"'<>/]/g, m => replacements[m]);
}
/**
 * Determines if an element is likely to be a submit button
 * @param {HTMLElement} el A button, input, anchor or other element with role=button
 * @param {import("./Form/matching").Matching} matching
 * @return {boolean}
 */


const isLikelyASubmitButton = (el, matching) => {
  var _matching$getDDGMatch, _matching$getDDGMatch2, _matching$getDDGMatch3;

  const text = getTextShallow(el);
  const ariaLabel = el.getAttribute('aria-label') || '';
  const dataTestId = el.getAttribute('data-test-id') || '';
  if ((el.getAttribute('type') === 'submit' || // is explicitly set as "submit"
  el.getAttribute('name') === 'submit') && // is called "submit"
  !((_matching$getDDGMatch = matching.getDDGMatcherRegex('submitButtonUnlikelyRegex')) !== null && _matching$getDDGMatch !== void 0 && _matching$getDDGMatch.test(text + ' ' + ariaLabel))) return true;
  return (/primary|submit/i.test(el.className) || // has high-signal submit classes
  /submit/i.test(dataTestId) || ((_matching$getDDGMatch2 = matching.getDDGMatcherRegex('submitButtonRegex')) === null || _matching$getDDGMatch2 === void 0 ? void 0 : _matching$getDDGMatch2.test(text)) || // has high-signal text
  el.offsetHeight * el.offsetWidth >= 10000 && !/secondary/i.test(el.className) // it's a large element 250x40px
  ) && el.offsetHeight * el.offsetWidth >= 2000 && // it's not a very small button like inline links and such
  !((_matching$getDDGMatch3 = matching.getDDGMatcherRegex('submitButtonUnlikelyRegex')) !== null && _matching$getDDGMatch3 !== void 0 && _matching$getDDGMatch3.test(text + ' ' + ariaLabel));
};
/**
 * Check that a button matches the form type - login buttons on a login form, signup buttons on a signup form
 * @param {HTMLElement} el
 * @param {import('./Form/Form').Form} formObj
 */


exports.isLikelyASubmitButton = isLikelyASubmitButton;

const buttonMatchesFormType = (el, formObj) => {
  if (formObj.isLogin) {
    return !/sign.?up|register|join/i.test(el.textContent || '');
  } else if (formObj.isSignup) {
    return !/(log|sign).?([io])n/i.test(el.textContent || '');
  } else {
    return true;
  }
};

exports.buttonMatchesFormType = buttonMatchesFormType;
const buttonInputTypes = ['submit', 'button'];
/**
 * Get the text of an element, one level deep max
 * @param {Node} el
 * @returns {string}
 */

const getTextShallow = el => {
  // for buttons, we don't care about descendants, just get the whole text as is
  // this is important in order to give proper attribution of the text to the button
  if (el instanceof HTMLButtonElement) return (0, _matching.removeExcessWhitespace)(el.textContent);

  if (el instanceof HTMLInputElement) {
    if (buttonInputTypes.includes(el.type)) {
      return el.value;
    }

    if (el.type === 'image') {
      return (0, _matching.removeExcessWhitespace)(el.alt || el.value || el.title || el.name);
    }
  }

  let text = '';

  for (const childNode of el.childNodes) {
    if (childNode instanceof Text) {
      text += ' ' + childNode.textContent;
    }
  }

  return (0, _matching.removeExcessWhitespace)(text);
};
/**
 * Check if hostname is a local address
 * @param {string} [hostname]
 * @returns {boolean}
 */


exports.getTextShallow = getTextShallow;

function isLocalNetwork() {
  let hostname = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.location.hostname;
  return ['localhost', '', '::1'].includes(hostname) || hostname.includes('127.0.0.1') || hostname.includes('192.168.') || hostname.startsWith('10.0.') || hostname.endsWith('.local') || hostname.endsWith('.internal');
} // Extracted from lib/DDG/Util/Constants.pm


const tldrs = /\.(?:c(?:o(?:m|op)?|at?|[iykgdmnxruhcfzvl])|o(?:rg|m)|n(?:et?|a(?:me)?|[ucgozrfpil])|e(?:d?u|[gechstr])|i(?:n(?:t|fo)?|[stqldroem])|m(?:o(?:bi)?|u(?:seum)?|i?l|[mcyvtsqhaerngxzfpwkd])|g(?:ov|[glqeriabtshdfmuywnp])|b(?:iz?|[drovfhtaywmzjsgbenl])|t(?:r(?:avel)?|[ncmfzdvkopthjwg]|e?l)|k[iemygznhwrp]|s[jtvberindlucygkhaozm]|u[gymszka]|h[nmutkr]|r[owesu]|d[kmzoej]|a(?:e(?:ro)?|r(?:pa)?|[qofiumsgzlwcnxdt])|p(?:ro?|[sgnthfymakwle])|v[aegiucn]|l[sayuvikcbrt]|j(?:o(?:bs)?|[mep])|w[fs]|z[amw]|f[rijkom]|y[eut]|qa)$/i;
/**
 * Check if hostname is a valid top-level domain
 * @param {string} [hostname]
 * @returns {boolean}
 */

function isValidTLD() {
  let hostname = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.location.hostname;
  return tldrs.test(hostname) || hostname === 'fill.dev';
}
/**
 * Chrome's UA adds styles using this selector when using the built-in autofill
 * @param {HTMLInputElement} input
 * @returns {boolean}
 */


const wasAutofilledByChrome = input => {
  try {
    // Other browsers throw because the selector is invalid
    return input.matches('input:-internal-autofill-selected');
  } catch (e) {
    return false;
  }
};
/**
 * Checks if we should log form analysis debug info to the console
 * @returns {boolean}
 */


exports.wasAutofilledByChrome = wasAutofilledByChrome;

function shouldLog() {
  return readDebugSetting('ddg-autofill-debug');
}
/**
 * Checks if we should log performance info to the console
 * @returns {boolean}
 */


function shouldLogPerformance() {
  return readDebugSetting('ddg-autofill-perf');
}
/**
 * Check if a sessionStorage item is set to 'true'
 * @param setting
 * @returns {boolean}
 */


function readDebugSetting(setting) {
  // sessionStorage throws in invalid schemes like data: and file:
  try {
    var _window$sessionStorag;

    return ((_window$sessionStorag = window.sessionStorage) === null || _window$sessionStorag === void 0 ? void 0 : _window$sessionStorag.getItem(setting)) === 'true';
  } catch (e) {
    return false;
  }
}

function logPerformance(markName) {
  if (shouldLogPerformance()) {
    var _window$performance, _window$performance2;

    const measurement = (_window$performance = window.performance) === null || _window$performance === void 0 ? void 0 : _window$performance.measure("".concat(markName, ":init"), "".concat(markName, ":init:start"), "".concat(markName, ":init:end"));
    console.log("".concat(markName, " took ").concat(Math.round(measurement === null || measurement === void 0 ? void 0 : measurement.duration), "ms"));
    (_window$performance2 = window.performance) === null || _window$performance2 === void 0 ? void 0 : _window$performance2.clearMarks();
  }
}
/**
 *
 * @param {Function} callback
 * @returns {Function}
 */


function whenIdle(callback) {
  var _this = this;

  let timer;
  return function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    cancelIdleCallback(timer);
    timer = requestIdleCallback(() => callback.apply(_this, args));
  };
}
/**
 * Truncate string from the middle if exceeds the totalLength (default: 30)
 * @param {string} string
 * @param {number} totalLength
 * @returns {string}
 */


function truncateFromMiddle(string) {
  let totalLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 30;

  if (totalLength < 4) {
    throw new Error('Do not use with strings shorter than 4');
  }

  if (string.length <= totalLength) return string;
  const truncated = string.slice(0, totalLength / 2).concat('…', string.slice(totalLength / -2));
  return truncated;
}
/**
 * Determines if the form is likely to be enclosing most of the DOM
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */


function isFormLikelyToBeUsedAsPageWrapper(form) {
  if (form.parentElement !== document.body) return false;
  const formChildren = form.querySelectorAll('*').length; // If the form has few content elements, it's unlikely to cause issues anyway

  if (formChildren < 100) return false;
  const bodyChildren = document.body.querySelectorAll('*').length;
  /**
   * Percentage of the formChildren on the total body elements
   * form * 100 / body = x
   */

  const formChildrenPercentage = formChildren * 100 / bodyChildren;
  return formChildrenPercentage > 50;
}

},{"./Form/matching.js":35}],56:[function(require,module,exports){
"use strict";

require("./requestIdleCallback.js");

var _DeviceInterface = require("./DeviceInterface.js");

var _autofillUtils = require("./autofill-utils.js");

// Polyfills/shims
(() => {
  if ((0, _autofillUtils.shouldLog)()) {
    console.log('DuckDuckGo Autofill Active');
  }

  if (!window.isSecureContext) return false;

  try {
    const startupAutofill = () => {
      if (document.visibilityState === 'visible') {
        const deviceInterface = (0, _DeviceInterface.createDevice)();
        deviceInterface.init();
      } else {
        document.addEventListener('visibilitychange', startupAutofill, {
          once: true
        });
      }
    };

    startupAutofill();
  } catch (e) {
    console.error(e); // Noop, we errored
  }
})();

},{"./DeviceInterface.js":14,"./autofill-utils.js":55,"./requestIdleCallback.js":67}],57:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DDG_DOMAIN_REGEX = void 0;
exports.createGlobalConfig = createGlobalConfig;
const DDG_DOMAIN_REGEX = new RegExp(/^https:\/\/(([a-z0-9-_]+?)\.)?duckduckgo\.com\/email/);
/**
 * This is a centralised place to contain all string/variable replacements
 *
 * @param {Partial<GlobalConfig>} [overrides]
 * @returns {GlobalConfig}
 */

exports.DDG_DOMAIN_REGEX = DDG_DOMAIN_REGEX;

function createGlobalConfig(overrides) {
  let isApp = false;
  let isTopFrame = false;
  let supportsTopFrame = false; // Do not remove -- Apple devices change this when they support modern webkit messaging

  let hasModernWebkitAPI = false; // INJECT isApp HERE
  // INJECT isTopFrame HERE
  // INJECT supportsTopFrame HERE
  // INJECT hasModernWebkitAPI HERE

  let isWindows = false; // INJECT isWindows HERE
  // This will be used when 'hasModernWebkitAPI' is false

  /** @type {string[]} */

  let webkitMessageHandlerNames = []; // INJECT webkitMessageHandlerNames HERE

  let isDDGTestMode = false; // INJECT isDDGTestMode HERE

  let contentScope = null;
  let userUnprotectedDomains = null;
  /** @type {Record<string, any> | null} */

  let userPreferences = null; // INJECT contentScope HERE
  // INJECT userUnprotectedDomains HERE
  // INJECT userPreferences HERE

  /** @type {Record<string, any> | null} */

  let availableInputTypes = null; // INJECT availableInputTypes HERE
  // The native layer will inject a randomised secret here and use it to verify the origin

  let secret = 'PLACEHOLDER_SECRET';
  /**
   * The user agent check will not be needed here once `android` supports `userPreferences?.platform.name`
   */
  // @ts-ignore

  const isAndroid = (userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.platform.name) === 'android' || /Android.*DuckDuckGo\/\d/i.test(window.navigator.userAgent); // @ts-ignore

  const isDDGApp = ['ios', 'android', 'macos', 'windows'].includes(userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.platform.name) || isAndroid || isWindows; // @ts-ignore

  const isMobileApp = ['ios', 'android'].includes(userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.platform.name) || isAndroid;
  const isFirefox = navigator.userAgent.includes('Firefox');
  const isDDGDomain = Boolean(window.location.href.match(DDG_DOMAIN_REGEX));
  const isExtension = false;
  const config = {
    isApp,
    isDDGApp,
    isAndroid,
    isFirefox,
    isMobileApp,
    isExtension,
    isTopFrame,
    isWindows,
    secret,
    supportsTopFrame,
    hasModernWebkitAPI,
    contentScope,
    userUnprotectedDomains,
    userPreferences,
    isDDGTestMode,
    isDDGDomain,
    availableInputTypes,
    webkitMessageHandlerNames,
    ...overrides
  };
  return config;
}

},{}],58:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.constants = void 0;
const constants = {
  ATTR_INPUT_TYPE: 'data-ddg-inputType',
  ATTR_AUTOFILL: 'data-ddg-autofill',
  TEXT_LENGTH_CUTOFF: 100,
  MAX_INPUTS_PER_PAGE: 100,
  MAX_FORMS_PER_PAGE: 30,
  MAX_INPUTS_PER_FORM: 80,
  MAX_FORM_MUT_OBS_COUNT: 50
};
exports.constants = constants;

},{}],59:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StoreFormDataCall = exports.StartEmailProtectionSignupCall = exports.SetSizeCall = exports.SetIncontextSignupPermanentlyDismissedAtCall = exports.SendJSPixelCall = exports.SelectedDetailCall = exports.OpenManagePasswordsCall = exports.OpenManageIdentitiesCall = exports.OpenManageCreditCardsCall = exports.GetRuntimeConfigurationCall = exports.GetIncontextSignupDismissedAtCall = exports.GetAvailableInputTypesCall = exports.GetAutofillInitDataCall = exports.GetAutofillDataCall = exports.GetAutofillCredentialsCall = exports.EmailProtectionStoreUserDataCall = exports.EmailProtectionRemoveUserDataCall = exports.EmailProtectionRefreshPrivateAddressCall = exports.EmailProtectionGetUserDataCall = exports.EmailProtectionGetIsLoggedInCall = exports.EmailProtectionGetCapabilitiesCall = exports.EmailProtectionGetAddressesCall = exports.CloseEmailProtectionTabCall = exports.CloseAutofillParentCall = exports.CheckCredentialsProviderStatusCall = exports.AskToUnlockProviderCall = exports.AddDebugFlagCall = void 0;

var _validatorsZod = require("./validators.zod.js");

var _deviceApi = require("../../../packages/device-api");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @extends {DeviceApiCall<addDebugFlagParamsSchema, any>} 
 */
class AddDebugFlagCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "addDebugFlag");

    _defineProperty(this, "paramsValidator", _validatorsZod.addDebugFlagParamsSchema);
  }

}
/**
 * @extends {DeviceApiCall<getAutofillDataRequestSchema, getAutofillDataResponseSchema>} 
 */


exports.AddDebugFlagCall = AddDebugFlagCall;

class GetAutofillDataCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "getAutofillData");

    _defineProperty(this, "id", "getAutofillDataResponse");

    _defineProperty(this, "paramsValidator", _validatorsZod.getAutofillDataRequestSchema);

    _defineProperty(this, "resultValidator", _validatorsZod.getAutofillDataResponseSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, getRuntimeConfigurationResponseSchema>} 
 */


exports.GetAutofillDataCall = GetAutofillDataCall;

class GetRuntimeConfigurationCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "getRuntimeConfiguration");

    _defineProperty(this, "id", "getRuntimeConfigurationResponse");

    _defineProperty(this, "resultValidator", _validatorsZod.getRuntimeConfigurationResponseSchema);
  }

}
/**
 * @extends {DeviceApiCall<storeFormDataSchema, any>} 
 */


exports.GetRuntimeConfigurationCall = GetRuntimeConfigurationCall;

class StoreFormDataCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "storeFormData");

    _defineProperty(this, "paramsValidator", _validatorsZod.storeFormDataSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, getAvailableInputTypesResultSchema>} 
 */


exports.StoreFormDataCall = StoreFormDataCall;

class GetAvailableInputTypesCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "getAvailableInputTypes");

    _defineProperty(this, "id", "getAvailableInputTypesResponse");

    _defineProperty(this, "resultValidator", _validatorsZod.getAvailableInputTypesResultSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, getAutofillInitDataResponseSchema>} 
 */


exports.GetAvailableInputTypesCall = GetAvailableInputTypesCall;

class GetAutofillInitDataCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "getAutofillInitData");

    _defineProperty(this, "id", "getAutofillInitDataResponse");

    _defineProperty(this, "resultValidator", _validatorsZod.getAutofillInitDataResponseSchema);
  }

}
/**
 * @extends {DeviceApiCall<getAutofillCredentialsParamsSchema, getAutofillCredentialsResultSchema>} 
 */


exports.GetAutofillInitDataCall = GetAutofillInitDataCall;

class GetAutofillCredentialsCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "getAutofillCredentials");

    _defineProperty(this, "id", "getAutofillCredentialsResponse");

    _defineProperty(this, "paramsValidator", _validatorsZod.getAutofillCredentialsParamsSchema);

    _defineProperty(this, "resultValidator", _validatorsZod.getAutofillCredentialsResultSchema);
  }

}
/**
 * @extends {DeviceApiCall<setSizeParamsSchema, any>} 
 */


exports.GetAutofillCredentialsCall = GetAutofillCredentialsCall;

class SetSizeCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "setSize");

    _defineProperty(this, "paramsValidator", _validatorsZod.setSizeParamsSchema);
  }

}
/**
 * @extends {DeviceApiCall<selectedDetailParamsSchema, any>} 
 */


exports.SetSizeCall = SetSizeCall;

class SelectedDetailCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "selectedDetail");

    _defineProperty(this, "paramsValidator", _validatorsZod.selectedDetailParamsSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, any>} 
 */


exports.SelectedDetailCall = SelectedDetailCall;

class CloseAutofillParentCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "closeAutofillParent");
  }

}
/**
 * @extends {DeviceApiCall<any, askToUnlockProviderResultSchema>} 
 */


exports.CloseAutofillParentCall = CloseAutofillParentCall;

class AskToUnlockProviderCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "askToUnlockProvider");

    _defineProperty(this, "id", "askToUnlockProviderResponse");

    _defineProperty(this, "resultValidator", _validatorsZod.askToUnlockProviderResultSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, checkCredentialsProviderStatusResultSchema>} 
 */


exports.AskToUnlockProviderCall = AskToUnlockProviderCall;

class CheckCredentialsProviderStatusCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "checkCredentialsProviderStatus");

    _defineProperty(this, "id", "checkCredentialsProviderStatusResponse");

    _defineProperty(this, "resultValidator", _validatorsZod.checkCredentialsProviderStatusResultSchema);
  }

}
/**
 * @extends {DeviceApiCall<sendJSPixelParamsSchema, any>} 
 */


exports.CheckCredentialsProviderStatusCall = CheckCredentialsProviderStatusCall;

class SendJSPixelCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "sendJSPixel");

    _defineProperty(this, "paramsValidator", _validatorsZod.sendJSPixelParamsSchema);
  }

}
/**
 * @extends {DeviceApiCall<setIncontextSignupPermanentlyDismissedAtSchema, any>} 
 */


exports.SendJSPixelCall = SendJSPixelCall;

class SetIncontextSignupPermanentlyDismissedAtCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "setIncontextSignupPermanentlyDismissedAt");

    _defineProperty(this, "paramsValidator", _validatorsZod.setIncontextSignupPermanentlyDismissedAtSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, getIncontextSignupDismissedAtSchema>} 
 */


exports.SetIncontextSignupPermanentlyDismissedAtCall = SetIncontextSignupPermanentlyDismissedAtCall;

class GetIncontextSignupDismissedAtCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "getIncontextSignupDismissedAt");

    _defineProperty(this, "id", "getIncontextSignupDismissedAt");

    _defineProperty(this, "resultValidator", _validatorsZod.getIncontextSignupDismissedAtSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, any>} 
 */


exports.GetIncontextSignupDismissedAtCall = GetIncontextSignupDismissedAtCall;

class OpenManagePasswordsCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "openManagePasswords");
  }

}
/**
 * @extends {DeviceApiCall<any, any>} 
 */


exports.OpenManagePasswordsCall = OpenManagePasswordsCall;

class OpenManageCreditCardsCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "openManageCreditCards");
  }

}
/**
 * @extends {DeviceApiCall<any, any>} 
 */


exports.OpenManageCreditCardsCall = OpenManageCreditCardsCall;

class OpenManageIdentitiesCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "openManageIdentities");
  }

}
/**
 * @extends {DeviceApiCall<emailProtectionStoreUserDataParamsSchema, any>} 
 */


exports.OpenManageIdentitiesCall = OpenManageIdentitiesCall;

class EmailProtectionStoreUserDataCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "emailProtectionStoreUserData");

    _defineProperty(this, "id", "emailProtectionStoreUserDataResponse");

    _defineProperty(this, "paramsValidator", _validatorsZod.emailProtectionStoreUserDataParamsSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, any>} 
 */


exports.EmailProtectionStoreUserDataCall = EmailProtectionStoreUserDataCall;

class EmailProtectionRemoveUserDataCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "emailProtectionRemoveUserData");
  }

}
/**
 * @extends {DeviceApiCall<any, emailProtectionGetIsLoggedInResultSchema>} 
 */


exports.EmailProtectionRemoveUserDataCall = EmailProtectionRemoveUserDataCall;

class EmailProtectionGetIsLoggedInCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "emailProtectionGetIsLoggedIn");

    _defineProperty(this, "id", "emailProtectionGetIsLoggedInResponse");

    _defineProperty(this, "resultValidator", _validatorsZod.emailProtectionGetIsLoggedInResultSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, emailProtectionGetUserDataResultSchema>} 
 */


exports.EmailProtectionGetIsLoggedInCall = EmailProtectionGetIsLoggedInCall;

class EmailProtectionGetUserDataCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "emailProtectionGetUserData");

    _defineProperty(this, "id", "emailProtectionGetUserDataResponse");

    _defineProperty(this, "resultValidator", _validatorsZod.emailProtectionGetUserDataResultSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, emailProtectionGetCapabilitiesResultSchema>} 
 */


exports.EmailProtectionGetUserDataCall = EmailProtectionGetUserDataCall;

class EmailProtectionGetCapabilitiesCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "emailProtectionGetCapabilities");

    _defineProperty(this, "id", "emailProtectionGetCapabilitiesResponse");

    _defineProperty(this, "resultValidator", _validatorsZod.emailProtectionGetCapabilitiesResultSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, emailProtectionGetAddressesResultSchema>} 
 */


exports.EmailProtectionGetCapabilitiesCall = EmailProtectionGetCapabilitiesCall;

class EmailProtectionGetAddressesCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "emailProtectionGetAddresses");

    _defineProperty(this, "id", "emailProtectionGetAddressesResponse");

    _defineProperty(this, "resultValidator", _validatorsZod.emailProtectionGetAddressesResultSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, emailProtectionRefreshPrivateAddressResultSchema>} 
 */


exports.EmailProtectionGetAddressesCall = EmailProtectionGetAddressesCall;

class EmailProtectionRefreshPrivateAddressCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "emailProtectionRefreshPrivateAddress");

    _defineProperty(this, "id", "emailProtectionRefreshPrivateAddressResponse");

    _defineProperty(this, "resultValidator", _validatorsZod.emailProtectionRefreshPrivateAddressResultSchema);
  }

}
/**
 * @extends {DeviceApiCall<any, any>} 
 */


exports.EmailProtectionRefreshPrivateAddressCall = EmailProtectionRefreshPrivateAddressCall;

class StartEmailProtectionSignupCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "startEmailProtectionSignup");
  }

}
/**
 * @extends {DeviceApiCall<any, any>} 
 */


exports.StartEmailProtectionSignupCall = StartEmailProtectionSignupCall;

class CloseEmailProtectionTabCall extends _deviceApi.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", "closeEmailProtectionTab");
  }

}

exports.CloseEmailProtectionTabCall = CloseEmailProtectionTabCall;

},{"../../../packages/device-api":6,"./validators.zod.js":60}],60:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.userPreferencesSchema = exports.triggerContextSchema = exports.storeFormDataSchema = exports.setSizeParamsSchema = exports.setIncontextSignupPermanentlyDismissedAtSchema = exports.sendJSPixelParamsSchema = exports.selectedDetailParamsSchema = exports.runtimeConfigurationSchema = exports.providerStatusUpdatedSchema = exports.outgoingCredentialsSchema = exports.getRuntimeConfigurationResponseSchema = exports.getIncontextSignupDismissedAtSchema = exports.getAvailableInputTypesResultSchema = exports.getAutofillInitDataResponseSchema = exports.getAutofillDataResponseSchema = exports.getAutofillDataRequestSchema = exports.getAutofillCredentialsResultSchema = exports.getAutofillCredentialsParamsSchema = exports.getAliasResultSchema = exports.getAliasParamsSchema = exports.genericErrorSchema = exports.generatedPasswordSchema = exports.emailProtectionStoreUserDataParamsSchema = exports.emailProtectionRefreshPrivateAddressResultSchema = exports.emailProtectionGetUserDataResultSchema = exports.emailProtectionGetIsLoggedInResultSchema = exports.emailProtectionGetCapabilitiesResultSchema = exports.emailProtectionGetAddressesResultSchema = exports.credentialsSchema = exports.contentScopeSchema = exports.checkCredentialsProviderStatusResultSchema = exports.availableInputTypesSchema = exports.availableInputTypes1Schema = exports.autofillSettingsSchema = exports.autofillFeatureTogglesSchema = exports.askToUnlockProviderResultSchema = exports.apiSchema = exports.addDebugFlagParamsSchema = void 0;
const sendJSPixelParamsSchema = null;
exports.sendJSPixelParamsSchema = sendJSPixelParamsSchema;
const addDebugFlagParamsSchema = null;
exports.addDebugFlagParamsSchema = addDebugFlagParamsSchema;
const generatedPasswordSchema = null;
exports.generatedPasswordSchema = generatedPasswordSchema;
const triggerContextSchema = null;
exports.triggerContextSchema = triggerContextSchema;
const credentialsSchema = null;
exports.credentialsSchema = credentialsSchema;
const genericErrorSchema = null;
exports.genericErrorSchema = genericErrorSchema;
const contentScopeSchema = null;
exports.contentScopeSchema = contentScopeSchema;
const userPreferencesSchema = null;
exports.userPreferencesSchema = userPreferencesSchema;
const outgoingCredentialsSchema = null;
exports.outgoingCredentialsSchema = outgoingCredentialsSchema;
const availableInputTypesSchema = null;
exports.availableInputTypesSchema = availableInputTypesSchema;
const getAutofillInitDataResponseSchema = null;
exports.getAutofillInitDataResponseSchema = getAutofillInitDataResponseSchema;
const getAutofillCredentialsParamsSchema = null;
exports.getAutofillCredentialsParamsSchema = getAutofillCredentialsParamsSchema;
const getAutofillCredentialsResultSchema = null;
exports.getAutofillCredentialsResultSchema = getAutofillCredentialsResultSchema;
const setSizeParamsSchema = null;
exports.setSizeParamsSchema = setSizeParamsSchema;
const selectedDetailParamsSchema = null;
exports.selectedDetailParamsSchema = selectedDetailParamsSchema;
const availableInputTypes1Schema = null;
exports.availableInputTypes1Schema = availableInputTypes1Schema;
const setIncontextSignupPermanentlyDismissedAtSchema = null;
exports.setIncontextSignupPermanentlyDismissedAtSchema = setIncontextSignupPermanentlyDismissedAtSchema;
const getIncontextSignupDismissedAtSchema = null;
exports.getIncontextSignupDismissedAtSchema = getIncontextSignupDismissedAtSchema;
const autofillFeatureTogglesSchema = null;
exports.autofillFeatureTogglesSchema = autofillFeatureTogglesSchema;
const getAliasParamsSchema = null;
exports.getAliasParamsSchema = getAliasParamsSchema;
const getAliasResultSchema = null;
exports.getAliasResultSchema = getAliasResultSchema;
const emailProtectionStoreUserDataParamsSchema = null;
exports.emailProtectionStoreUserDataParamsSchema = emailProtectionStoreUserDataParamsSchema;
const emailProtectionGetIsLoggedInResultSchema = null;
exports.emailProtectionGetIsLoggedInResultSchema = emailProtectionGetIsLoggedInResultSchema;
const emailProtectionGetUserDataResultSchema = null;
exports.emailProtectionGetUserDataResultSchema = emailProtectionGetUserDataResultSchema;
const emailProtectionGetCapabilitiesResultSchema = null;
exports.emailProtectionGetCapabilitiesResultSchema = emailProtectionGetCapabilitiesResultSchema;
const emailProtectionGetAddressesResultSchema = null;
exports.emailProtectionGetAddressesResultSchema = emailProtectionGetAddressesResultSchema;
const emailProtectionRefreshPrivateAddressResultSchema = null;
exports.emailProtectionRefreshPrivateAddressResultSchema = emailProtectionRefreshPrivateAddressResultSchema;
const getAutofillDataRequestSchema = null;
exports.getAutofillDataRequestSchema = getAutofillDataRequestSchema;
const getAutofillDataResponseSchema = null;
exports.getAutofillDataResponseSchema = getAutofillDataResponseSchema;
const runtimeConfigurationSchema = null;
exports.runtimeConfigurationSchema = runtimeConfigurationSchema;
const storeFormDataSchema = null;
exports.storeFormDataSchema = storeFormDataSchema;
const getAvailableInputTypesResultSchema = null;
exports.getAvailableInputTypesResultSchema = getAvailableInputTypesResultSchema;
const providerStatusUpdatedSchema = null;
exports.providerStatusUpdatedSchema = providerStatusUpdatedSchema;
const checkCredentialsProviderStatusResultSchema = null;
exports.checkCredentialsProviderStatusResultSchema = checkCredentialsProviderStatusResultSchema;
const autofillSettingsSchema = null;
exports.autofillSettingsSchema = autofillSettingsSchema;
const getRuntimeConfigurationResponseSchema = null;
exports.getRuntimeConfigurationResponseSchema = getRuntimeConfigurationResponseSchema;
const askToUnlockProviderResultSchema = null;
exports.askToUnlockProviderResultSchema = askToUnlockProviderResultSchema;
const apiSchema = null;
exports.apiSchema = apiSchema;

},{}],61:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GetAlias = void 0;

var _index = require("../../packages/device-api/index.js");

var _validatorsZod = require("./__generated__/validators.zod.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @extends {DeviceApiCall<getAliasParamsSchema, getAliasResultSchema>}
 */
class GetAlias extends _index.DeviceApiCall {
  constructor() {
    super(...arguments);

    _defineProperty(this, "method", 'emailHandlerGetAlias');

    _defineProperty(this, "id", 'n/a');

    _defineProperty(this, "paramsValidator", _validatorsZod.getAliasParamsSchema);

    _defineProperty(this, "resultValidator", _validatorsZod.getAliasResultSchema);
  }

  preResultValidation(response) {
    // convert to the correct format, because this is a legacy API
    return {
      success: response
    };
  }

}

exports.GetAlias = GetAlias;

},{"../../packages/device-api/index.js":6,"./__generated__/validators.zod.js":60}],62:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AndroidTransport = void 0;

var _index = require("../../../packages/device-api/index.js");

var _deviceApiCalls = require("../__generated__/deviceApiCalls.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class AndroidTransport extends _index.DeviceApiTransport {
  /** @type {GlobalConfig} */

  /** @param {GlobalConfig} globalConfig */
  constructor(globalConfig) {
    super();

    _defineProperty(this, "config", void 0);

    this.config = globalConfig;

    if (this.config.isDDGTestMode) {
      var _window$BrowserAutofi, _window$BrowserAutofi2;

      if (typeof ((_window$BrowserAutofi = window.BrowserAutofill) === null || _window$BrowserAutofi === void 0 ? void 0 : _window$BrowserAutofi.getAutofillData) !== 'function') {
        console.warn('window.BrowserAutofill.getAutofillData missing');
      }

      if (typeof ((_window$BrowserAutofi2 = window.BrowserAutofill) === null || _window$BrowserAutofi2 === void 0 ? void 0 : _window$BrowserAutofi2.storeFormData) !== 'function') {
        console.warn('window.BrowserAutofill.storeFormData missing');
      }
    }
  }
  /**
   * @param {import("../../../packages/device-api").DeviceApiCall} deviceApiCall
   * @returns {Promise<any>}
   */


  async send(deviceApiCall) {
    if (deviceApiCall instanceof _deviceApiCalls.GetRuntimeConfigurationCall) {
      return androidSpecificRuntimeConfiguration(this.config);
    }

    if (deviceApiCall instanceof _deviceApiCalls.GetAvailableInputTypesCall) {
      return androidSpecificAvailableInputTypes(this.config);
    }

    if (deviceApiCall instanceof _deviceApiCalls.GetAutofillDataCall) {
      window.BrowserAutofill.getAutofillData(JSON.stringify(deviceApiCall.params));
      return waitForResponse(deviceApiCall.id, this.config);
    }

    if (deviceApiCall instanceof _deviceApiCalls.StoreFormDataCall) {
      return window.BrowserAutofill.storeFormData(JSON.stringify(deviceApiCall.params));
    }

    throw new Error('android: not implemented: ' + deviceApiCall.method);
  }

}
/**
 * @param {string} expectedResponse - the name/id of the response
 * @param {GlobalConfig} config
 * @returns {Promise<*>}
 */


exports.AndroidTransport = AndroidTransport;

function waitForResponse(expectedResponse, config) {
  return new Promise(resolve => {
    const handler = e => {
      if (!config.isDDGTestMode) {
        if (e.origin !== '') {
          return;
        }
      }

      if (!e.data) {
        return;
      }

      if (typeof e.data !== 'string') {
        if (config.isDDGTestMode) {
          console.log('❌ event.data was not a string. Expected a string so that it can be JSON parsed');
        }

        return;
      }

      try {
        let data = JSON.parse(e.data);

        if (data.type === expectedResponse) {
          window.removeEventListener('message', handler);
          return resolve(data);
        }

        if (config.isDDGTestMode) {
          console.log("\u274C event.data.type was '".concat(data.type, "', which didnt match '").concat(expectedResponse, "'"), JSON.stringify(data));
        }
      } catch (e) {
        window.removeEventListener('message', handler);

        if (config.isDDGTestMode) {
          console.log('❌ Could not JSON.parse the response');
        }
      }
    };

    window.addEventListener('message', handler);
  });
}
/**
 * @param {GlobalConfig} globalConfig
 * @returns {{success: import('../__generated__/validators-ts').RuntimeConfiguration}}
 */


function androidSpecificRuntimeConfiguration(globalConfig) {
  if (!globalConfig.userPreferences) {
    throw new Error('globalConfig.userPreferences not supported yet on Android');
  }

  return {
    success: {
      // @ts-ignore
      contentScope: globalConfig.contentScope,
      // @ts-ignore
      userPreferences: globalConfig.userPreferences,
      // @ts-ignore
      userUnprotectedDomains: globalConfig.userUnprotectedDomains,
      // @ts-ignore
      availableInputTypes: globalConfig.availableInputTypes
    }
  };
}
/**
 * @param {GlobalConfig} globalConfig
 * @returns {{success: import('../__generated__/validators-ts').AvailableInputTypes}}
 */


function androidSpecificAvailableInputTypes(globalConfig) {
  if (!globalConfig.availableInputTypes) {
    throw new Error('globalConfig.availableInputTypes not supported yet on Android');
  }

  return {
    success: globalConfig.availableInputTypes
  };
}

},{"../../../packages/device-api/index.js":6,"../__generated__/deviceApiCalls.js":59}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AppleTransport = void 0;

var _contentScopeUtils = require("@duckduckgo/content-scope-utils");

var _index = require("../../../packages/device-api/index.js");

var _deviceApiCalls = require("../__generated__/deviceApiCalls.js");

class AppleTransport extends _index.DeviceApiTransport {
  /** @param {GlobalConfig} globalConfig */
  constructor(globalConfig) {
    super();
    this.config = globalConfig;
    const webkitConfig = new _contentScopeUtils.WebkitMessagingConfig({
      hasModernWebkitAPI: this.config.hasModernWebkitAPI,
      webkitMessageHandlerNames: this.config.webkitMessageHandlerNames,
      secret: this.config.secret
    });
    this.messaging = new _contentScopeUtils.Messaging(webkitConfig);
  }

  async send(deviceApiCall) {
    try {
      // if the call has an `id`, it means that it expects a response
      if (deviceApiCall.id) {
        return await this.messaging.request(deviceApiCall.method, deviceApiCall.params || undefined);
      } else {
        return this.messaging.notify(deviceApiCall.method, deviceApiCall.params || undefined);
      }
    } catch (e) {
      if (e instanceof _contentScopeUtils.MissingHandler) {
        if (this.config.isDDGTestMode) {
          console.log('MissingWebkitHandler error for:', deviceApiCall.method);
        }

        if (deviceApiCall instanceof _deviceApiCalls.GetRuntimeConfigurationCall) {
          return deviceApiCall.result(appleSpecificRuntimeConfiguration(this.config));
        }

        throw new Error('unimplemented handler: ' + deviceApiCall.method);
      } else {
        throw e;
      }
    }
  }

}
/**
 * @param {GlobalConfig} globalConfig
 * @returns {ReturnType<GetRuntimeConfigurationCall['result']>}
 */


exports.AppleTransport = AppleTransport;

function appleSpecificRuntimeConfiguration(globalConfig) {
  return {
    success: {
      // @ts-ignore
      contentScope: globalConfig.contentScope,
      // @ts-ignore
      userPreferences: globalConfig.userPreferences,
      // @ts-ignore
      userUnprotectedDomains: globalConfig.userUnprotectedDomains,
      // @ts-ignore
      availableInputTypes: globalConfig.availableInputTypes
    }
  };
}

},{"../../../packages/device-api/index.js":6,"../__generated__/deviceApiCalls.js":59,"@duckduckgo/content-scope-utils":2}],64:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ExtensionTransport = void 0;

var _index = require("../../../packages/device-api/index.js");

var _deviceApiCalls = require("../__generated__/deviceApiCalls.js");

var _autofillUtils = require("../../autofill-utils.js");

var _Settings = require("../../Settings.js");

class ExtensionTransport extends _index.DeviceApiTransport {
  /** @param {GlobalConfig} globalConfig */
  constructor(globalConfig) {
    super();
    this.config = globalConfig;
  }

  async send(deviceApiCall) {
    if (deviceApiCall instanceof _deviceApiCalls.GetRuntimeConfigurationCall) {
      return deviceApiCall.result(await extensionSpecificRuntimeConfiguration(this));
    }

    if (deviceApiCall instanceof _deviceApiCalls.GetAvailableInputTypesCall) {
      return deviceApiCall.result(await extensionSpecificGetAvailableInputTypes());
    }

    if (deviceApiCall instanceof _deviceApiCalls.SetIncontextSignupPermanentlyDismissedAtCall) {
      return deviceApiCall.result(await extensionSpecificSetIncontextSignupPermanentlyDismissedAtCall(deviceApiCall.params));
    }

    if (deviceApiCall instanceof _deviceApiCalls.GetIncontextSignupDismissedAtCall) {
      return deviceApiCall.result(await extensionSpecificGetIncontextSignupDismissedAt());
    } // TODO: unify all calls to use deviceApiCall.method instead of all these if blocks


    if (deviceApiCall instanceof _deviceApiCalls.SendJSPixelCall) {
      return deviceApiCall.result(await extensionSpecificSendPixel(deviceApiCall.params));
    }

    if (deviceApiCall instanceof _deviceApiCalls.AddDebugFlagCall) {
      return deviceApiCall.result(await extensionSpecificAddDebugFlag(deviceApiCall.params));
    }

    if (deviceApiCall instanceof _deviceApiCalls.CloseAutofillParentCall || deviceApiCall instanceof _deviceApiCalls.StartEmailProtectionSignupCall) {
      return; // noop
    }

    console.error('Send not implemented for ' + deviceApiCall.method);
  }

}
/**
 * @param {ExtensionTransport} deviceApi
 * @returns {Promise<ReturnType<GetRuntimeConfigurationCall['result']>>}
 */


exports.ExtensionTransport = ExtensionTransport;

async function extensionSpecificRuntimeConfiguration(deviceApi) {
  var _deviceApi$config;

  const contentScope = await getContentScopeConfig();
  const emailProtectionEnabled = (0, _autofillUtils.isAutofillEnabledFromProcessedConfig)(contentScope);
  const incontextSignupEnabled = (0, _autofillUtils.isIncontextSignupEnabledFromProcessedConfig)(contentScope);
  return {
    success: {
      // @ts-ignore
      contentScope: contentScope,
      // @ts-ignore
      userPreferences: {
        features: {
          autofill: {
            settings: {
              featureToggles: { ..._Settings.Settings.defaults.featureToggles,
                emailProtection: emailProtectionEnabled,
                emailProtection_incontext_signup: incontextSignupEnabled
              }
            }
          }
        }
      },
      // @ts-ignore
      userUnprotectedDomains: (_deviceApi$config = deviceApi.config) === null || _deviceApi$config === void 0 ? void 0 : _deviceApi$config.userUnprotectedDomains
    }
  };
}

async function extensionSpecificGetAvailableInputTypes() {
  const contentScope = await getContentScopeConfig();
  const emailProtectionEnabled = (0, _autofillUtils.isAutofillEnabledFromProcessedConfig)(contentScope);
  return {
    success: { ..._Settings.Settings.defaults.availableInputTypes,
      email: emailProtectionEnabled
    }
  };
}

async function getContentScopeConfig() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({
      registeredTempAutofillContentScript: true,
      documentUrl: window.location.href
    }, response => {
      if (response && 'site' in response) {
        resolve(response);
      }
    });
  });
}
/**
 * @param {import('../__generated__/validators-ts').SendJSPixelParams} params
 */


async function extensionSpecificSendPixel(params) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({
      messageType: 'sendJSPixel',
      options: params
    }, () => {
      resolve(true);
    });
  });
}
/**
 * @param {import('../__generated__/validators-ts').AddDebugFlagParams} params
 */


async function extensionSpecificAddDebugFlag(params) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({
      messageType: 'addDebugFlag',
      options: params
    }, () => {
      resolve(true);
    });
  });
}

async function extensionSpecificGetIncontextSignupDismissedAt() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({
      messageType: 'getIncontextSignupDismissedAt'
    }, response => {
      resolve(response);
    });
  });
}
/**
 * @param {import('../__generated__/validators-ts').SetIncontextSignupPermanentlyDismissedAt} params
 */


async function extensionSpecificSetIncontextSignupPermanentlyDismissedAtCall(params) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({
      messageType: 'setIncontextSignupPermanentlyDismissedAt',
      options: params
    }, () => {
      resolve(true);
    });
  });
}

},{"../../../packages/device-api/index.js":6,"../../Settings.js":44,"../../autofill-utils.js":55,"../__generated__/deviceApiCalls.js":59}],65:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createTransport = createTransport;

var _appleTransport = require("./apple.transport.js");

var _androidTransport = require("./android.transport.js");

var _extensionTransport = require("./extension.transport.js");

var _windowsTransport = require("./windows.transport.js");

/**
 * @param {GlobalConfig} globalConfig
 * @returns {import("../../../packages/device-api").DeviceApiTransport}
 */
function createTransport(globalConfig) {
  var _globalConfig$userPre, _globalConfig$userPre2, _globalConfig$userPre3, _globalConfig$userPre4;

  if (typeof ((_globalConfig$userPre = globalConfig.userPreferences) === null || _globalConfig$userPre === void 0 ? void 0 : (_globalConfig$userPre2 = _globalConfig$userPre.platform) === null || _globalConfig$userPre2 === void 0 ? void 0 : _globalConfig$userPre2.name) === 'string') {
    switch ((_globalConfig$userPre3 = globalConfig.userPreferences) === null || _globalConfig$userPre3 === void 0 ? void 0 : (_globalConfig$userPre4 = _globalConfig$userPre3.platform) === null || _globalConfig$userPre4 === void 0 ? void 0 : _globalConfig$userPre4.name) {
      case 'ios':
      case 'macos':
        return new _appleTransport.AppleTransport(globalConfig);

      case 'android':
        return new _androidTransport.AndroidTransport(globalConfig);

      default:
        throw new Error('selectSender unimplemented!');
    }
  }

  if (globalConfig.isWindows) {
    return new _windowsTransport.WindowsTransport();
  } // fallback for when `globalConfig.userPreferences.platform.name` is absent


  if (globalConfig.isDDGApp) {
    if (globalConfig.isAndroid) {
      return new _androidTransport.AndroidTransport(globalConfig);
    }

    throw new Error('unreachable, createTransport');
  } // falls back to extension... is this still the best way to determine this?


  return new _extensionTransport.ExtensionTransport(globalConfig);
}

},{"./android.transport.js":62,"./apple.transport.js":63,"./extension.transport.js":64,"./windows.transport.js":66}],66:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WindowsTransport = void 0;

var _index = require("../../../packages/device-api/index.js");

/**
 * @typedef {import('../../../packages/device-api/lib/device-api').CallOptions} CallOptions
 * @typedef {import("../../../packages/device-api").DeviceApiCall} DeviceApiCall
 */
class WindowsTransport extends _index.DeviceApiTransport {
  async send(deviceApiCall, options) {
    if (deviceApiCall.id) {
      return windowsTransport(deviceApiCall, options).withResponse(deviceApiCall.id);
    }

    return windowsTransport(deviceApiCall, options);
  }

}
/**
 * @param {DeviceApiCall} deviceApiCall
 * @param {CallOptions} [options]
 */


exports.WindowsTransport = WindowsTransport;

function windowsTransport(deviceApiCall, options) {
  windowsInteropPostMessage({
    Feature: 'Autofill',
    Name: deviceApiCall.method,
    Data: deviceApiCall.params
  });
  return {
    /**
     * Sends a message and returns a Promise that resolves with the response
     * @param responseId
     * @returns {Promise<*>}
     */
    withResponse(responseId) {
      return waitForWindowsResponse(responseId, options);
    }

  };
}
/**
 * @param {string} responseId
 * @param {CallOptions} [options]
 * @returns {Promise<any>}
 */


function waitForWindowsResponse(responseId, options) {
  return new Promise((resolve, reject) => {
    var _options$signal, _options$signal2;

    // if already aborted, reject immediately
    if (options !== null && options !== void 0 && (_options$signal = options.signal) !== null && _options$signal !== void 0 && _options$signal.aborted) {
      return reject(new DOMException('Aborted', 'AbortError'));
    }

    let teardown; // The event handler

    const handler = event => {
      // console.log(`📩 windows, ${window.location.href}`, [event.origin, JSON.stringify(event.data)])
      if (!event.data) {
        console.warn('data absent from message');
        return;
      }

      if (event.data.type === responseId) {
        teardown();
        resolve(event.data);
      }
    }; // what to do if this promise is aborted


    const abortHandler = () => {
      teardown();
      reject(new DOMException('Aborted', 'AbortError'));
    }; // setup


    windowsInteropAddEventListener('message', handler);
    options === null || options === void 0 ? void 0 : (_options$signal2 = options.signal) === null || _options$signal2 === void 0 ? void 0 : _options$signal2.addEventListener('abort', abortHandler);

    teardown = () => {
      var _options$signal3;

      windowsInteropRemoveEventListener('message', handler);
      options === null || options === void 0 ? void 0 : (_options$signal3 = options.signal) === null || _options$signal3 === void 0 ? void 0 : _options$signal3.removeEventListener('abort', abortHandler);
    };
  });
}

},{"../../../packages/device-api/index.js":6}],67:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/*!
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/*
 * @see https://developers.google.com/web/updates/2015/08/using-requestidlecallback
 */
// @ts-ignore
window.requestIdleCallback = window.requestIdleCallback || function (cb) {
  return setTimeout(function () {
    const start = Date.now(); // eslint-disable-next-line standard/no-callback-literal

    cb({
      didTimeout: false,
      timeRemaining: function () {
        return Math.max(0, 50 - (Date.now() - start));
      }
    });
  }, 1);
};

window.cancelIdleCallback = window.cancelIdleCallback || function (id) {
  clearTimeout(id);
};

var _default = {};
exports.default = _default;

},{}]},{},[56]);
