[![Build status](https://img.shields.io/travis/ibm-garage/node-garage-utils/master.svg)](https://travis-ci.org/ibm-garage/node-garage-utils)
[![Coverage status](https://img.shields.io/coveralls/ibm-garage/node-garage-utils.svg)](https://coveralls.io/github/ibm-garage/node-garage-utils?branch=master)
[![Code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

# Garage Utilities for Node

This module provides common APIs and CLI utilities for Node.js/Express applications at the IBM
Cloud Garage.

It requires Node.js 8.0.0 or later.

## Installation

```
npm install garage-utils
```

**Note:** Starting in npm 5.0.0 (which ships with Node 8.0.0), installed packages are saved by
default, so you no longer need to use the `--save` option.

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

#### appEnv.env

The running environment of the application. If the `NODE_ENV` environment variable is set, this
takes its value directly. The following values are common:

- "development" for development environments
- "production" for production deployment
- "test" for automated testing
- "script" for CLI or interactive scripts.

For other non-production environments, such as QA or staging, it is usual simply to leave `NODE_ENV`
unset and treat them as the default. Other, custom values are allowed, as well.

If `NODE_ENV` is not set (or is set to an empty value), then `appEnv.env` is usually left undefined,
except when a value is automatically assigned in two special circumstances:

1.  "test" when running under Mocha (i.e. when `appEnv.mainFile`'s last segment is `_mocha`).

1.  "script" when running as a script or binary (i.e. when the path of `appEnv.mainFile` is
    `scripts` or `bin`, under the application root directory or within the garage-utils module).

[Jest](https://jestjs.io/en/) automatically sets `NODE_ENV` to "test", and the special handling for
[Mocha](https://mochajs.org/) attempts to give a similar experience in that testing environment.
This is used by the `logger` API in garage-utils to automatically configure itself for testing in a
Mocha environment. However, other tools. such as [config](https://www.npmjs.com/package/config),
check the value of `NODE_ENV` directly, and they will not see a value of "test" under Mocha unless you set the environment variable yourself.

The following four functions are also provided to easily test for the above common environments.

#### appEnv.isDev()

Returns true if `appEnv.env` is "development", false otherwise.

#### appEnv.isProd()

Returns true if `appEnv.env` is "production", false otherwise.

#### appEnv.isTest()

Returns true if `appEnv.env` is "test", false otherwise.

#### appEnv.isScript()

Returns true if `appEnv.env` is "script", false otherwise.

#### appEnv.reset()

Resets `appEnv.rootDir`, `appEnv.mainFile`, and `appEnv.env` to their computed values, if any of
them have been changed.

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
- **childOptions**: Additional options for child loggers. Default: `{}`.
- **childSimple**: Whether to create simple child loggers. Default: true. Specify false if you have
  specified any childOptions that are not just additional properties to bind (e.g. to use custom
  level, streams, or serializers).
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

#### logger.createSerializer(options)

A helper function that simplifies creating a custom Bunyan
[serializer](https://github.com/trentm/node-bunyan#serializers). The recognized options:

- **testProp**: A property to test to recognize handled objects. If the property is undefined or
  null in an input object, the serializer will simply return the object unchanged. This option is
  required.
- **includeProps**: An array of properties that the serializer should copy from the input object
  to the output JSONable object. If any of the properties are undefined in an input object, they
  will be excluded from the output. If any of them have an object or array as their value, they
  will be copied deeply in JSON style (i.e. by own, enumerable properties). Default: `[testProp]`.
- **computeProps**: An object mapping properties to functions that compute property values. For a
  given input object, each function will be called with the input object as argument and the
  result, if not undefined, will be included as a property of the output JSONable object. Any
  object or array results will be copied deeply in JSON style. Default: `{}`.
- **redactProps**: An array of properties that should be redacted during deep copying. If any
  matching property is encountered, "\*\*\*\*\*" will be included, instead of the actual value.
  Note that redaction is not applied to the included or computed props themselves, but only to
  properties nested directly or indirectly under them. Default: `[]`.

### Cloud Foundry

```
const { cf } = require("garage-utils");
```

Augments [cfenv](https://github.com/cloudfoundry-community/node-cfenv) to parse and interpret
Cloud Foundry-provided environment variables, with additional functions for querying service
credentials.

#### cf.cfEnv(options)

Returns the core bits of Clound Foundry data.

This function is equivalent to `getAppEnv()` in cfenv, and the result has all of the properties
detailed in the cfenv docs, plus some extras described here. The reason for the different name is
to avoid confusion, since garage-utils already has an `appEnv`.

All of the options provided by `getAppEnv()` are supported here, as well.

In previous releases, this function automatically read a `services.json` file if no `VCAP_SERVICES`
environment variable was defined, which was useful when running a server locally in your
development environment. As of version 4.0.0 of garage-utils, that functionality has been removed.
Instead, you should take care to initialize `VCAP_SERVICES` in the development environment. The
`cfutil` CLI can assist with that (see the `env` command below).

It is also recommended that you set the `PORT` environment variable in the development environment,
so as to ensure that the server runs on the same port for everyone. Otherwise, this implementation
will use [ports](https://www.npmjs.com/package/ports) to assign an arbitrary port, which can vary
across different people's environments.

The object returned by `cfEnv()` is augmented with two additional functions:

##### cfEnv.getServiceCredsByLabel(labelSpec, required)

Returns the credentials object of a service by label (i.e. by the name of the service, not the name
of the service instance). The labelSpec can be either a regular expression or a string (in which
case it must match exactly). If there are multiple instances of the matched service, this function
throws an error, and you should use `getServiceCredsByName()`, instead. Note, however, that if the
labelSpec is a regular expression that matches more than one service label, the instance of the
first service will be returned.

If no service is found with the specified spec, this function returns null by default, or throws
an error if required is true.

##### cfEnv.getServiceCredsByName(nameSpec, required)

Returns the credentials object of a service by name (i.e. by instance name). This works just like
`cfEnv.getServiceCreds()` if required is false. If it is true, this function throws an error if no
service is found.

## CLI Utilities

CLI utilities are published through the garage-utils npm package, so they can be invoked directly
from an npm run script, or from the command line if the package is installed globally. Usually, you
will use `npx` to run them from a project with a dependency on garage-utils.

### CF Util

```
$ npx cfutil -h
$ npx cfutil env -h
$ npx cfutil logs -h
```

### env

Saves information about the enviroment of a Cloud Foundry app to a file that can be used to
replicate (or partially replicate) that environment when running locally.

```
$ npx cfutil env my-app
```

By default, a `.env` file is created, defining just the `VCAP_SERVICES` environment variable read
from the specified app. You can also opt to include user-provided environment variables with the
`-u` option. You can source this file before running locally to set up the environment. This is
also the same file format consumed by [dotenv](https://www.npmjs.com/package/dotenv), though its
use is not recommended because it adds complexity and runtime dependencies.

Alternatively, with the `-j` option, a `services.json` file can be created, containing just the
formatted JSON content of `VCAP_SERVICES`. The advantage of this approach is that the file is
easier to read and edit. The disadvantage is that multiple environment variables cannot be defined.

Whether you opt for a `.env` or `services.json` file, you can also use the `-s` option to generate
a tiny `env.sh` script that will consume it at run time. For example, you might define an npm run
script like this:

```
"start:local": ". env.sh && node server/server.js | bunyan",
```

Here, sourcing `env.sh` adds the variables defined in `.env` or `services.json` to the environment.
Piping to `bunyan` is unrelated but recommended, assuming you are using the Bunyan-based `logger`
API.

Use the `-h` option to see all options supported by the `env` command.

## logs

Tails or shows recent logs for a Cloud Foundry app, trimming the content added by Loggregator from
JSON messages to allow for formatting by the Bunyan CLI. This command takes the place of `cf logs`
when you are using the Bunyan-based `logger` API.

```
$ npx cfutil logs my-app | npx bunyan
```

By default, Loggregator content is removed from JSON messages. All other messages pass through
unchanged (except for the trimming of leading whitespace), and then pass through Bunyan as well.
Non-application and non-JSON messages can be excluded completely with the `-a` and `-j` options,
respectively.

Use the `-h` option to see all options supported by the `logs` command.

## License

This module is licensed under the MIT License. The full text is available in [LICENSE](LICENSE).
