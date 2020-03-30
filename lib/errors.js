const util = require("util");

const errors = {};
module.exports = errors;

errors.responseError = (status, message, { detail, code, cause } = {}) => {
  const err = new Error(message);
  err.status = status;
  if (detail != null) {
    err.detail = detail;
  }
  if (code != null) {
    err.code = code;
  }
  if (cause != null) {
    err.cause = cause;
  }
  return err;
};

function errorFactory(status, defaultMessage) {
  return ({ message = defaultMessage, detail, code, cause } = {}) =>
    errors.responseError(status, message, { detail, code, cause });
}

errors.badRequest = errorFactory(400, "Bad request");
errors.unauthorized = errorFactory(401, "Unauthorized");
errors.forbidden = errorFactory(403, "Forbidden");
errors.notFound = errorFactory(404, "Not found");
errors.methodNotAllowed = errorFactory(405, "Method not allowed");
errors.notAcceptable = errorFactory(406, "Not acceptable");
errors.conflict = errorFactory(409, "Conflict");
errors.internalServerError = errorFactory(500, "Internal server error");
errors.notImplemented = errorFactory(501, "Not implemented");

errors.stackWithCause = (error) => {
  let result = error.stack;
  // limit to 4 levels of cause as a guard against cycles
  for (let i = 0; error.cause && i < 4; i++) {
    error = error.cause;
    if (error) {
      result += "\nCaused by " + (error.stack || util.inspect(error));
    }
  }
  return result;
};

errors.toResponseError = (err, { logger, logMessage, logLevel = "error" } = {}) => {
  if (err.status) return err;
  if (logger != null) {
    let args = logMessage != null ? (Array.isArray(logMessage) ? logMessage : [logMessage]) : [];
    logger[logLevel](err, ...args);
  }
  return errors.internalServerError({ cause: err });
};

errors.toResponseBody = (err, options = {}) => {
  const { stack = false } = options;
  err = errors.toResponseError(err, options);

  const body = {
    status: err.status,
    message: err.message,
  };
  if (err.detail != null) {
    body.detail = err.detail;
  }
  if (err.code != null) {
    body.code = err.code;
  }
  if (stack) {
    body.stack = errors.stackWithCause(err);
  }
  return body;
};
