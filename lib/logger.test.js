const path = require("path");
const events = require("events");
const logger = require("./logger");
const appEnv = require("./appEnv");

describe("the logger in an unmodified unit testing environment", () => {
  it("is named test", () => {
    expect(logger.fields.name).toBe("test");
  });

  it("logs at trace level by default", () => {
    expect(logger._level).toBe(10);
  });

  it("uses the default serializers", () => {
    expect(logger.serializers).toEqual(logger.defaultSerializers);
  });

  it("has two streams", () => {
    expect(logger.streams).toHaveLength(2);
  });

  it("has a file stream named testfile at trace level", () => {
    const stream = logger.streams[0];
    expect(stream).toHaveProperty("name", "testfile");
    expect(stream).toHaveProperty("type", "file");
    expect(stream).toHaveProperty("path", "test.log");
    expect(logger.levels("testfile")).toBe(10);
  });

  it("has a raw stream named testerr at warn level", () => {
    const stream = logger.streams[1];
    expect(stream).toHaveProperty("name", "testerr");
    expect(stream).toHaveProperty("type", "raw");
    expect(logger.levels("testerr")).toBe(40);
  });

  describe("suppressSpecErr()", () => {
    afterEach(() => {
      logger.levels("testerr", 40);
    });

    it("sets the level for testerr above fatal if suppress is truthy", () => {
      logger.suppressSpecErr(true);
      logger.warn("This message should be hidden from the test output");
      expect(logger.levels("testerr")).toBe(100);
    });

    it("sets the level for testerr back to warn if suppress is falsey", () => {
      logger.suppressSpecErr(true);
      logger.suppressSpecErr(false);
      expect(logger.levels("testerr")).toBe(40);
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
      appEnv.env = "script";
      logger_ = logger._createLogger();
    });

    it("is named for the script's main file", () => {
      expect(logger_.fields.name).toBe("secrets");
    });

    it("logs at warn level by default", () => {
      expect(logger_._level).toBe(40);
    });

    it("uses the default serializers", () => {
      expect(logger_.serializers).toEqual(logger.defaultSerializers);
    });

    it("has a single raw stream named scriptout at warn level", () => {
      expect(logger_.streams).toHaveLength(1);
      const stream = logger_.streams[0];
      expect(stream).toHaveProperty("name", "scriptout");
      expect(stream).toHaveProperty("type", "raw");
      expect(logger_.levels("scriptout")).toBe(40);
    });
  });

  describe("when the app env is tweaked to simulate an application", () => {
    let logger_;

    beforeEach(() => {
      appEnv.rootDir = path.join("home", "app");
      appEnv.mainFile = path.join(appEnv.rootDir, "server", "server.js");
      appEnv.env = "production";
      logger_ = logger._createLogger();
    });

    it("is named for the application's main file", () => {
      expect(logger_.fields.name).toBe("server");
    });

    it("logs at debug level by default", () => {
      expect(logger_._level).toBe(20);
    });

    it("uses the default serializers", () => {
      expect(logger_.serializers).toEqual(logger.defaultSerializers);
    });

    it("has a single stdout stream named appout at debug level", () => {
      expect(logger_.streams).toHaveLength(1);
      const stream = logger_.streams[0];
      expect(stream).toHaveProperty("name", "appout");
      expect(stream).toHaveProperty("type", "stream");
      expect(stream).toHaveProperty("stream", process.stdout);
      expect(logger_.levels("appout")).toBe(20);
    });
  });

  describe("when a non-default log level is specified", () => {
    let origLogLevel;

    beforeAll(() => {
      origLogLevel = process.env.LOG_LEVEL;
      delete process.env.LOG_LEVEL;
    });

    afterAll(() => {
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
      appEnv.env = "development";
      const logger_ = logger._createLogger();
      expect(logger_._level).toBe(50);
    });

    it("ignores an invalid LOG_LEVEL value and uses the default", () => {
      process.env.LOG_LEVEL = "invalid";
      appEnv.rootDir = path.join("home", "app");
      appEnv.mainFile = path.join(appEnv.rootDir, "server", "server.js");
      appEnv.env = "development";
      const logger_ = logger._createLogger();
      expect(logger_._level).toBe(20);
    });
  });
});

