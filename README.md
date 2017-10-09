[![Build Status](https://img.shields.io/travis/ibm-garage/node-garage-utils/master.svg)](https://travis-ci.org/ibm-garage/node-garage-utils)
[![Coverage Status](https://img.shields.io/coveralls/ibm-garage/node-garage-utils.svg)](https://coveralls.io/github/ibm-garage/node-garage-utils?branch=master)

# Garage Utilities for Node

This module provides a number of common utilities for Node/Express applications at the IBM Cloud
Garage.

## Installation

```
npm install garage-utils
```

**Note:** Older versions of npm (before 5.0) do not save installed packages by default, so you will
probably want to add the `--save` option there.

## APIs

### Application Environment

```
const { appEnv } = require('garage-utils');
```

Provides information about the running application. In most cases, you should not change these
values, though doing so can be useful occasionally to simulate a different environment for testing
purposes. In these cases, calling reset() returns them all to their default values.

#### appEnv.rootDir

The root directory of the application.

#### appEnv.mainFile

The full pathname of the application's entry point -- the file that was originally run, not
included.

#### appEnv.isSpec()

Returns true when running under the Mocha test runner, false otherwise.

#### appEnv.env

The running environment of the application. This can be one of the following four built-in values,
or any desired custom value:

- 'unit' for unit testing
- 'dev' for development
- 'test' for integration testing and deployment to test environments
- 'prod' for production deployment.

Though the NODE_ENV environment variable is a handy mechanism, it's not sufficient to account for
all the key environments. In particular, there's no accounting for a test environment, which should
serve bundled client code but produce more verbose logging and error messages on the server.

By default, the utility detects when running under Mocha (i.e. when `appEnv.isSpec()` returns true)
and reports 'unit' in that case. Otherwise, the value is either 'prod' or 'dev', depending on
whether the NODE_ENV environment variable is 'production' or something else (or undefined). This
aligns with the way Express interprets that environment variable.

It is also possible to set a GAPP_ENV environment variable to one of 'unit', 'dev', 'test', or
'prod', or to any custom value, to override these defaults. Note that setting GAPP_ENV is the only
way to get a test environment. You should definitely do this when using Mocha to run integration
tests; otherwise, they will be mistaken for unit tests.

The following four functions are also provided to more easily test for a particular environment,
avoiding the need for string comparisons.

#### appEnv.isUnit()

Returns true when `appEnv.env` is 'unit', false otherwise.

#### appEnv.isDev()

Returns true when `appEnv.env` is 'dev', false otherwise.

#### appEnv.isTest()

Returns true when `appEnv.env` is 'test', false otherwise.

#### appEnv.isProd()

Returns true when `appEnv.env` is 'prod', false otherwise.

#### appEnv.reset()

Resets `appEnv.rootDir`, `appEnv.mainFile`, and `appEnv.env` to their default values.


### Time

```
const { time } = require('garage-utils');
```

Higher-level time handling functions based on [Moment.js](https://momentjs.com/).

#### time.parseUnixTime(millis)

Creates a moment from the given UNIX time (milliseconds since the Epoch). If the UNIX time is not
an integer, it will be converted if possible. Returns a UTC moment, or undefined for invalid input.

#### time.parseIso(isoDateTime)

Strictly parses an ISO 8601 date-time string that must specify a UTC offset (or Z). Returns a
moment, or undefined if the date is invalid or doesn't have a UTC offset. The moment has the
UTC offset specified in the string by default. You can use `utc()` or `local()` to shift to
UTC or local time.

#### time.isIsoUtc(dateTime)

Returns true for an ISO 8601 date-time string with a zero UTC offset, false otherwise.

#### time.formatIsoUtc(m)

Converts a moment to an ISO 8601 date-time string with a 0 UTC offset (Z).

#### time.nowIsoUtc()

Returns the current time as an ISO 8601 date-time string with a 0 UTC offset (Z).


### Errors

```
const { errors } = require('garage-utils');
```

Creates errors that are easily translated into HTTP responses.

#### errors.error(status, message, detail, cause)

Creates a new `Error` instance with a status code, a message formed from the specified message and
detail (if truthy), and a nested cause (usually another error).

```
const err = errors.errror(500, 'Internal server error', 'Failure in underlying service', caughtErr);
winston.error(err);
res.status(err.status).send(err.message);
```

#### errors.badRequest(detail, cause)

Creates a 400 Bad request error, with optional detail and cause.

#### errors.unauthorized(cause)

Creates a 401 Unauthorized error, with optional cause.

#### errors.notFound(cause)

Creates a 404 Not found error, with optional cause.

#### errors.methodNotAllowed(cause)

Creates a 405 Method not allowed error, with optional cause.

#### errors.conflict(detail, cause)

Creates a 409 Conflict error, with optional detail and cause.

#### errors.internalServerError(cause)

Creates a 500 Internal server error, with optional cause.

#### errors.responseBody(error)

Returns an object that may be used as a JSON response body for the given error.

#### errors.stackWithCause(error)

Returns a string combining the stack traces for the given error and up to 4 levels of nested
causes.


### Logger

```
const { logger } = require('garage-utils');
```

Logging support based on [log4js](https://github.com/nomiddlename/log4js-node) that is
automatically preconfigured for development, production, and testing environments.

#### Levels

| Level | Description |
| - | - |
| trace | The lowest-level messages that help you follow execution flow. |
| debug | Detailed messages for isolating problems in the code. |
| info | Occasional messages reporting task completion and status. |
| warn | Warning messages identifying when something goes wrong that doesn't result in an error. |
| error | Error messages for failures that prevent a request or an action from completing. |
| fatal | Fatal errors that result in the application being terminated. |

By default, applications in production log to stdout at level 'info' and above. Applications
running in other environments log to stdout at level 'debug' and above.

Automated tests (specs) log all levels to a `test.log` file, plus levels 'warn' and above to
stderr. This prevents expected log output from messing up the test reports.

#### logger.log(level, ...args)

Logs a message at the specified level.

The level may be one of 'trace', 'debug', 'info', 'warn', 'error', or 'fatal'. The message is
formed by passing the remaining arguments to
[`util.format()`](https://nodejs.org/api/util.html#util_util_format_format_args). So, you can pass
a single message, provide several objects to be inspected and concatenated, or do % placeholder
replacement. Errors are handled properly, too, logging the trace and additional data.

#### logger.trace(...args)

Logs a message at level 'trace'.

#### logger.debug(...args)

Logs a message at level 'debug'.

#### logger.info(...args)

Logs a message at level 'info'.

#### logger.warn(...args)

Logs a message at level 'warn'.

#### logger.error(...args)

Logs a message at level 'error'.

#### logger.fatal(...args)

Logs a message at level 'fatal'.

#### logger.setLevel([level])

Sets the minimium level to log. This should normally be called immediately upon starting an
application; however, it is safe to change the level at any point, as the application runs.

The level may be one of 'all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal', or 'off'. Note
that 'all' and 'trace' currently have the same effect. The only difference is that, if you specifiy
'all', any new, lower levels that might be added in the future would be included automatically.

If a level is not specified, logging resets to the default level for the environment.

#### logger.suppressSpecErr(suppress)

In a spec definition, suppresses or reenables logging to stderr (at level 'warning' and above),
according to whether or not suppress is truthy. This can be used to prevent expected warnings,
errors, and fatal errors from messing up test reports. **Note: Do not use in application code.**

#### logger.connectFormatter(options)

Returns a Connect/Express middleware function that logs requests and responses via the logger.

The recognized options are `level` (the level at which to log), `format` (the Connect logger
format), and `nolog` (an expression specifying which requests not to log). These options are more
fully described in the
[log4js documentation](https://nomiddlename.github.io/log4js-node/connect-logger.html). There are
reasonable default values for level ('debug') and format, so normally you won't need to provide
any options.


### Cloud Foundry

```
const { cf } = require('garage-utils');
```

Augments [cfenv](https://github.com/cloudfoundry-community/node-cfenv) to parse and interpret
Cloud Foundry-provided environment variables, with better fallback handling for running locally
and additional functions for querying service credentials.

#### cf.cfEnv()

Returns the core bits of Clound Foundry data. This is a singleton.

This function is equivalent to `getAppEnv()` in cfenv, and the result has all of the properties
detailed in the cfenv docs, plus some extras described here. The reason for the different name is
to avoid confusion, since garage-utils already has an `appEnv`.

If the `VCAP_SERVICES` environment variable is not defined, `cfEnv()` looks for a file named
`services.json` in the root directory of the application and, if it exists, uses it to populate the
services, instead.

Copying the contents of `VCAP_SERVICES` from a configured Cloud Foundry application into a
`services.json` file allows for running the application locally. **Note:** Such a file should
*not* be committed to source control.

The returned object is augmented with two additional functions:

##### cfEnv.getServiceCredsByLabel(labelSpec)

Returns the credentials object of a service by label (i.e. by the name of the service, not the name
of the service instance). The labelSpec can be either a regular expression or a string (in which
case it must match exactly). If no service is found, or if there are multiple instances of the
matched service, this function throws an error.

Note, however, that if the labelSpec is a regular expression that matches more than one service
label, the instance of the first service will be returned.

##### cfEnv.getServiceCredsByName(nameSpec)

Returns the credentials object of a service by name (i.e. by instance name). This works just like
`cfEnv.getServiceCreds(spec)`, except it throws an exception if no service is found.

## License

This module is licensed under the MIT License. The full text is available in [LICENSE](LICENSE).
