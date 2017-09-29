# Garage Utilities for Node

This module provides a number of common utilities for Node/Express applications at the Bluemix
Garage.

## Utilities

### Application

```
const app = require('garage-utils').app;
```

Provides information about the running application. In most cases, you should just read from (and
not modify) `app.config`, though it can be useful occasionally to adjust it to simulate a
different environment for testing purposes.

#### app.config.rootDir

The root directory of the application.

#### app.config.isSpec()

Returns true when Mocha specs are running, false otherwise.

#### app.config.env

The running environment of the application. This can be one of the following four built-in values,
or any desired custom value:

- 'unit' for unit testing
- 'dev' for development
- 'test' for integration testing and deployment to test environments
- 'prod' for production deployment.

Though the NODE_ENV environment variable is a handy mechanism, it's not sufficient to account for
all the key environments. In particular, there's no accounting for a test environment, which should
serve bundled client code but produce more verbose logging and error messages on the server.

By default, the utility detects when running under Mocha (i.e. when `app.config.isSpec()` returns
true) and reports 'unit' in that case. Otherwise, the value is either 'prod' or 'dev', depending on
whether the NODE_ENV environment variable is 'production' or something else (or undefined). This
aligns with the way Express interprets that environment variable.

It is also possible to set a GAPP_ENV environment variable to one of 'unit', 'dev', 'test', or
'prod', or to any custom value, to override these defaults. Note that setting GAPP_ENV is the only
way to get a test environment. You should definitely do this when using Mocha to run integration
tests; otherwise, they will be mistaken for unit tests.

The following four functions are also provided to more easily test for a particular environment,
avoiding the need for string comparisons.

#### app.config.isUnit()

Returns true when `app.config` is 'unit', false otherwise.

#### app.config.isDev()

Returns true when `app.config` is 'dev', false otherwise.

#### app.config.isTest()

Returns true when `app.config` is 'test', false otherwise.

#### app.config.isProd()

Returns true when `app.config` is 'prod', false otherwise.

The underlying functions that compute the initial `app.config` property values are also exposed.
Generally, they need only be used to reset the values on `app.config` after adjusting them for
testing.

#### app.rootDir()

Returns the computed root directory that was used to initialize `app.config.rootDir`.

#### app.env()

Returns the computed environment that was used to initialize `app.config.env`.


### Time

```
const time = require('garage-utils').time;
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
const errors = require('garage-utils').errors;
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


### Logging

```
const logging = require('garage-utils').logging;
```

Configures winston for running or testing an application.

#### logging.formatter(options)

A formatter function for use with [winston](https://github.com/winstonjs/winston). Provides
readable, consistent logging across an application.

#### logging.configureWinston(cfAppEnv)

Configures Winston for running an application. Log messages are formatted by `logging.formatter`
and sent to the console. The specified Cloud Foundry environment (see `cf.getAppEnv()`) is
used to determine whether to include a timestamp (when running locally) or not (when running on
Cloud Foundry).

#### logging.configureWinstonForTests([suppressConsoleWarn], [filename])

Configures Winston for running tests. Log messages are formatted by `logging.formatter` and
sent to the specified file (or `test.log` by default). Only warnings and errors are sent to
the console, so as to avoid obscurring test reports with expected log output. When testing
error conditions, you can also suppress those warnings and errors.

#### logging.morganToWinstonStream([level])

Returns a stream that can be used with [morgan](https://github.com/expressjs/morgan) logging
middleware to write to winston, using the specified log level (or 'verbose' by default).


### Cloud Foundry

```
const cf = require('garage-utils').cf;
```

Augments [cfenv](https://github.com/cloudfoundry-community/node-cfenv) to parse and interpret
Cloud Foundry-provided environment variables, with better fallback handling for running locally
and additional functions for querying service credentials.

#### cf.getAppEnv()

Returns the core bits of Clound Foundry data, as detailed the cfenv docs. This is a singleton.

This function looks for a file named `services.json` in the root directory of the application and,
if it exists, uses it to populate the services, instead of the `VCAP_SERVICES` environment
variable.

Copying the contents of `VCAP_SERVICES` from a configured Cloud Foundry application into a
`services.json` file allows for running the application locally. **Note:** Such a file should
*not* be committed to source control.

The returned object is augmented with two additional functions:

##### appEnv.getServiceCredsByLabel(labelSpec)

Returns the credentials object of a service by label (i.e. by the name of the service, not the name
of the service instance). The labelSpec can be either a regular expression or a string (in which
case it must match exactly). If no service is found, or if there are multiple instances of the
matched service, this function throws an error.

Note, however, that if the labelSpec is a regular expression that matches more than one service
label, the instance of the first service will be returned.

##### appEnv.getServiceCredsByName(nameSpec)

Returns the credentials object of a service by name (i.e. by instance name). This works just like
`appEnv.getServiceCreds(spec)`, except it throws an exception if no service is found.

#### cf.mock(servicesFile)

Resets the value returned by `cf.getAppEnv()` using service data read from the specified file,
instead of `services.json`. Useful for testing with mock service credentials.

This function returns an unmock() function that resets the value returned by `cf.getAppEnv()` back
to the default.

```
const unmock = cf.mock(path.join(app.config.rootDir, 'test', 'mockServices.json'));
const appEnv = cf.getAppEnv();
// Do some testing...
unmock();
```

## License

This module is licensed under the MIT License. The full text is available in [LICENSE](LICENSE).
