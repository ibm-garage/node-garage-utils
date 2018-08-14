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

  describe("createSerializer", () => {
    it("returns a serializer function", () => {
      expect(logger.createSerializer()).to.be.a("function");
    });

    describe("when just a test prop is specified, the serializer", () => {
      const serializer = logger.createSerializer({ testProp: "a" });

      it("returns undefined unchanged", () => {
        expect(serializer(undefined)).to.be.undefined;
      });

      it("returns null unchanged unchanged", () => {
        expect(serializer(null)).to.be.null;
      });

      it("returns a non-object value unchanged", () => {
        expect(serializer("foo")).to.equal("foo");
      });

      it("returns an object unchanged if it does not include the test prop", () => {
        const val = { b: "B", c: "C", d: "D" };
        expect(serializer(val)).to.equal(val);
      });

      it("copies just the test prop otherwise", () => {
        const val = { a: "a", b: "B", c: "C", d: "D" };
        expect(serializer(val)).to.deep.equal({ a: "a" });
      });

      it("copies the test prop even if it is null", () => {
        const val = { a: null, b: "B", c: "C", d: "D" };
        expect(serializer(val)).to.deep.equal({ a: null });
      });
    });

    describe("when include props are specified, the serializer", () => {
      const serializer = logger.createSerializer({ testProp: "a", includeProps: ["b", "c", "d"] });

      it("returns an object unchanged if it does not include the test prop", () => {
        const val = { b: "B", c: "C", d: "D", e: "E" };
        expect(serializer(val)).to.equal(val);
      });

      it("copies just the include props otherwise", () => {
        const val = { a: "A", b: "B", c: "C", d: "D", e: "E" };
        expect(serializer(val)).to.deep.equal({ b: "B", c: "C", d: "D" });
      });

      it("skips any include props that are undefined", () => {
        const val = { a: "A", c: "C", d: undefined };
        expect(serializer(val)).to.deep.equal({ c: "C" });
      });

      it("does not skip any include props that are null", () => {
        const val = { a: "A", c: "C", d: null };
        expect(serializer(val)).to.deep.equal({ c: "C", d: null });
      });

      it("deeply copies any object or array values", () => {
        const a1 = [1, 2, 3];
        const o1 = { k1: 1, k2: 2, k3: a1 };
        const o2 = { k1: "v1", k2: "v2", k3: o1 };
        const a2 = ["a", "b", "c", o2];
        const val = { a: "A", b: o2, c: a2 };
        const result = serializer(val);
        expect(result).to.deep.equal({ b: o2, c: a2 });
        expect(result.b).to.not.equal(o2);
        expect(result.b.k3).to.not.equal(o1);
        expect(result.b.k3.k3).to.not.equal(a1);
        expect(result.c).to.not.equal(a2);
        expect(result.c[3]).to.not.equal(o2);
        expect(result.c[3].k3).to.not.equal(o1);
        expect(result.c[3].k3.k3).to.not.equal(a1);
      });
    });

    describe("when compute props are specified, the serializer", () => {
      const serializer = logger.createSerializer({
        testProp: "a",
        includeProps: ["b"],
        computeProps: { c: obj => obj.a + obj.b, d: obj => obj.c }
      });

      it("evaluates them to compute props and includes them in the result", () => {
        const val = { a: "A", b: "B", c: "C", d: "D", e: "E" };
        expect(serializer(val)).to.deep.equal({ b: "B", c: "AB", d: "C" });
      });

      it("excludes any props that evaluate to undefined", () => {
        const val = { a: "A", b: "B" };
        expect(serializer(val)).to.deep.equal({ b: "B", c: "AB" });
      });

      it("deeply copies props that evaluate to objects", () => {
        const obj = { k1: 1, k2: 2 };
        const val = { a: "A", b: "B", c: obj };
        const result = serializer(val);
        expect(result).to.deep.equal({ b: "B", c: "AB", d: obj });
        expect(result.d).to.not.equal(obj);
      });

      it("deeply copies props that evaluate to arrays", () => {
        const arr = ["a", "b", "c"];
        const val = { a: "A", b: "B", c: arr };
        const result = serializer(val);
        expect(result).to.deep.equal({ b: "B", c: "AB", d: arr });
        expect(result.d).to.not.equal(arr);
      });
    });

    describe("when redact props are specified, the serializer", () => {
      const serializer = logger.createSerializer({
        testProp: "a",
        includeProps: ["b"],
        computeProps: { c: obj => obj.d },
        redactProps: ["secret", "sensitive"]
      });

      it("redacts any matching props from within the included props", () => {
        const val = {
          a: "A",
          b: {
            name: "bob",
            secret: "s3cr3t",
            data: [
              {
                sensitive: { v1: 1, v2: 2 },
                safe: "safe"
              }
            ]
          },
          d: { v1: 1, v2: 2, v3: 3 }
        };
        const expected = {
          b: {
            name: "bob",
            secret: "*****",
            data: [{ sensitive: "*****", safe: "safe" }]
          },
          c: { v1: 1, v2: 2, v3: 3 }
        };
        expect(serializer(val)).to.deep.equal(expected);
      });

      it("redacts any matching props from within the computed props", () => {
        const val = {
          a: "A",
          b: { v1: 1, v2: 2, v3: 3 },
          d: {
            name: "bob",
            secret: "s3cr3t",
            data: [
              {
                sensitive: { v1: 1, v2: 2 },
                safe: "safe"
              }
            ]
          }
        };
        const expected = {
          b: { v1: 1, v2: 2, v3: 3 },
          c: {
            name: "bob",
            secret: "*****",
            data: [{ sensitive: "*****", safe: "safe" }]
          }
        };
        expect(serializer(val)).to.deep.equal(expected);
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

      it("redacts authorization headers", () => {
        const headers = { acccept: "application/json", authorization: "Basic Ym9iOnBhc3N3MHJk" };
        const orig = { connection, method, url, headers, extra: "more info" };
        const expectedHeaders = { acccept: "application/json", authorization: "*****" };
        const expected = { method, url, headers: expectedHeaders };
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

      it("filters out authorization headers", () => {
        const header = {
          "content-type": "application/json",
          authorization: "Basic Ym9iOnBhc3N3MHJk"
        };
        const orig = { statusCode, getHeaders: () => header };
        const expectedHeaders = { "content-type": "application/json", authorization: "*****" };
        const expected = { statusCode, header: expectedHeaders };
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
    let parentLogger, res, next;

    beforeEach(() => {
      parentLogger = new MockLogger();
      res = new events.EventEmitter();
      next = sinon.fake();
    });

    afterEach(() => {
      sinon.restore();
    });

    it("creates a child of the parentLogger and adds it to the request as req.logger", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ parentLogger });
      expressLogger(req, res, next);
      expect(parentLogger.child.calledOnce).to.be.true;
      expect(req.logger).to.be.an.instanceOf(MockLogger);
    });

    it("supports the old baseLogger option name if parentLogger is not specified", () => {
      const expressLogger = logger.expressLogger({ baseLogger: parentLogger });
      expressLogger({}, res, next);
      expect(parentLogger.child.calledOnce).to.be.true;
    });

    it("uses the default logger as a parent if none is specified", () => {
      sinon.replace(logger, "child", sinon.fake(options => new MockLogger(options)));
      const expressLogger = logger.expressLogger();
      expressLogger({}, res, next);
      expect(logger.child.calledOnce).to.be.true;
    });

    it("initializes the request logger to log req_id if the request has an id property", () => {
      const req = { id: req_id };
      const expressLogger = logger.expressLogger({ parentLogger });
      expressLogger(req, res, next);
      expect(req.logger).to.have.deep.property("options", { req_id });
    });

    it("does not log req_id if the request does not have an id property", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ parentLogger });
      expressLogger(req, res, next);
      expect(req.logger).to.have.deep.property("options", {});
    });

    it("includes additional options in the request logger if childOptions is specified", () => {
      const serializers = [];
      const childOptions = { serializers };
      const req = { id: req_id };
      const expressLogger = logger.expressLogger({ parentLogger, childOptions });
      expressLogger(req, res, next);
      expect(req.logger).to.have.deep.property("options", { req_id, serializers });
    });

    it("creates a simple child logger by default", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ parentLogger });
      expressLogger(req, res, next);
      expect(parentLogger.child.args[0][1]).to.be.true;
    });

    it("creates a non-simple child according to the childSimple option if specified", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ parentLogger, childSimple: false });
      expressLogger(req, res, next);
      expect(parentLogger.child.args[0][1]).to.be.false;
    });

    it("logs the request as info by default", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ parentLogger });
      expressLogger(req, res, next);
      expect(req.logger.info.calledOnce).to.be.true;
      expect(req.logger.info.getCall(0).args[0]).to.have.property("req", req);
    });

    it("logs the request at the specified reqLevel", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ parentLogger, reqLevel: "debug" });
      expressLogger(req, res, next);
      expect(req.logger.debug.calledOnce).to.be.true;
      expect(req.logger.debug.getCall(0).args[0]).to.have.property("req", req);
    });

    it("does not log the request if reqLevel is falsey", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ parentLogger, reqLevel: false });
      expressLogger(req, res, next);
      expect(req.logger.info.called).to.be.false;
    });

    it("throws immediately if reqLevel is not a valid level", () => {
      expect(() => {
        logger.expressLogger({ parentLogger, reqLevel: "verbose" });
      }).to.throw("Invalid reqLevel");
    });

    it("logs the response on finish as info by default", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ parentLogger });
      expressLogger(req, res, next);
      res.emit("finish");
      expect(req.logger.info.calledTwice).to.be.true;
      expect(req.logger.info.getCall(1).args[0]).to.have.property("res", res);
    });

    it("logs the response on finish at the specified resLevel", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ parentLogger, resLevel: "trace" });
      expressLogger(req, res, next);
      res.emit("finish");
      expect(req.logger.trace.calledOnce).to.be.true;
      expect(req.logger.trace.getCall(0).args[0]).to.have.property("res", res);
    });

    it("does not log the response if resLevel is falsey", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ parentLogger, resLevel: "" });
      expressLogger(req, res, next);
      res.emit("finish");
      expect(req.logger.info.calledTwice).to.be.false;
    });

    it("throws immediately if resLevel is not a valid level", () => {
      expect(() => {
        logger.expressLogger({ parentLogger, resLevel: "child" });
      }).to.throw("Invalid resLevel");
    });

    it("calls next() to invoke the next middleware", () => {
      const req = {};
      const expressLogger = logger.expressLogger({ parentLogger });
      expressLogger(req, res, next);
      expect(next.calledOnce).to.be.true;
    });

    describe("works with a real parent logger", () => {
      it("logs a request to the underlying stream", done => {
        const req = { connection: true, method: "GET", url: "https://example.com/api" };
        const expressLogger = logger.expressLogger({ resLevel: false });
        const stream = logger.streams[0].stream;
        const bytesWritten = stream.bytesWritten;
        expressLogger(req, res, next);
        setTimeout(() => {
          expect(stream.bytesWritten).to.be.above(bytesWritten);
          done();
        }, 25);
      });

      it("logs a response to the underlying stream", done => {
        const req = {};
        res.statusCode = 200;
        res.getHeaders = () => ({ "content-type": "application/json" });
        const expressLogger = logger.expressLogger({ reqLevel: false });
        const stream = logger.streams[0].stream;
        const bytesWritten = stream.bytesWritten;
        expressLogger(req, res, next);
        res.emit("finish");
        setTimeout(() => {
          expect(stream.bytesWritten).to.be.above(bytesWritten);
          done();
        }, 25);
      });
    });
  });
});
