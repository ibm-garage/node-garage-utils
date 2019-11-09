const path = require("path");
const bunyan = require("bunyan");
const PrettyStream = require("bunyan-prettystream-circularsafe");
const appEnv = require("./appEnv");
const errors = require("./errors");

const prettyStreamOptions = {
  pretty: {
    mode: (time, level, name, host, src, msg, extras, details) =>
      `[${time}] ${level}: ${msg}${extras}\n${details}`
  },
  script: {
    mode: (time, level, name, host, src, msg, extras, details) =>
      `${name.split("/")[0]}: ${msg}${extras}\n${details}`,
    useColor: false
  }
};
const formats = ["json", ...Object.keys(prettyStreamOptions)];

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
  let format = process.env.LOG_FORMAT;
  if (formats.indexOf(format) == -1) {
    format = undefined;
  }
  let level = process.env.LOG_LEVEL;
  if (levels.indexOf(level) == -1) {
    level = undefined;
  }

  if (appEnv.isTest()) {
    return createTestLogger("test", format, level);
  }
  if (appEnv.isScript()) {
    return createScriptLogger(name, format, level);
  }
  return createAppLogger(name, format, level);
}

function createStream(name, stream, format, level) {
  const options = prettyStreamOptions[format];
  if (options == null) {
    return { name, type: "stream", stream, level };
  }

  const prettyStream = new PrettyStream(options);
  prettyStream.pipe(stream);
  return { name, type: "raw", stream: prettyStream, level };
}

function createTestLogger(name, format = "pretty", level = "trace") {
  const result = bunyan.createLogger({
    name,
    serializers,
    streams: [
      { name: "testfile", path: "test.log", level },
      createStream("testerr", process.stderr, format, "warn")
    ]
  });

  result.suppressSpecErr = suppress => {
    result.levels("testerr", suppress ? 100 : "warn");
  };
  return result;
}

function createScriptLogger(name, format = "script", level = "warn") {
  return bunyan.createLogger({
    name,
    serializers,
    level,
    streams: [createStream("scriptout", process.stderr, format, level)]
  });
}

function createAppLogger(name, format = appEnv.isDev() ? "pretty" : "json", level = "debug") {
  const stream = createStream("appout", process.stdout, format, level);
  const result = bunyan.createLogger({
    name,
    serializers,
    streams: [stream]
  });

  if (appEnv.isProd() && stream.type === "raw") {
    result.warn("Do not pretty-print logs in production: ensure LOG_FORMAT is 'json' or not set");
  }
  return result;
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
