const path = require("path");
const bunyan = require("bunyan");
const PrettyStream = require("bunyan-prettystream-circularsafe");
const appEnv = require("./appEnv");
const errors = require("./errors");

const levels = ["trace", "debug", "info", "warn", "error", "fatal"];

const serializers = {
  err: err => {
    if (!err || !err.stack) return err;
    const result = copyDefined(err, ["message", "name", "code", "signal"]);
    result.stack = errors.stackWithCause(err);
    return result;
  },
  req: req => {
    if (!req || !req.connection) return req;
    return copyDefined(req, ["method", "url", "headers"]);
  },
  res: res => {
    if (!res || !res.getHeaders) return res;
    const result = copyDefined(res, ["statusCode"]);
    result.header = res.getHeaders();
    return result;
  }
};

function copyDefined(src, props, targ = {}) {
  props.forEach(prop => {
    const val = src[prop];
    if (typeof val !== "undefined") {
      targ[prop] = val;
    }
  });
  return targ;
}

function createLogger() {
  const name = path.basename(appEnv.mainFile, ".js");
  let level = process.env.LOG_LEVEL;
  if (level && levels.indexOf(level) == -1) {
    level = undefined;
  }

  if (appEnv.isSpec()) {
    return createSpecLogger("test", level);
  }
  if (appEnv.isScript()) {
    return createScriptLogger(name, level);
  }
  return createAppLogger(name, level);
}

function createSpecLogger(name, level) {
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
logger.defaultSerializers = serializers;

// Exposed only for own unit testing. Do not use!
logger._createLogger = () => createLogger();

logger.expressLogger = expressLogger;

function expressLogger(options = {}) {
  const { baseLogger = logger, reqLevel = "info", resLevel = "info" } = options;
  const { parentLogger = baseLogger } = options;

  if (reqLevel && levels.indexOf(reqLevel) == -1) {
    throw new Error(`Invalid reqLevel: must be one of ${levels.join(", ")}`);
  }
  if (resLevel && levels.indexOf(resLevel) == -1) {
    throw new Error(`Invalid resLevel: must be one of ${levels.join(", ")}`);
  }

  return (req, res, next) => {
    const options = req.id != null ? { req_id: req.id } : {};
    req.logger = parentLogger.child(options, true);
    if (reqLevel) {
      const log = req.logger[reqLevel];
      log({ req }, "Request received");
    }
    if (resLevel) {
      const log = req.logger[resLevel];
      res.on("finish", function() {
        log({ res }, "Response sent");
      });
    }
    next();
  };
}
