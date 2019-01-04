const errors = require("./errors");

const cause = { description: "kaboom" };

describe("error()", () => {
  test("returns an error with specified status and message", () => {
    const error = errors.error(499, "Oopsie");
    expect(error.message).toBe("Oopsie");
    expect(error.status).toBe(499);
    expect(error.cause).toBeUndefined();
  });

  test("returns an error with specified status, message, and detail", () => {
    const error = errors.error(499, "Oopsie", "You did something wrong");
    expect(error.message).toBe("Oopsie: You did something wrong");
    expect(error.status).toBe(499);
    expect(error.cause).toBeUndefined();
  });

  test("returns an error with specified status, message, detail, and cause", () => {
    const error = errors.error(499, "Oopsie", "You did something wrong", cause);
    expect(error.message).toBe("Oopsie: You did something wrong");
    expect(error.status).toBe(499);
    expect(error.cause).toEqual(cause);
  });
});

test("badRequest() returns a 400 'Bad request' error with specified detail and cause", () => {
  const error = errors.badRequest("id not specified", cause);
  expect(error.message).toBe("Bad request: id not specified");
  expect(error.status).toBe(400);
  expect(error.cause).toEqual(cause);
});

test("unauthorized() returns a 401 'Unauthorized' error with specified cause", () => {
  const error = errors.unauthorized(cause);
  expect(error.message).toBe("Unauthorized");
  expect(error.status).toBe(401);
  expect(error.cause).toEqual(cause);
});

test("forbidden() returns a 403 'Forbidden' error with specified detail and cause", () => {
  const error = errors.forbidden("invalid range", cause);
  expect(error.message).toBe("Forbidden: invalid range");
  expect(error.status).toBe(403);
  expect(error.cause).toEqual(cause);
});

test("notFound() returns a 404 'Not found' error with specified cause", () => {
  const error = errors.notFound(cause);
  expect(error.message).toBe("Not found");
  expect(error.status).toBe(404);
  expect(error.cause).toEqual(cause);
});

test("methodNotAllowed() returns a 405 'Method not allowed' error with specified cause", () => {
  const error = errors.methodNotAllowed(cause);
  expect(error.message).toBe("Method not allowed");
  expect(error.status).toBe(405);
  expect(error.cause).toEqual(cause);
});

test("conflict() returns a 409 'Conflict' error with specified detail and cause", () => {
  const error = errors.conflict("already exists", cause);
  expect(error.message).toBe("Conflict: already exists");
  expect(error.status).toBe(409);
  expect(error.cause).toEqual(cause);
});

test("internalServerError() returns a 500 'Internal server error' error with specified cause", () => {
  const error = errors.internalServerError(cause);
  expect(error.message).toBe("Internal server error");
  expect(error.status).toBe(500);
  expect(error.cause).toEqual(cause);
});

describe("responseBody()", () => {
  test("yields a response body with status 500 when no status in error", () => {
    const e = new Error();
    const body = errors.responseBody(e);
    expect(body).toHaveProperty("status", 500);
    expect(body).not.toHaveProperty("message");
  });

  test("yields a response body with status from an error", () => {
    const e = new Error();
    e.status = 501;
    const body = errors.responseBody(e);
    expect(body).toHaveProperty("status", 501);
    expect(body).not.toHaveProperty("message");
  });

  test("yields a response body with status and message from an error", () => {
    const e = new Error("oops");
    e.status = 503;
    const body = errors.responseBody(e);
    expect(body).toHaveProperty("status", 503);
    expect(body).toHaveProperty("message", "oops");
  });
});

describe("stackWithCause()", () => {
  test("yields the stack for a single unchained error", () => {
    const e1 = new Error("e1");
    const stack = errors.stackWithCause(e1);
    expect(stack).toBe(e1.stack);
  });

  test("yields a composite stack for an error with a cause", () => {
    const e1 = new Error("e1");
    const e2 = new Error("e2");
    e1.cause = e2;
    const stack = errors.stackWithCause(e1);
    expect(stack.indexOf("Error: e1")).toBe(0);
    expect(stack.indexOf("Caused by Error: e2")).not.toBe(-1);
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
    expect(stack.indexOf("Error: e1")).toBe(0);
    expect(stack.indexOf("Caused by Error: e2")).not.toBe(-1);
    expect(stack.indexOf("Caused by { errorCode: 101, message: 'Something went wrong' }")).not.toBe(
      -1
    );
  });
});
