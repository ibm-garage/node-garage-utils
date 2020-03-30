const errors = require("./errors");
const logger = require("./logger");

const cause = new Error("Kaboom");

describe("responseError()", () => {
  test("returns an error with specified message and status", () => {
    const err = errors.responseError(499, "Oopsie");
    expect(err).toHaveProperty("status", 499);
    expect(err).toHaveProperty("message", "Oopsie");
    expect(err).not.toHaveProperty("detail");
    expect(err).not.toHaveProperty("code");
    expect(err).not.toHaveProperty("cause");
  });

  test("returns a minimal error by default", () => {
    const err = errors.responseError();
    expect(err).toHaveProperty("status", undefined);
    expect(err).toHaveProperty("message", "");
    expect(err).not.toHaveProperty("detail");
    expect(err).not.toHaveProperty("code");
    expect(err).not.toHaveProperty("cause");
  });

  test("returns an error with the specified status, message, detail, code, and cause", () => {
    const err = errors.responseError(400, "Bad request", {
      detail: "Invalid body",
      code: "BR1000",
      cause
    });
    expect(err).toHaveProperty("status", 400);
    expect(err).toHaveProperty("message", "Bad request");
    expect(err).toHaveProperty("detail", "Invalid body");
    expect(err).toHaveProperty("code", "BR1000");
    expect(err).toHaveProperty("cause", cause);
  });
});

describe("error factories:", () => {
  test("badRequest() returns a default 400 Bad request error", () => {
    expect(errors.badRequest()).toMatchObject({ status: 400, message: "Bad request" });
  });

  test("badRequest() returns a 400 Bad request error with specified detail, code, and cause", () => {
    const options = { detail: "Invalid body", code: 100, cause };
    const expected = { status: 400, message: "Bad request", ...options };
    expect(errors.badRequest(options)).toMatchObject(expected);
  });

  test("badRequest() ignores a status but uses a message if specified", () => {
    const err = errors.badRequest({ status: 499, message: "Invalid request" });
    expect(err).toMatchObject({ status: 400, message: "Invalid request" });
  });

  // These all share the same implementation as badRequest(), so a single test suffices for each.
  test("unauthorized() returns a 401 Unauthorized error", () => {
    expect(errors.unauthorized()).toMatchObject({ status: 401, message: "Unauthorized" });
  });

  test("forbidden() returns a 403 Forbidden error", () => {
    expect(errors.forbidden()).toMatchObject({ status: 403, message: "Forbidden" });
  });

  test("notFound() returns a 404 Not found error", () => {
    expect(errors.notFound()).toMatchObject({ status: 404, message: "Not found" });
  });

  test("methodNotAllowed() returns a 405 Method not allowed error", () => {
    expect(errors.methodNotAllowed()).toMatchObject({
      status: 405,
      message: "Method not allowed"
    });
  });

  test("notAcceptable() returns a 406 Not acceptable error", () => {
    expect(errors.notAcceptable()).toMatchObject({ status: 406, message: "Not acceptable" });
  });

  test("conflict() returns a 409 Conflict error", () => {
    expect(errors.conflict()).toMatchObject({ status: 409, message: "Conflict" });
  });

  test("internalServerError() returns a 500 Internal server error", () => {
    expect(errors.internalServerError()).toMatchObject({
      status: 500,
      message: "Internal server error"
    });
  });

  test("notImplemented() returns a 501 Not implemented error", () => {
    expect(errors.notImplemented()).toMatchObject({ status: 501, message: "Not implemented" });
  });
});

describe("stackWithCause()", () => {
  test("returns the stack for a single unchained error", () => {
    const e1 = new Error("e1");
    const stack = errors.stackWithCause(e1);
    expect(stack).toBe(e1.stack);
  });

  test("returns a composite stack for an error with a cause", () => {
    const e1 = new Error("e1");
    const e2 = new Error("e2");
    e1.cause = e2;
    const stack = errors.stackWithCause(e1);
    expect(stack).toMatch(/^Error: e1/);
    expect(stack).toMatch("Caused by Error: e2");
  });

  test("terminates after 4 causes for an error with a cause cycle", () => {
    const e1 = new Error("e1");
    const e2 = new Error("e2");
    e1.cause = e2;
    e2.cause = e1;
    const stack = errors.stackWithCause(e1);
    expect(stack.indexOf("Error: e1")).toBe(0);
    const e1CauseCount = (stack.match(/Caused by Error: e1/g) || []).length;
    const e2CauseCount = (stack.match(/Caused by Error: e2/g) || []).length;
    expect(e1CauseCount).toBe(2);
    expect(e2CauseCount).toBe(2);
  });

  test("handles a non-error cause", () => {
    const e1 = new Error("e1");
    const e2 = new Error("e2");
    const e3 = { errorCode: 101, message: "Something went wrong" };
    e1.cause = e2;
    e2.cause = e3;
    const stack = errors.stackWithCause(e1);
    expect(stack).toMatch(/^Error: e1/);
    expect(stack).toMatch("Caused by Error: e2");
    expect(stack).toMatch(/Caused by { errorCode: 101, message: 'Something went wrong' }$/);
  });
});

