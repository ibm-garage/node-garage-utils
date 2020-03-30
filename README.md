[![Build status](https://img.shields.io/travis/ibm-garage/node-garage-utils/master.svg)](https://travis-ci.org/ibm-garage/node-garage-utils)
[![Coverage status](https://img.shields.io/coveralls/ibm-garage/node-garage-utils.svg)](https://coveralls.io/github/ibm-garage/node-garage-utils?branch=master)
[![Code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

# Garage Utilities for Node

This module provides common APIs and CLI utilities for Node.js/Express applications at the IBM Garage.

It requires Node.js 10.13.0 (LTS Dubnium) or later.

## Contents

- [Installation](#installation)
- [APIs](#apis)
  - [Application Environment](#application-environment)
  - [Cloud Environment](#cloud-environment)
  - [Time](#time)
  - [Errors](#errors)
  - [Logger](#logger)
- [CLI Utilities](#cli-utilities)
  - [CF Util](#cf-util)
- [License](#license)

## Installation

```
npm install garage-utils
```

## APIs

### Application Environment

```
const { appEnv } = require("garage-utils");
```

Provides information about the running application. In most cases, you should not change these
values, though doing so can be useful occasionally to simulate a different environment for testing
purposes. In these cases, calling `reset()` returns them all to their default values.

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

### Cloud Environment

```
const { cloudEnv } = require("garage-utils");
```

Provides information about the cloud environment in which the application is running. This API
functions as a common abstraction for Cloud Foundry and Kubernetes environments in IBM Cloud. In
Kubernetes, you need to follow some containerization and deployment conventions to fully support
it.

This API is partially duplicative of [ibm-cloud-env](https://www.npmjs.com/package/ibm-cloud-env)
for retrieving service credentials, but it focuses on three specific cases: Cloud Foundry services
identified by label, Cloud Foundry services identified by name, and Kubernetes-bound services
exposed as environment variables. This limited scope results in an API that's simpler and safer to
use.

#### cloudEnv.platform

An identifier for the cloud platform. One of:

- "cf" for Cloud Foundry
- "kube" for Kubernetes (including OpenShift)
- undefined for neither.

The platform is identified by looking for an environment variable that is automatically set in that
environment (`VCAP_APPLICATION` for Cloud Foundry, `KUBERNETES_SERVICE_HOST` for Kubernetes).

#### cloudEnv.port

The port on which the application should listen for incoming connections. Usually, the cloud
platform handles TLS termination, and so the application need only handle HTTP connections on a
single port. The platform directs traffic to a particular port in the application's environment,
and sets the `PORT` environment variable to inform the application of what port that is. If this
environment variable is not set, `port` is 3000 by default.

This happens automatically on Cloud Foundry. On Kubernetes, you decide what port (or ports) from
the container to expose (in the `Dockerfile` and the Deployment/DeploymentConfig spec) and how to
map it to a service port (in the Service spec). You can either expose the default port 3000 or, if
you wish to expose a custom port, set a `PORT` environment variable to match in the
Deployment/DeploymentConfig.

#### cloudEnv.isCf()

Returns true if `cloudEnv.platform` is "cf", false otherwise.

#### cloudEnv.isKube()

Returns true if `cloudEnv.platform` is "kube", false otherwise.

#### cloudEnv.serviceCreds(specs, required)

Returns the credentials object of a service matching a given spec, or one of several given specs.
In its simplest form, a spec can be a string representing a name. When more flexibility is needed,
it can be specified as an object with particular properties.

On Cloud Foundry, services bound to the application are exposed to it via a single `VCAP_SERVICES`
environment variable. If that environment variable is defined, `serviceCreds()` attempts to locate
services within it based on the name and/or label from the spec. For example, to retrieve the
credentials for service named "myservice", regardless of its type (including user-provided):

```
const creds = cloudEnv.serviceCreds("myservice");
```

To retrieve the credentials for a single Cloudant service bound to the application:

```
const creds = cloudEnv.serviceCreds({ label: "cloudantNoSQLDB" });
```

Note that if multiple services of the specified label (i.e. type) are bound to the application, an
error will be thrown. To specify both the label and name:

```
const creds = cloudEnv.serviceCreds({ label: "cloudantNoSQLDB", name: "mycloudant" });
```

On Kubernetes or, more generally, in the absence of a `VCAP_SERVICES` environment variable,
`serviceCreds()` simply looks for the named environment variable and parses it as JSON to obtain
a credentials object. An error is thrown if the named environment variable is defined but its value
is not a JSON object.

On IBM Cloud, you can [bind](https://cloud.ibm.com/docs/containers?topic=containers-service-binding)
a service to a namespace in a Kubernetes cluster. This automatically defines a secret in that
namespace with the credentials object (keyed by "binding"). In this case, you can simply define an
environment variable with value from that secret in the Deployment/DeploymentConfig spec.
For example, for a bound service named "mycloudant":

```
env:
- name: CLOUDANT_CREDS
  valueFrom:
    secretKeyRef:
      name: binding-mycloudant
      key: binding
```

Then, you can retrieve the credentials like this:

```
const creds = cloudEnv.serviceCreds("CLOUDANT_CREDS");
```

In other Kubernetes environments, or for external services or services that are not bound to the
cluster, you will need to manually define the secret with the credentials as a JSON object, as
well. There are other ways to capture credentials in secrets and expose them within containers
in Kubernetes, but they are not explicitly supported by this utility.

You can explicitly request credentials from an environment variable, even in a Cloud Foundry
environment, by including a `type` of "env" in the spec:

```
const creds = cloudEnv.serviceCreds({ type: "env", name: "CLOUDANT_CREDS" });
```

You can also explicitly specify a `type` of "cf", which will cause the spec to be ignored in a
non-CF environment.

You can use this utility to make a single application flexible, allowing it to deploy in both Cloud
Foundry and Kubernetes environments -- though this is more useful for starters and demos than for
real applications. To do so, simply list multiple specs in an array:

```
const creds = cloudEnv.serviceCreds([{ label: "cloudantNoSQLDB" }, "CLOUDANT_CREDS"]);
```

As long as only one spec is satified in the environment, the correct credentials will be returned.
If more than one spec is satisfied, an error will be thrown instead. This is to help prevent
accidentally sending credentials to the wrong service in an ambiguously configured environment.

If no service is found that satisfies the given spec (or specs), this function returns undefined by
default, or throws an error if `required` is true.

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

Implementations of services that are exposed through a REST API can throw/reject with these errors
to communicate that a particular HTTP response should be sent. Functions are also provided to
facilitate handling these errors, while treating other, unrecognized errors as internal server
errors.

#### errors.responseError(status, message, [{ detail, code, cause }])

Creates a new `Error` instance with a numeric status and a message. You can also set an additional
detail text, an error code, and/or a cause (usually another error) via an options object.

```
const err = errors.responseError(500, "Internal server error", {
  detail: "Failure in underlying service",
  code: 1000,
  cause: caughtErr
});
logger.error(err);
res.status(err.status).send(`${err.message}: ${err.detail} [${err.code}]`);
```

For convenience, there are a number of factories for specific errors, which you'll usually use
instead of calling `responseError()` directly. Each factory provides the correct status and a
default message (the standard error message for that status). You can override that message and
provide a detail, code, and/or cause via an options object.

#### errors.badRequest([{ message, detail, code, cause }])

Creates a 400 Bad request error, with optional message override, detail, code, and cause.

#### errors.unauthorized([{ message, detail, code, cause }])

Creates a 401 Unauthorized error, with optional message override, detail, code, and cause.

#### errors.forbidden([{ message, detail, code, cause }])

Creates a 403 Forbidden error, with optional message override, detail, code, and cause.

#### errors.notFound([{ message, detail, code, cause }])

Creates a 404 Not found error, with optional message override, detail, code, and cause.

#### errors.methodNotAllowed([{ message, detail, code, cause }])

Creates a 405 Method not allowed error, with optional message override, detail, code, and cause.

#### errors.notAcceptable([{ message, detail, code, cause }])

Creates a 406 Not acceptable error, with optional message override, detail, code, and cause.

#### errors.conflict([{ message, detail, code, cause }])

Creates a 409 Conflict error, with optional message override, detail, code, and cause.

#### errors.internalServerError([{ message, detail, code, cause }])

Creates a 500 Internal server error, with optional message override, detail, code, and cause.

#### errors.notImplemented([{ message, detail, code, cause }])

Creates a 501 Not implemented error, with optional message override, detail, code, and cause.

#### errors.stackWithCause(error)

Returns a string combining the stack traces for the given error and up to 4 levels of nested
causes.

#### errors.toResponseError(error, [options])

Takes an arbitrary error (or value) and returns a response error. This ensures that any error thrown
by a service implementation can be used to send an HTTP response. If the error is already a response
error (i.e. if it has a status), it is returned unchanged. Otherwise, it is wrapped in an internal
server error (status 500), obscurring the underlying cause to prevent accidentally revealing
information that could be used to attack the service.

Non-response errors can optionally be logged. Options:

- **logger**: A logger to use to log non-response errors. If not specified, nothing will be logged.
  If you want this logging, you should usually specify the default Bunyan-based export from the
  [Logger](#logger) API. However, any other logger implementation with level-based logging functions
  should work.
- **logMessage**: A message to log along with the error. This can give context, such as from which
  service implementation the error came. There's no need to repeat the message from the error,
  itself. This can be a string or an array (in which case all elements are passed to the logger).
- **logLevel**: The level at which to log the error. This is "error" by default, but any other
  [level](#levels--formats) supported by the logger can be specified.

#### errors.toResponseBody(error, [options])

Returns an object that may be used as a JSON response body for the given error.

The error is passed through `errors.toResponseError()`, so that if it is not already a response
error (i.e. if it does not have a status), it will be wrapped in an internal server error (status
500). You can specify the same logging-related options supported by that function to this one.

The recognized options:

- **stack**: By default, stack traces are excluded from the response. Specify a truthy value to
  include traces, including nested causes. You should never do this in production, as stack traces
  may reveal information that can be used to attack the service.
- **logger**: A logger to use to log non-response errors. If not specified, nothing will be logged.
- **logMessage**: A message to log along with the error.
- **logLevel**: The level at which to log the error ("error" by default).

### Logger

```
const { logger } = require("garage-utils");
```

Logging support based on [Bunyan](https://github.com/trentm/node-bunyan). Accessing `logger` yields
a Bunyan logger that is automatically preconfigured for the current environment (testing, scripting,
development, or another application runtime environment) and enhanced with a couple of extra
functions.

You can use the logging functions described here for all error, status, and debugging information,
and it will be handled appropriately for the context in which the code runs.

#### Levels & formats

| Level | Value | Description                                                            |
| ----- | ----- | ---------------------------------------------------------------------- |
| trace | 10    | Entries from external libraries and most verbose application logging.  |
| debug | 20    | Detailed entries for isolating problems in the code.                   |
| info  | 30    | Information on regular operation.                                      |
| warn  | 40    | Unexpected conditions that should probably be investigated eventually. |
| error | 50    | Failures that prevent a request or an action from completing.          |
| fatal | 60    | Fatal errors that result in the application being terminated.          |

By default, applications in all environments log to stdout at level "info" and above. Logged entries
are emitted as single-line JSON objects by default for easy collection, indexing, and searching.
In development, logs are automatically pretty-printed, via the special
[bunyan-prettystream-circularsafe](https://www.npmjs.com/package/bunyan-prettystream-circularsafe)
stream implementation, for easier human consumption in real time.

Automated tests log at level "trace" and above to a `test.log` file, plus levels "warn" and above
to stderr. This prevents expected log output from messing up the test reports. Scripts log to
stderr at level "warn" and above by default. For both specs and scripts, logging to stderr is
automatically pretty-printed, as well.

In all cases, the default logging level can be overridden via a `LOG_LEVEL` environment variable
and set dynamically by the application using Bunyan's `logger.level()` and `logger.levels()`
functions.

The default formatting can be overridden by setting the `LOG_FORMAT` environment variable to "json"
"pretty", or "script", but do not use any formatting other than "json" in production environments
(a warning will be logged if you do).

You can also use the `bunyan` [CLI tool](https://github.com/trentm/node-bunyan#cli-usage) for
filtering and pretty-printing JSON logs, as an alternative to the formatting provided by this
library.

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

#### env

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
"start:local": ". env.sh && node server/server.js",
```

Here, sourcing `env.sh` adds the variables defined in `.env` or `services.json` to the environment.

Use the `-h` option to see all options supported by the `env` command.

#### logs

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
