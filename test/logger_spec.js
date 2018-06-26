const { expect } = require("chai");
const sinon = require("sinon");
const path = require("path");
const events = require("events");
const { logger, appEnv } = require("../index");

describe("logger", () => {
  describe("the logger in an unmodified unit testing environment", () => {
    it("is named test", () => {
      expect(logger.fields.name).to.equal("test");
    });

    it("logs at trace level by default", () => {
      expect(logger._level).to.equal(10);
    });

    it("uses the default serializers", () => {
      expect(logger.serializers).to.deep.equal(logger.defaultSerializers);
    });

    it("has two streams", () => {
      expect(logger.streams).to.have.lengthOf(2);
    });

    it("has a file stream named testfile at trace level", () => {
      const stream = logger.streams[0];
      expect(stream).to.have.property("name", "testfile");
      expect(stream).to.have.property("type", "file");
      expect(stream).to.have.property("path", "test.log");
      expect(logger.levels("testfile")).to.equal(10);
    });

    it("has a raw stream named testerr at warn level", () => {
      const stream = logger.streams[1];
      expect(stream).to.have.property("name", "testerr");
      expect(stream).to.have.property("type", "raw");
      expect(logger.levels("testerr")).to.equal(40);
    });

    describe("suppressSpecErr()", () => {
      afterEach(() => {
        logger.levels("testerr", 40);
      });

      it("sets the level for testerr above fatal if suppress is truthy", () => {
        logger.suppressSpecErr(true);
        logger.warn("This message should be hidden from the test output");
        expect(logger.levels("testerr")).to.equal(100);
      });

      it("sets the level for testerr back to warn if suppress is falsey", () => {
        logger.suppressSpecErr(true);
        logger.suppressSpecErr(false);
        expect(logger.levels("testerr")).to.equal(40);
      });
    });
  });

  describe("the logger created internally by _createLogger()", () => {
    afterEach(() => {
      appEnv.reset();
    });

    describe("when the app env is tweaked to simulate a script", () => {
      let logger_;

      beforeEach(() => {
        appEnv.mainFile = path.join(appEnv.rootDir, "bin", "secrets");
        logger_ = logger._createLogger();
      });

      it("is named for the script's main file", () => {
        expect(logger_.fields.name).to.equal("secrets");
      });

      it("logs at warn level by default", () => {
        expect(logger_._level).to.equal(40);
      });

      it("uses the default serializers", () => {
        expect(logger_.serializers).to.deep.equal(logger.defaultSerializers);
      });

      it("has a single raw stream named scriptout at warn level", () => {
        expect(logger_.streams).to.have.lengthOf(1);
        const stream = logger_.streams[0];
        expect(stream).to.have.property("name", "scriptout");
        expect(stream).to.have.property("type", "raw");
        expect(logger_.levels("scriptout")).to.equal(40);
      });
    });

    describe("when the app env is tweaked to simulate an application", () => {
      let logger_;

      beforeEach(() => {
        appEnv.rootDir = path.join("home", "app");
        appEnv.mainFile = path.join(appEnv.rootDir, "server", "server.js");
        logger_ = logger._createLogger();
      });

      it("is named for the application's main file", () => {
        expect(logger_.fields.name).to.equal("server");
      });

      it("logs at debug level by default", () => {
        expect(logger_._level).to.equal(20);
      });

      it("uses the default serializers", () => {
        expect(logger_.serializers).to.deep.equal(logger.defaultSerializers);
      });

      it("has a single stdout stream named appout at debug level", () => {
        expect(logger_.streams).to.have.lengthOf(1);
        const stream = logger_.streams[0];
        expect(stream).to.have.property("name", "appout");
        expect(stream).to.have.property("type", "stream");
        expect(stream).to.have.property("stream", process.stdout);
        expect(logger_.levels("appout")).to.equal(20);
      });
    });

    describe("when a non-default log level is specified", () => {
      let origLogLevel;

      before(() => {
        origLogLevel = process.env.LOG_LEVEL;
        delete process.env.LOG_LEVEL;
      });

      after(() => {
        if (typeof origLogLevel !== "undefined") {
          process.env.LOG_LEVEL = origLogLevel;
        }
      });

      afterEach(() => {
        delete process.env.LOG_LEVEL;
      });

      it("uses a valid value of the LOG_LEVEL environment variable", () => {
        process.env.LOG_LEVEL = "error";
        appEnv.rootDir = path.join("home", "app");
        appEnv.mainFile = path.join(appEnv.rootDir, "server", "server.js");
        const logger_ = logger._createLogger();
        expect(logger_._level).to.equal(50);
      });

      it("ignores an invalid LOG_LEVEL value and uses the default", () => {
        process.env.LOG_LEVEL = "invalid";
        appEnv.rootDir = path.join("home", "app");
        appEnv.mainFile = path.join(appEnv.rootDir, "server", "server.js");
        const logger_ = logger._createLogger();
        expect(logger_._level).to.equal(20);
      });
    });
  });

  describe("defaultSerializers", () => {
    const { err, req, res } = logger.serializers;

    describe("err()", () => {
      const message = "Oops!";
      const name = "bad error";
      const code = 123;
      const signal = "SIG_OOPS";
      const stack = "Error: Oops!\n    at foo.js:1:11";

      it("returns a falsey err unchanged", () => {
        expect(err(false)).to.equal(false);
      });

      it("returns an err with no stack unchanged", () => {
        const orig = { type: "bad error" };
        expect(err(orig)).to.equal(orig);
      });

      it("selects message, name, code, signal, and stack from an err with stack", () => {
        const orig = { message, name, code, signal, stack, extra: "more info" };
        const expected = { message, name, code, signal, stack };
        expect(err(orig)).to.deep.equal(expected);
      });

      it("if a cause is specified, includes it in the stack", () => {
        const orig = { stack, cause: "network error" };
        const expectedStack = stack + "\nCaused by 'network error'";
        expect(err(orig)).to.have.property("stack", expectedStack);
      });

      it("does not include any selected properties with undefined values", () => {
        const orig = { stack };
        expect(err(orig)).to.deep.equal({ stack });
      });
    });

    describe("req()", () => {
      const connection = true;
      const method = "GET";
      const url = "https://app.cloud";
      const headers = { acccept: "application/json" };

      it("returns a falsey req unchanged", () => {
        expect(req(false)).to.equal(false);
      });

      it("returns an req with no connection unchanged", () => {
        const orig = { name: "special request" };
        expect(err(orig)).to.equal(orig);
      });

      it("selects method, url, and headers from a req with connection", () => {
        const orig = { connection, method, url, headers, extra: "more info" };
        const expected = { method, url, headers };
        expect(req(orig)).to.deep.equal(expected);
      });

      it("does not include any selected properties with undefined values", () => {
        const orig = { connection };
        expect(req(orig)).to.deep.equal({});
      });
    });

    describe("res()", () => {
      const statusCode = 200;
      const header = { "content-type": "application/json" };

      it("returns a falsey res unchanged", () => {
        expect(res(false)).to.equal(false);
      });

      it("returns an res with no getHeaders() function unchanged", () => {
        const orig = { name: "special response" };
        expect(res(orig)).to.equal(orig);
      });

      it("selects statusCode and header by invoking getHeaders() from a res with that function", () => {
        const orig = { statusCode, getHeaders: () => header };
        const expected = { statusCode, header };
        expect(res(orig)).to.deep.equal(expected);
      });

      it("does not include any selected properties with undefined values", () => {
        const orig = { getHeaders: () => header };
        expect(res(orig)).to.deep.equal({ header });
      });
    });
  });

  describe("expressLogger()", () => {
    function MockLogger(options = {}) {
      this.options = options;
      this.child = sinon.fake(options => new MockLogger(options));
      this.trace = sinon.fake();
      this.debug = sinon.fake();
      this.info = sinon.fake();
      this.warn = sinon.fake();
      this.error = sinon.fake();
      this.fatal = sinon.fake();
    }

    const req_id = "id1";
    let baseLogger, res, next;

    beforeEach(() => {
      baseLogger = new MockLogger();
      res = new events.EventEmitter();
      next = sinon.fake();
    });

    afterEach(() => {
      sinon.restore();
    });

    it("creates a child of the base logger and adds it to the request as req.logger", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ baseLogger });
      expressLogger(req, res, next);
      expect(baseLogger.child.calledOnce).to.be.true;
      expect(req.logger).to.be.an.instanceOf(MockLogger);
    });

    it("uses the default logger as a base if none is specified", () => {
      sinon.replace(logger, "child", sinon.fake(options => new MockLogger(options)));
      const expressLogger = logger.expressLogger();
      expressLogger({}, res, next);
      expect(logger.child.calledOnce).to.be.true;
    });

    it("initializes the request logger to log req_id if the request has an id property", () => {
      const req = { id: req_id };
      const expressLogger = logger.expressLogger({ baseLogger });
      expressLogger(req, res, next);
      expect(req.logger).to.have.deep.property("options", { req_id });
    });

    it("logs the request as info by default", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ baseLogger });
      expressLogger(req, res, next);
      expect(req.logger.info.calledOnce).to.be.true;
      expect(req.logger.info.getCall(0).args[0]).to.have.property("req", req);
    });

    it("logs the request at the specified reqLevel", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ baseLogger, reqLevel: "debug" });
      expressLogger(req, res, next);
      expect(req.logger.debug.calledOnce).to.be.true;
      expect(req.logger.debug.getCall(0).args[0]).to.have.property("req", req);
    });

    it("does not log the request if reqLevel is falsey", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ baseLogger, reqLevel: false });
      expressLogger(req, res, next);
      expect(req.logger.info.called).to.be.false;
    });

    it("throws immediately if reqLevel is not a valid level", () => {
      expect(() => {
        logger.expressLogger({ baseLogger, reqLevel: "verbose" });
      }).to.throw("Invalid reqLevel");
    });

    it("logs the response on finish as info by default", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ baseLogger });
      expressLogger(req, res, next);
      res.emit("finish");
      expect(req.logger.info.calledTwice).to.be.true;
      expect(req.logger.info.getCall(1).args[0]).to.have.property("res", res);
    });

    it("logs the response on finish at the specified resLevel", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ baseLogger, resLevel: "trace" });
      expressLogger(req, res, next);
      res.emit("finish");
      expect(req.logger.trace.calledOnce).to.be.true;
      expect(req.logger.trace.getCall(0).args[0]).to.have.property("res", res);
    });

    it("does not log the response if resLevel is falsey", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ baseLogger, resLevel: "" });
      expressLogger(req, res, next);
      res.emit("finish");
      expect(req.logger.info.calledTwice).to.be.false;
    });

    it("throws immediately if resLevel is not a valid level", () => {
      expect(() => {
        logger.expressLogger({ baseLogger, resLevel: "child" });
      }).to.throw("Invalid resLevel");
    });

    it("calls next() to invoke the next middleware", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ baseLogger });
      expressLogger(req, res, next);
      expect(next.calledOnce).to.be.true;
    });
  });
});
