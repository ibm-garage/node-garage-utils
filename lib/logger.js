const path = require("path");
const bunyan = require("bunyan");
const PrettyStream = require("bunyan-prettystream-circularsafe");
const appEnv = require("./appEnv");
const errors = require("./errors");

const levels = ["trace", "debug", "info", "warn", "error", "fatal"];

function createSerializer(options = {}) {
  const { testProp, includeProps = [testProp], computeProps = {}, redactProps = [] } = options;
  return obj => {
    if (obj == null || typeof obj != "object" || typeof obj[testProp] == "undefined") {
      return obj;
    }

    const result = {};
    includeProps.forEach(prop => {
      const val = obj[prop];
      if (typeof val != "undefined") {
        result[prop] = deepCopy(val, redactProps);
      }
    });

    Object.keys(computeProps).forEach(prop => {
      const val = computeProps[prop](obj);
      if (typeof val != "undefined") {
        result[prop] = deepCopy(val, redactProps);
      }
    });
    return result;
  };
}

function deepCopy(val, redactProps) {
  if (Array.isArray(val)) {
    return val.map(i => deepCopy(i, redactProps));
  }
  if (val == null || typeof val != "object") {
    return val;
  }

  const result = {};
  Object.keys(val).forEach(prop => {
    if (redactProps.indexOf(prop) != -1) {
      result[prop] = "*****";
    } else {
      result[prop] = deepCopy(val[prop], redactProps);
    }
  });
  return result;
}

const serializers = {
  err: createSerializer({
    testProp: "stack",
    includeProps: ["message", "name", "code", "signal"],
    computeProps: { stack: err => errors.stackWithCause(err) }
  }),
  req: createSerializer({
    testProp: "connection",
    includeProps: ["method", "url", "headers"],
    redactProps: ["authorization"]
  }),
  res: createSerializer({
    testProp: "getHeaders",
    includeProps: ["statusCode"],
    computeProps: { header: res => res.getHeaders() },
    redactProps: ["authorization"]
  })
};

function createLogger() {
  const name = path.basename(appEnv.mainFile, ".js");
  let level = process.env.LOG_LEVEL;
  if (level && levels.indexOf(level) == -1) {
    level = undefined;
  }

  if (appEnv.isTest()) {
    return createTestLogger("test", level);
  }
  if (appEnv.isScript()) {
    return createScriptLogger(name, level);
  }
  return createAppLogger(name, level);
}

function createTestLogger(name, level) {
  const format = (time, level, name, host, src, msg, extras, details) => {
    return `[${time}] ${name} ${level}: ${msg}${extras}\n${details}`;
  };
  const testerr = new PrettyStream({ mode: format });
  testerr.pipe(process.stderr);

  const result = bunyan.createLogger({
    name,
    serializers,
    streams: [
      { name: "testfile", path: "test.log", level: level || "trace" },
      { name: "testerr", type: "raw", stream: testerr, level: "warn" }
    ]
  });

  result.suppressSpecErr = suppress => {
    result.levels("testerr", suppress ? 100 : "warn");
  };
  return result;
}

function createScriptLogger(name, level) {
  const format = (time, level, name, host, src, msg, extras, details) => {
    return `${name.split("/")[0]}: ${msg}${extras}\n${details}`;
  };
  const scriptout = new PrettyStream({ mode: format, useColor: false });
  scriptout.pipe(process.stderr);

  return bunyan.createLogger({
    name,
    serializers,
    level,
    streams: [{ name: "scriptout", type: "raw", stream: scriptout, level: level || "warn" }]
  });
}

function createAppLogger(name, level) {
  return bunyan.createLogger({
    name,
    serializers,
    streams: [{ name: "appout", stream: process.stdout, level: level || "debug" }]
  });
}

const logger = createLogger();
module.exports = logger;
logger.createSerializer = createSerializer;
logger.defaultSerializers = serializers;

// Exposed only for own unit testing. Do not use!
logger._createLogger = () => createLogger();

logger.expressLogger = expressLogger;

function expressLogger(options = {}) {
  // parentLogger was originally called baseLogger. It was renamed before any known clients began
  // using it, but backwards compatibility has been maintained.
  const {
    baseLogger = logger,
    childOptions = {},
    childSimple = true,
    reqLevel = "info",
    resLevel = "info"
  } = options;
  const { parentLogger = baseLogger } = options;

  if (reqLevel && levels.indexOf(reqLevel) == -1) {
    throw new Error(`Invalid reqLevel: must be one of ${levels.join(", ")}`);
  }
  if (resLevel && levels.indexOf(resLevel) == -1) {
    throw new Error(`Invalid resLevel: must be one of ${levels.join(", ")}`);
  }

  return (req, res, next) => {
    const options = Object.assign({}, childOptions);
    if (req.id != null) {
      options.req_id = req.id;
    }
    const reqLogger = parentLogger.child(options, childSimple);
    req.logger = reqLogger;

    if (reqLevel) {
      const log = reqLogger[reqLevel].bind(reqLogger);
      log({ req }, "Request received");
    }

    if (resLevel) {
      const log = reqLogger[resLevel].bind(reqLogger);
      res.on("finish", function() {
        log({ res }, "Response sent");
      });
    }
    next();
  };
}