describe("createSerializer", () => {
  it("returns a serializer function", () => {
    expect(typeof logger.createSerializer()).toBe("function");
  });

  describe("when just a test prop is specified, the serializer", () => {
    const serializer = logger.createSerializer({ testProp: "a" });

    it("returns undefined unchanged", () => {
      expect(serializer(undefined)).toBeUndefined();
    });

    it("returns null unchanged unchanged", () => {
      expect(serializer(null)).toBeNull();
    });

    it("returns a non-object value unchanged", () => {
      expect(serializer("foo")).toBe("foo");
    });

    it("returns an object unchanged if it does not include the test prop", () => {
      const val = { b: "B", c: "C", d: "D" };
      expect(serializer(val)).toBe(val);
    });

    it("copies just the test prop otherwise", () => {
      const val = { a: "a", b: "B", c: "C", d: "D" };
      expect(serializer(val)).toEqual({ a: "a" });
    });

    it("copies the test prop even if it is null", () => {
      const val = { a: null, b: "B", c: "C", d: "D" };
      expect(serializer(val)).toEqual({ a: null });
    });
  });

  describe("when include props are specified, the serializer", () => {
    const serializer = logger.createSerializer({ testProp: "a", includeProps: ["b", "c", "d"] });

    it("returns an object unchanged if it does not include the test prop", () => {
      const val = { b: "B", c: "C", d: "D", e: "E" };
      expect(serializer(val)).toBe(val);
    });

    it("copies just the include props otherwise", () => {
      const val = { a: "A", b: "B", c: "C", d: "D", e: "E" };
      expect(serializer(val)).toEqual({ b: "B", c: "C", d: "D" });
    });

    it("skips any include props that are undefined", () => {
      const val = { a: "A", c: "C", d: undefined };
      expect(serializer(val)).toEqual({ c: "C" });
    });

    it("does not skip any include props that are null", () => {
      const val = { a: "A", c: "C", d: null };
      expect(serializer(val)).toEqual({ c: "C", d: null });
    });

    it("deeply copies any object or array values", () => {
      const a1 = [1, 2, 3];
      const o1 = { k1: 1, k2: 2, k3: a1 };
      const o2 = { k1: "v1", k2: "v2", k3: o1 };
      const a2 = ["a", "b", "c", o2];
      const val = { a: "A", b: o2, c: a2 };
      const result = serializer(val);
      expect(result).toEqual({ b: o2, c: a2 });
      expect(result.b).not.toBe(o2);
      expect(result.b.k3).not.toBe(o1);
      expect(result.b.k3.k3).not.toBe(a1);
      expect(result.c).not.toBe(a2);
      expect(result.c[3]).not.toBe(o2);
      expect(result.c[3].k3).not.toBe(o1);
      expect(result.c[3].k3.k3).not.toBe(a1);
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
      expect(serializer(val)).toEqual({ b: "B", c: "AB", d: "C" });
    });

    it("excludes any props that evaluate to undefined", () => {
      const val = { a: "A", b: "B" };
      expect(serializer(val)).toEqual({ b: "B", c: "AB" });
    });

    it("deeply copies props that evaluate to objects", () => {
      const obj = { k1: 1, k2: 2 };
      const val = { a: "A", b: "B", c: obj };
      const result = serializer(val);
      expect(result).toEqual({ b: "B", c: "AB", d: obj });
      expect(result.d).not.toBe(obj);
    });

    it("deeply copies props that evaluate to arrays", () => {
      const arr = ["a", "b", "c"];
      const val = { a: "A", b: "B", c: arr };
      const result = serializer(val);
      expect(result).toEqual({ b: "B", c: "AB", d: arr });
      expect(result.d).not.toBe(arr);
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
      expect(serializer(val)).toEqual(expected);
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
      expect(serializer(val)).toEqual(expected);
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
      expect(err(false)).toBe(false);
    });

    it("returns an err with no stack unchanged", () => {
      const orig = { type: "bad error" };
      expect(err(orig)).toBe(orig);
    });

    it("selects message, name, code, signal, and stack from an err with stack", () => {
      const orig = { message, name, code, signal, stack, extra: "more info" };
      const expected = { message, name, code, signal, stack };
      expect(err(orig)).toEqual(expected);
    });

    it("if a cause is specified, includes it in the stack", () => {
      const orig = { stack, cause: "network error" };
      const expectedStack = stack + "\nCaused by 'network error'";
      expect(err(orig)).toHaveProperty("stack", expectedStack);
    });

    it("does not include any selected properties with undefined values", () => {
      const orig = { stack };
      expect(err(orig)).toEqual({ stack });
    });
  });

  describe("req()", () => {
    const connection = true;
    const method = "GET";
    const url = "https://app.cloud";
    const headers = { acccept: "application/json" };

    it("returns a falsey req unchanged", () => {
      expect(req(false)).toBe(false);
    });

    it("returns an req with no connection unchanged", () => {
      const orig = { name: "special request" };
      expect(err(orig)).toBe(orig);
    });

    it("selects method, url, and headers from a req with connection", () => {
      const orig = { connection, method, url, headers, extra: "more info" };
      const expected = { method, url, headers };
      expect(req(orig)).toEqual(expected);
    });

    it("redacts authorization headers", () => {
      const headers = { acccept: "application/json", authorization: "Basic Ym9iOnBhc3N3MHJk" };
      const orig = { connection, method, url, headers, extra: "more info" };
      const expectedHeaders = { acccept: "application/json", authorization: "*****" };
      const expected = { method, url, headers: expectedHeaders };
      expect(req(orig)).toEqual(expected);
    });

    it("does not include any selected properties with undefined values", () => {
      const orig = { connection };
      expect(req(orig)).toEqual({});
    });
  });

  describe("res()", () => {
    const statusCode = 200;
    const header = { "content-type": "application/json" };

    it("returns a falsey res unchanged", () => {
      expect(res(false)).toBe(false);
    });

    it("returns an res with no getHeaders() function unchanged", () => {
      const orig = { name: "special response" };
      expect(res(orig)).toBe(orig);
    });

    it("selects statusCode and header by invoking getHeaders() from a res with that function", () => {
      const orig = { statusCode, getHeaders: () => header };
      const expected = { statusCode, header };
      expect(res(orig)).toEqual(expected);
    });

    it("filters out authorization headers", () => {
      const header = {
        "content-type": "application/json",
        authorization: "Basic Ym9iOnBhc3N3MHJk"
      };
      const orig = { statusCode, getHeaders: () => header };
      const expectedHeaders = { "content-type": "application/json", authorization: "*****" };
      const expected = { statusCode, header: expectedHeaders };
      expect(res(orig)).toEqual(expected);
    });

    it("does not include any selected properties with undefined values", () => {
      const orig = { getHeaders: () => header };
      expect(res(orig)).toEqual({ header });
    });
  });
});

