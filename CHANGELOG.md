# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="4.0.1"></a>
## [4.0.1](https://github.com/ibm-garage/node-garage-utils/compare/v4.0.0...v4.0.1) (2019-01-18)



<a name="4.0.0"></a>
# [4.0.0](https://github.com/ibm-garage/node-garage-utils/compare/v3.3.0...v4.0.0) (2019-01-07)


### Features

* **appEnv:** simplify env value computation and isDev(), isProd(), etc. functions, to more closely align with common Node conventions and work better with other tools ([a4f5b2d](https://github.com/ibm-garage/node-garage-utils/commit/a4f5b2d))
* **cf:** remove automatic services.json parsing in cfEnv(), make getServiceCredsByLabel() and getServiceCredsByName() not fail-fast by default ([421ecdd](https://github.com/ibm-garage/node-garage-utils/commit/421ecdd))
* **cfutil:** add logs command for Bunyan-friendly log streaming ([ca1e706](https://github.com/ibm-garage/node-garage-utils/commit/ca1e706))
* **cfutil:** new CLI utility for Cloud Foundry projects, with env command ([2b34f10](https://github.com/ibm-garage/node-garage-utils/commit/2b34f10))


### BREAKING CHANGES

* **appEnv:** appEnv.env special values are changed: "dev" -> "development", "prod" -> "production", "test" for all automated testing (replacing "unit" and some uses of "test"), "script" added; isSpec() and isUnit() functions are removed; GAPP_ENV is no longer used

Set NODE_ENV directly, instead of GAPP_ENV (which is now ignored). Use isTest() instead of isSpec() to detect any automated testing environment. Instead of trying to distinguish between unit and integration tests via
appEnv, simply set VCAP_SERVICES (for CF) or secrets (for Kube) differently.
* **cf:** cfEnv() no longer provides special handling for services when running in the dev environment; getServiceCredsByLabel() and getServiceCredsByName() now return null by default when no matching service is found

Developers must take care to set a VCAP_SERVICES environment variable in the dev environment or use the vcap or vcapFile option on cfEnv() to explicitly specify services. The former approach is recommended, and the new cfutil env command can help by generating a local artifact from an actual CF environment and a script that reads it.

To maintain the old error-throwing behavior of getServiceCredsByLabel() or getServiceCredsByName(), simply pass true as a second argument. Returning null by default allows for simpler client code in cases where the absence of a service can be tolerated (no try/catch required).



<a name="3.3.0"></a>
# [3.3.0](https://github.com/ibm-garage/node-garage-utils/compare/v3.2.0...v3.3.0) (2018-08-28)


### Features

* **appEnv:** detect isSpec() for Jest using recognized test filename conventions (.spec.js, _spec.js, .test.js, _test.js) ([2cebcfb](https://github.com/ibm-garage/node-garage-utils/commit/2cebcfb))



<a name="3.2.0"></a>
# [3.2.0](https://github.com/ibm-garage/node-garage-utils/compare/v3.1.0...v3.2.0) (2018-08-14)


### Features

* **logger:** automatically redact authorization headers; add expressLogger() options (childOptions and childSimple) and createSerializer() to support custom redaction (and other serializer customization) ([a99739c](https://github.com/ibm-garage/node-garage-utils/commit/a99739c))



<a name="3.1.0"></a>
# [3.1.0](https://github.com/ibm-garage/node-garage-utils/compare/v3.0.0...v3.1.0) (2018-06-26)


### Bug Fixes

* **logger:** fix missing bind() in expressLogger(), which prevented request and response logging ([e477f26](https://github.com/ibm-garage/node-garage-utils/commit/e477f26))


### Features

* **logger:** rename expressLogger() option baseLogger to parentLogger (maintaining support for the old name) ([b819fe3](https://github.com/ibm-garage/node-garage-utils/commit/b819fe3))



<a name="3.0.0"></a>
# [3.0.0](https://github.com/ibm-garage/node-garage-utils/compare/v2.2.0...v3.0.0) (2018-06-26)


### Features

* **logger:** switched logger to Bunyan implementation ([10f08a8](https://github.com/ibm-garage/node-garage-utils/commit/10f08a8))


### BREAKING CHANGES

* **logger:** minor changes to the logger API based on the underlying implementation: removed configure() and log(); replaced setLevel() -> logger.level() and connectLogger() -> expressLogger()

Clients must adopt the API changes, and should expect new logging output. Notably, applications will now log in JSON.



<a name="2.2.0"></a>
# [2.2.0](https://github.com/ibm-garage/node-garage-utils/compare/v2.1.0...v2.2.0) (2018-05-15)


### Features

* **appEnv:** add version (populated from package.json) ([e3b322a](https://github.com/ibm-garage/node-garage-utils/commit/e3b322a))



<a name="2.1.0"></a>
# [2.1.0](https://github.com/ibm-garage/node-garage-utils/compare/v2.0.1...v2.1.0) (2018-03-08)


### Features

* **errors:** add forbidden() to support status 403 ([797f3e1](https://github.com/ibm-garage/node-garage-utils/commit/797f3e1))
* **logger:** support specifying the logging level via a LOG_LEVEL environment variable ([d707041](https://github.com/ibm-garage/node-garage-utils/commit/d707041))



<a name="2.0.1"></a>
## [2.0.1](https://github.com/ibm-garage/node-garage-utils/compare/v2.0.0...v2.0.1) (2017-10-09)


First automated release.


<a name="2.0.0"></a>
# [2.0.0](https://github.com/ibm-garage/node-garage-utils/compare/v1.0.1...v2.0.0) (2017-10-09)


### Features

* **appEnv:** add isScript() to infer from main filename if running as a script ([0011237](https://github.com/ibm-garage/node-garage-utils/commit/0011237))
* **appEnv:** simplified and renamed appEnv API ([1ea144c](https://github.com/ibm-garage/node-garage-utils/commit/1ea144c))
* **logger:** add configure() support for type "app", which selects between localApp and cfApp automatically ([482db96](https://github.com/ibm-garage/node-garage-utils/commit/482db96))
* **logger:** add script support and configure() function to allow the application to specify its type ([304456f](https://github.com/ibm-garage/node-garage-utils/commit/304456f))
* **logger:** created new, simplified logger API backed by log4js to replace logging API ([1e2c70e](https://github.com/ibm-garage/node-garage-utils/commit/1e2c70e))


### BREAKING CHANGES

* **appEnv:** renamed app API to appEnv: app.config.* becomes appEnv.*, and cf.getAppEnv() becomes cf.cfEnv()

The appEnv name better reflects the intent and avoids naming conflicts with the express app. To avoid confusion, the singleton instance accessor in cf was also renamed, from getAppEnv() to cfEnv().
* **logger:** removed old logging API

Clients must move to the new logger API, and should remove direct usage of winston and morgan. The new API hides all the details of the underlying logging framework.


<a name="1.0.1"></a>
## [1.0.1](https://github.com/ibm-garage/node-garage-utils/compare/v1.0.0...v1.0.1) (2017-10-02)


### Bug Fixes

* **logging:** strip CRs from util.inspect() in formatter to work around bug in Node 6.4.0 ([bae653f](https://github.com/ibm-garage/node-garage-utils/commit/bae653f))
