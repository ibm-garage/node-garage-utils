# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