describe("toResponseError()", () => {
  test("returns a response error unchanged", () => {
    const err = errors.notFound();
    expect(errors.toResponseError(err)).toBe(err);
  });

  test("wraps a non-response error in an internal server error", () => {
    const err = errors.toResponseError(cause);
    expect(err).toMatchObject({ status: 500, message: "Internal server error", cause });
  });

  describe("options:", () => {
    test("uses logger to log a non-response error at level error by default", () => {
      const logger = { error: jest.fn().mockName("error") };
      errors.toResponseError(cause, { logger });
      expect(logger.error).toHaveBeenCalledWith(cause);
    });

    test("includes logMessage in the log for a non-response error", () => {
      const logger = { error: jest.fn().mockName("error") };
      errors.toResponseError(cause, { logger, logMessage: "Unhandled error" });
      expect(logger.error).toHaveBeenCalledWith(cause, "Unhandled error");
    });

    test("passes multiple logMessage values to the logger to allow substitution", () => {
      const logger = { error: jest.fn().mockName("error") };
      errors.toResponseError(cause, { logger, logMessage: ["Error %s in %s", 100, "module"] });
      expect(logger.error).toHaveBeenCalledWith(cause, "Error %s in %s", 100, "module");
    });

    test("logs at logLevel by calling the logger function with that name", () => {
      const logger = { warn: jest.fn().mockName("warn") };
      errors.toResponseError(cause, { logger, logLevel: "warn" });
      expect(logger.warn).toHaveBeenCalledWith(cause);
    });

    test("does not log a response error", () => {
      const logger = { error: jest.fn().mockName("error") };
      errors.toResponseError(errors.notFound(), { logger });
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("successfully logs with the real Bunyan logger", () => {
      const spy = jest.spyOn(logger, "debug");
      errors.toResponseError(cause, { logger, logLevel: "debug", logMessage: "Mock error" });
      expect(spy).toHaveBeenCalledWith(cause, "Mock error");
      spy.mockRestore();
    });
  });
});

describe("toResponseBody()", () => {
  test("returns a response body with status and message from a response error", () => {
    const body = errors.toResponseBody(errors.badRequest());
    expect(body).toHaveProperty("status", 400);
    expect(body).toHaveProperty("message", "Bad request");
    expect(body).not.toHaveProperty("detail");
    expect(body).not.toHaveProperty("code");
    expect(body).not.toHaveProperty("stack");
  });

  test("includes a detail and code if present in a response error", () => {
    const err = errors.badRequest({ detail: "Invalid body", code: 100, cause });
    const expected = { status: 400, message: "Bad request", detail: "Invalid body", code: 100 };
    expect(errors.toResponseBody(err)).toEqual(expected);
  });

  test("returns a 500 Internal server error response body for a non-response error", () => {
    const expected = { status: 500, message: "Internal server error" };
    expect(errors.toResponseBody(cause)).toEqual(expected);
  });

  describe("options:", () => {
    test("includes a full stack trace if stack is true", () => {
      const body = errors.toResponseBody(cause, { stack: true });
      expect(body).toHaveProperty("stack");
      expect(body.stack).toMatch(/^Error: Internal server error/);
      expect(body.stack).toMatch("Caused by " + cause.stack);
    });

    test("supports logging non-response errors with the same options as toResponseError()", () => {
      const logger = { warn: jest.fn().mockName("warn") };
      const options = { logger, logLevel: "warn", logMessage: ["Error %s in %s", 100, "module"] };
      errors.toResponseBody(cause, options);
      expect(logger.warn).toHaveBeenCalledWith(cause, "Error %s in %s", 100, "module");
    });
  });
});