describe("expressLogger()", () => {
  function MockLogger(options = {}) {
    this.options = options;
    this.child = jest.fn(options => new MockLogger(options)).mockName("child");
    this.trace = jest.fn().mockName("trace");
    this.debug = jest.fn().mockName("debug");
    this.info = jest.fn().mockName("info");
    this.warn = jest.fn().mockName("warn");
    this.error = jest.fn().mockName("error");
    this.fatal = jest.fn().mockName("fatal");
  }

  const req_id = "id1";
  let parentLogger, res, next;

  beforeEach(() => {
    parentLogger = new MockLogger();
    res = new events.EventEmitter();
    next = jest.fn().mockName("next");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a child of the parentLogger and adds it to the request as req.logger", () => {
    const req = {};
    const expressLogger = logger.expressLogger({ parentLogger });
    expressLogger(req, res, next);
    expect(parentLogger.child).toHaveBeenCalled();
    expect(req.logger).toEqual(expect.any(MockLogger));
  });

  it("supports the old baseLogger option name if parentLogger is not specified", () => {
    const expressLogger = logger.expressLogger({ baseLogger: parentLogger });
    expressLogger({}, res, next);
    expect(parentLogger.child).toHaveBeenCalled();
  });

  it("uses the default logger as a parent if none is specified", () => {
    jest
      .spyOn(logger, "child")
      .mockImplementation(options => new MockLogger(options))
      .mockName("child");
    const expressLogger = logger.expressLogger();
    expressLogger({}, res, next);
    expect(logger.child).toHaveBeenCalled();
  });

  it("initializes the request logger to log req_id if the request has an id property", () => {
    const req = { id: req_id };
    const expressLogger = logger.expressLogger({ parentLogger });
    expressLogger(req, res, next);
    expect(req.logger).toHaveProperty("options", { req_id });
  });

  it("does not log req_id if the request does not have an id property", () => {
    const req = {};
    const expressLogger = logger.expressLogger({ parentLogger });
    expressLogger(req, res, next);
    expect(req.logger).toHaveProperty("options", {});
  });

  it("includes additional options in the request logger if childOptions is specified", () => {
    const serializers = [];
    const childOptions = { serializers };
    const req = { id: req_id };
    const expressLogger = logger.expressLogger({ parentLogger, childOptions });
    expressLogger(req, res, next);
    expect(req.logger).toHaveProperty("options", { req_id, serializers });
  });

  it("creates a simple child logger by default", () => {
    const req = {};
    const expressLogger = logger.expressLogger({ parentLogger });
    expressLogger(req, res, next);
    expect(parentLogger.child).toHaveBeenCalledWith(expect.anything(), true);
  });

  it("creates a non-simple child according to the childSimple option if specified", () => {
    const req = {};
    const expressLogger = logger.expressLogger({ parentLogger, childSimple: false });
    expressLogger(req, res, next);
    expect(parentLogger.child).toHaveBeenCalledWith(expect.anything(), false);
  });

  it("logs the request as info by default", () => {
    const req = {};
    const expressLogger = logger.expressLogger({ parentLogger });
    expressLogger(req, res, next);
    expect(req.logger.info).toHaveBeenCalledTimes(1);
    expect(req.logger.info.mock.calls[0][0]).toHaveProperty("req", req);
  });

  it("logs the request at the specified reqLevel", () => {
    const req = {};
    const expressLogger = logger.expressLogger({ parentLogger, reqLevel: "debug" });
    expressLogger(req, res, next);
    expect(req.logger.debug).toHaveBeenCalledTimes(1);
    expect(req.logger.debug.mock.calls[0][0]).toHaveProperty("req", req);
  });

  it("does not log the request if reqLevel is falsey", () => {
    const req = {};
    const expressLogger = logger.expressLogger({ parentLogger, reqLevel: false });
    expressLogger(req, res, next);
    expect(req.logger.info).not.toHaveBeenCalled();
  });

  it("throws immediately if reqLevel is not a valid level", () => {
    expect(() => {
      logger.expressLogger({ parentLogger, reqLevel: "verbose" });
    }).toThrow("Invalid reqLevel");
  });

  it("logs the response on finish as info by default", () => {
    const req = {};
    const expressLogger = logger.expressLogger({ parentLogger });
    expressLogger(req, res, next);
    res.emit("finish");
    expect(req.logger.info).toHaveBeenCalledTimes(2);
    expect(req.logger.info.mock.calls[1][0]).toHaveProperty("res", res);
  });

  it("logs the response on finish at the specified resLevel", () => {
    const req = {};
    const expressLogger = logger.expressLogger({ parentLogger, resLevel: "trace" });
    expressLogger(req, res, next);
    res.emit("finish");
    expect(req.logger.trace).toHaveBeenCalledTimes(1);
    expect(req.logger.trace.mock.calls[0][0]).toHaveProperty("res", res);
  });

  it("does not log the response if resLevel is falsey", () => {
    const req = {};
    const expressLogger = logger.expressLogger({ parentLogger, resLevel: "" });
    expressLogger(req, res, next);
    res.emit("finish");
    expect(req.logger.info).not.toHaveBeenCalledTimes(2);
  });

  it("throws immediately if resLevel is not a valid level", () => {
    expect(() => {
      logger.expressLogger({ parentLogger, resLevel: "child" });
    }).toThrow("Invalid resLevel");
  });

  it("calls next() to invoke the next middleware", () => {
    const req = {};
    const expressLogger = logger.expressLogger({ parentLogger });
    expressLogger(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  describe("works with a real parent logger", () => {
    it("logs a request to the underlying stream", done => {
      const req = { connection: true, method: "GET", url: "https://example.com/api" };
      const expressLogger = logger.expressLogger({ resLevel: false });
      const stream = logger.streams[0].stream;
      const bytesWritten = stream.bytesWritten;
      expressLogger(req, res, next);
      setTimeout(() => {
        expect(stream.bytesWritten).toBeGreaterThan(bytesWritten);
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
        expect(stream.bytesWritten).toBeGreaterThan(bytesWritten);
        done();
      }, 25);
    });
  });
});
