const { expect } = require("chai");
const { errors } = require("../index");

const cause = { description: "kaboom" };

describe("errors", () => {
  describe("error()", () => {
    it("returns an error with specified status and message", () => {
      const error = errors.error(499, "Oopsie");
      expect(error.message).to.equal("Oopsie");
      expect(error.status).to.equal(499);
      expect(error.cause).to.be.undefined;
    });

    it("returns an error with specified status, message, and detail", () => {
      const error = errors.error(499, "Oopsie", "You did something wrong");
      expect(error.message).to.equal("Oopsie: You did something wrong");
      expect(error.status).to.equal(499);
      expect(error.cause).to.be.undefined;
    });

    it("returns an error with specified status, message, detail, and cause", () => {
      const error = errors.error(499, "Oopsie", "You did something wrong", cause);
      expect(error.message).to.equal("Oopsie: You did something wrong");
      expect(error.status).to.equal(499);
      expect(error.cause).to.deep.equal(cause);
    });
  });

  it("badRequest() returns a 400 'Bad request' error with specified detail and cause", () => {
    const error = errors.badRequest("id not specified", cause);
    expect(error.message).to.equal("Bad request: id not specified");
    expect(error.status).to.equal(400);
    expect(error.cause).to.deep.equal(cause);
  });

  it("unauthorized() returns a 401 'Unauthorized' error with specified cause", () => {
    const error = errors.unauthorized(cause);
    expect(error.message).to.equal("Unauthorized");
    expect(error.status).to.equal(401);
    expect(error.cause).to.deep.equal(cause);
  });

  it("forbidden() returns a 403 'Forbidden' error with specified detail and cause", () => {
    const error = errors.forbidden("invalid range", cause);
    expect(error.message).to.equal("Forbidden: invalid range");
    expect(error.status).to.equal(403);
    expect(error.cause).to.deep.equal(cause);
  });

  it("notFound() returns a 404 'Not found' error with specified cause", () => {
    const error = errors.notFound(cause);
    expect(error.message).to.equal("Not found");
    expect(error.status).to.equal(404);
    expect(error.cause).to.deep.equal(cause);
  });

  it("methodNotAllowed() returns a 405 'Method not allowed' error with specified cause", () => {
    const error = errors.methodNotAllowed(cause);
    expect(error.message).to.equal("Method not allowed");
    expect(error.status).to.equal(405);
    expect(error.cause).to.deep.equal(cause);
  });

  it("conflict() returns a 409 'Conflict' error with specified detail and cause", () => {
    const error = errors.conflict("already exists", cause);
    expect(error.message).to.equal("Conflict: already exists");
    expect(error.status).to.equal(409);
    expect(error.cause).to.deep.equal(cause);
  });

  it("internalServerError() returns a 500 'Internal server error' error with specified cause", () => {
    const error = errors.internalServerError(cause);
    expect(error.message).to.equal("Internal server error");
    expect(error.status).to.equal(500);
    expect(error.cause).to.deep.equal(cause);
  });

  describe("responseBody()", () => {
    it("yields a response body with status 500 when no status in error", () => {
      const e = new Error();
      const body = errors.responseBody(e);
      expect(body).to.have.property("status", 500);
      expect(body).not.to.have.property("message");
    });

    it("yields a response body with status from an error", () => {
      const e = new Error();
      e.status = 501;
      const body = errors.responseBody(e);
      expect(body).to.have.property("status", 501);
      expect(body).not.to.have.property("message");
    });

    it("yields a response body with status and message from an error", () => {
      const e = new Error("oops");
      e.status = 503;
      const body = errors.responseBody(e);
      expect(body).to.have.property("status", 503);
      expect(body).to.have.property("message", "oops");
    });
  });

  describe("stackWithCause()", () => {
    it("yields the stack for a single unchained error", () => {
      const e1 = new Error("e1");
      const stack = errors.stackWithCause(e1);
      expect(stack).to.equal(e1.stack);
    });

    it("yields a composite stack for an error with a cause", () => {
      const e1 = new Error("e1");
      const e2 = new Error("e2");
      e1.cause = e2;
      const stack = errors.stackWithCause(e1);
      expect(stack.indexOf("Error: e1")).to.equal(0);
      expect(stack.indexOf("Caused by Error: e2")).not.to.equal(-1);
    });

    it("terminates after 4 causes for an error with a cause cycle", () => {
      const e1 = new Error("e1");
      const e2 = new Error("e2");
      e1.cause = e2;
      e2.cause = e1;
      const stack = errors.stackWithCause(e1);
      expect(stack.indexOf("Error: e1")).to.equal(0);
      const e1CauseCount = (stack.match(/Caused by Error: e1/g) || []).length;
      const e2CauseCount = (stack.match(/Caused by Error: e2/g) || []).length;
      expect(e1CauseCount).to.equal(2);
      expect(e2CauseCount).to.equal(2);
    });

    it("handles a non-error cause", () => {
      const e1 = new Error("e1");
      const e2 = new Error("e2");
      const e3 = { errorCode: 101, message: "Something went wrong" };
      e1.cause = e2;
      e2.cause = e3;
      const stack = errors.stackWithCause(e1);
      expect(stack.indexOf("Error: e1")).to.equal(0);
      expect(stack.indexOf("Caused by Error: e2")).not.to.equal(-1);
      expect(
        stack.indexOf("Caused by { errorCode: 101, message: 'Something went wrong' }")
      ).not.to.equal(-1);
    });
  });
});
