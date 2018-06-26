[![Build status](https://img.shields.io/travis/ibm-garage/node-garage-utils/master.svg)](https://travis-ci.org/ibm-garage/node-garage-utils)
[![Coverage status](https://img.shields.io/coveralls/ibm-garage/node-garage-utils.svg)](https://coveralls.io/github/ibm-garage/node-garage-utils?branch=master)
[![Code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

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
const { appEnv } = require("garage-utils");
```

Provides information about the running application. In most cases, you should not change these
values, though doing so can be useful occasionally to simulate a different environment for testing
purposes. In these cases, calling reset() returns them all to their default values.

#### appEnv.rootDir

The root directory of the application.

#### appEnv.mainFile

The full pathname of the application's entry point -- the file that was originally run, not
included.

#### appEnv.version

The version of the application, as read from the `package.json` file in the application's root
directory (undefined if there is no version or no `package.json` file at all).

#### appEnv.isSpec()

Returns true when running under the Mocha test runner, false otherwise.

#### appEnv.isScript()

Returns true when running as a script or binary (in `scripts` or `bin`, under the application root
directory or within the garage-utils module).

#### appEnv.env

The running environment of the application. This can be one of the following four built-in values,
or any desired custom value:

- "unit" for unit testing
- "dev" for development
- "test" for integration testing and deployment to test environments
- "prod" for production deployment.

Though the NODE_ENV environment variable is a handy mechanism, it's not sufficient to account for
all the key environments. In particular, there's no accounting for a test environment, which should
serve bundled client code but produce more verbose logging and error messages on the server.

By default, the utility detects when running under Mocha (i.e. when `appEnv.isSpec()` returns true)
and reports "unit" in that case. Otherwise, the value is either "prod" or "dev", depending on
whether the NODE_ENV environment variable is "production" or something else (or undefined). This
aligns with the way Express interprets that environment variable.

It is also possible to set a GAPP_ENV environment variable to one of "unit", "dev", "test", or
"prod", or to any custom value, to override these defaults. Note that setting GAPP_ENV is the only
way to get a test environment. You should definitely do this when using Mocha to run integration
tests; otherwise, they will be mistaken for unit tests.

The following four functions are also provided to more easily test for a particular environment,
avoiding the need for string comparisons.

#### appEnv.isUnit()

Returns true when `appEnv.env` is "unit", false otherwise.

#### appEnv.isDev()

Returns true when `appEnv.env` is "dev", false otherwise.

#### appEnv.isTest()

Returns true when `appEnv.env` is "test", false otherwise.

#### appEnv.isProd()

Returns true when `appEnv.env` is "prod", false otherwise.

#### appEnv.reset()

Resets `appEnv.rootDir`, `appEnv.mainFile`, and `appEnv.env` to their default values.

### Time

```
const { time } = require("garage-utils");
```

Higher-level time handling functions based on [Moment.js](https://momentjs.com/).

#### time.parseUnixTime(millis)

Creates a moment from the given UNIX time (milliseconds since the Epoch). If the UNIX time is not
an integer, it will be converted if possible. Returns a UTC moment, or undefined for invalid input.

#### time.parseIso(isoDateTime)

Strictly parses an ISO 8601 date-time string that must specify a UTC offset (or Z). Returns a
moment, or undefined if the date is invalid or doesn"t have a UTC offset. The moment has the
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
const { errors } = require("garage-utils");
```

Creates errors that are easily translated into HTTP responses.

#### errors.error(status, message, [detail], [cause])

Creates a new `Error` instance with a status code, a message formed from the specified message and
detail (if truthy), and a nested cause (usually another error).

```
const err = errors.errror(500, "Internal server error", "Failure in underlying service", caughtErr);
winston.error(err);
res.status(err.status).send(err.message);
```

#### errors.badRequest([detail], [cause])

Creates a 400 Bad request error, with optional detail and cause.

#### errors.unauthorized([cause])

Creates a 401 Unauthorized error, with optional cause.

#### errors.forbidden([detail], [cause])

Creates a 403 Forbidden error, with optional detail and cause.

#### errors.notFound([cause])

Creates a 404 Not found error, with optional cause.

#### errors.methodNotAllowed([cause])

Creates a 405 Method not allowed error, with optional cause.

#### errors.conflict([detail], [cause])

Creates a 409 Conflict error, with optional detail and cause.

#### errors.internalServerError([cause])

Creates a 500 Internal server error, with optional cause.

#### errors.responseBody(error)

Returns an object that may be used as a JSON response body for the given error.

#### errors.stackWithCause(error)

Returns a string combining the stack traces for the given error and up to 4 levels of nested
causes.

### Logger

```
const { logger } = require("garage-utils");
```

Logging support based on [Bunyan](https://github.com/trentm/node-bunyan). Accessing `logger` yields
a Bunyan logger that is automatically preconfigured for the current environment (testing, scripting,
or application runtime) and enhanced with a couple of extra functions.

You can use the logging functions described here for all error, status, and debugging information,
and it will be handled appropriately for the context in which the code runs.

#### Levels

| Level | Value | Description                                                            |
| ----- | ----- | ---------------------------------------------------------------------- |
| trace | 10    | Entries from external libraries and most verbose application logging.  |
| debug | 20    | Detailed entries for isolating problems in the code.                   |
| info  | 30    | Information on regular operation.                                      |
| warn  | 40    | Unexpected conditions that should probably be investigated eventually. |
| error | 50    | Failures that prevent a request or an action from completing.          |
| fatal | 60    | Fatal errors that result in the application being terminated.          |

By default, applications in all environments log to stdout at level "info" and above. Logged entries
are emitted as single-line JSON objects for easy collection, indexing, and searching. If you wish to
watch logs from a single instance in real time (such as when running locally during development),
you can pipe stdout to the `bunyan` [CLI tool](https://github.com/trentm/node-bunyan#cli-usage) for filtering and pretty-printing.

Automated tests (specs) log at level "trace" and above to a `test.log` file, plus levels "warn" and
above to stderr. This prevents expected log output from messing up the test reports. Scripts log to
stderr at level "warn" and above by default.

For specs and scripts, logging to stderr is internally pretty-printed via the special
[bunyan-prettystream-circularsafe](https://www.npmjs.com/package/bunyan-prettystream-circularsafe)
stream implementation.

In all cases, the default logging level can be overridden via a `LOG_LEVEL` environment variable
and set dynamically by the application using Bunyan's `logger.level()` and `logger.levels()`
functions.

#### logger.level([level])

_Bunyan function_: Sets the lowest logging level to be the specified level name (lowercase string)
or numeric value. If no level is specified, returns the numeric value of the current level.

#### logger.levels(stream, [level])

_Bunyan function_: Sets the logging level for a particular stream, identified by name or index. If
no level is specified, returns the current level.

#### logger.trace([fields|err], [message], [...args])

_Bunyan function_: Logs an entry at level trace.

Bunyan is flexible about how the entry is specified. You can specify an object with custom fields
(or just an `Error`), as well a message, optionally with data that is formatted in with
`util.format()`. See the [Bunyan docs](https://github.com/trentm/node-bunyan#log-method-api) for
all the different possibilities.

#### logger.debug([fields|err], [message], [...args])

_Bunyan function_: Logs an entry at level debug.

#### logger.info([fields|err], [message], [...args])

_Bunyan function_: Logs an entry at level info.

#### logger.warn([fields|err], [message], [...args])

_Bunyan function_: Logs an entry at level warn.

#### logger.error([fields|err], [message], [...args])

_Bunyan function_: Logs an entry at level error.

#### logger.fatal([fields|err], [message], [...args])

_Bunyan function_: Logs an entry at level fatal.

#### logger.child([options], [simple])

_Bunyan function_: Creates and returns a child logger, usually for logging in a particular context
where certain fields should be bound to the same values.. The child is backed by its parent's
logging mechanisms (level, serializers, and streams) by default.

For the usual case of binding fields, pass the fields and values in the options argument, and
specify true for simple. Or, you can override configuration by specifying other options along
with false for simple. See the [Bunyan docs](https://github.com/trentm/node-bunyan#logchild) for
more information.

#### logger.expressLogger(options)

Returns an Express middleware function that creates a child logger for each request and uses it to
log the request and response. This middleware is best used with (and after)
[express-request-id](https://www.npmjs.com/package/express-request-id), which generates a unique
ID for each requests and stores it as `request.id`.

If that ID is availabile, the child logger binds it to `req_id` for all entries logged. The logger
is made available as `request.logger` for further use while handling the request.

The recognized options:

- **parentLogger**: The parent for middleware-created loggers. Default: the default `logger`
  instance.
- **reqLevel**: The level at which to log requests. One of the 6 recognized level names, or false
  to disable request logging. Default: "info".
- **resLevel**: The level at which to log responses. One of the 6 recognized level names, or false
  to disable response logging. Default: "info".

#### logger.suppressSpecErr(suppress)

In a spec definition, suppresses or reenables logging to stderr (at level "warning" and above),
according to whether or not suppress is truthy. This can be used to prevent expected warnings,
errors, and fatal errors from messing up test reports.

Under the covers, this adjusts the logging level of the stream writing to stderr. So, manually
changing that level with `logger.levels()` or the overall level with `logger.level()` may disrupt
this. After doing so, you can call `logger.suppressSpecErr()` again to fix the logging level of
the stderr stream.

**Note**: This function is only available on `logger` in a spec context. _Do not use in application
code, as it will throw a `TypeError`._

### Cloud Foundry

```
const { cf } = require("garage-utils");
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
_not_ be committed to source control.

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
