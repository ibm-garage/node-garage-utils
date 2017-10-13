'use strict';

const path = require('path');
const log4js = require('log4js');
const appEnv = require('./appEnv');

const cfLayout = { type: 'pattern', pattern: '[%p] %m' };
const localLayout = { type: 'pattern', pattern: '%[%d{ISO8601_WITH_TZ_OFFSET} [%p]%] %m' };
const fileLayout = { type: 'pattern', pattern: '%d{ISO8601_WITH_TZ_OFFSET} [%p] %m' };
const scriptLayout = {
  type: 'pattern',
  pattern: '%x{command}: %m',
  tokens: { command: () => name }
};

const localAppConfiguration = {
  appenders: {
    localAppOut: { type: 'stdout', layout: localLayout }
  },
  categories: {
    default: {
      appenders: ['localAppOut'],
      level: 'all'
    }
  }
};

const cfAppConfiguration = {
  appenders: {
    cfAppOut: { type: 'stdout', layout: cfLayout }
  },
  categories: {
    default: {
      appenders: ['cfAppOut'],
      level: 'all'
    }
  }
};

const specConfiguration = {
  // specErr wraps and filters _specErr so as to only let through warn, error, and fatal
  appenders: {
    specFile: { type: 'fileSync', layout: fileLayout, filename: 'test.log' },
    _specErr: { type: 'stderr', layout: localLayout },
    specErr: { type: 'logLevelFilter', level: 'warn', appender: '_specErr' }
  },
  categories: {
    default: {
      appenders: ['specFile', 'specErr'],
      level: 'all'
    },
    supressSpecErr: {
      appenders: ['specFile'],
      level: 'all'
    }
  }
};

const scriptConfiguration = {
  appenders: {
    scriptErr: { type: 'stderr', layout: scriptLayout }
  },
  categories: {
    default: {
      appenders: ['scriptErr'],
      level: 'all'
    }
  }
};

const configurations = {
  localApp: localAppConfiguration,
  cfApp: cfAppConfiguration,
  spec: specConfiguration,
  script: scriptConfiguration
};

const levels = ['all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal', 'off'];

let configuration;
let defaultLevel;
let name;

// In spec mode, the client can switch between two loggers. Otherwise, there is a single logger.
let loggers;
let activeLogger;

function reset() {
  configuration = undefined;
  defaultLevel = undefined;
  name = undefined;
  loggers = undefined;
  activeLogger = undefined;
}

function configure(options = {}) {
  if (!configuration) {
    configuration = selectConfiguration(options.type);
    defaultLevel = computeDefaultLevel(configuration);
    name = options.name || path.basename(appEnv.mainFile, '.js');
    log4js.configure(configuration);
  }
}

function selectConfiguration(type) {
  if (type == 'app') {
    return appConfiguration();
  }
  return (type && configurations[type]) || defaultConfiguration();
}

function defaultConfiguration() {
  return appEnv.isSpec()
    ? specConfiguration
    : appEnv.isScript() ? scriptConfiguration : appConfiguration();
}

function appConfiguration() {
  return process.env.VCAP_APPLICATION ? cfAppConfiguration : localAppConfiguration;
}

function computeDefaultLevel(config) {
  const level = process.env.LOG_LEVEL;
  if (level && levels.indexOf(level) != -1) {
    return level;
  }
  if (config == specConfiguration) {
    return 'all';
  }
  if (config == scriptConfiguration) {
    return 'warn';
  }
  return appEnv.isProd() ? 'info' : 'debug';
}

function init() {
  if (!loggers) {
    configure();
    loggers = [log4js.getLogger()];
    if (appEnv.isSpec()) {
      loggers.push(log4js.getLogger('supressSpecErr'));
    }
    activeLogger = loggers[0];
    setLevel();
  }
}

function setLevel(level = defaultLevel) {
  if (levels.indexOf(level) != -1) {
    loggers.forEach(l => (l.level = level));
  }
}

function getLogger() {
  init();
  return activeLogger;
}

const logger = {};
module.exports = logger;

// Exposed only for own unit testing. Do not use!
logger._reset = () => reset();
logger._settings = () => {
  return { defaultLevel, name };
};

logger.configure = options => configure(options);
logger.setLevel = level => {
  init();
  setLevel(level);
};

logger.log = (...args) => getLogger().log(...args);
logger.trace = (...args) => getLogger().trace(...args);
logger.debug = (...args) => getLogger().debug(...args);
logger.info = (...args) => getLogger().info(...args);
logger.warn = (...args) => getLogger().warn(...args);
logger.error = (...args) => getLogger().error(...args);
logger.fatal = (...args) => getLogger().fatal(...args);

logger.suppressSpecErr = suppress => {
  init();
  if (configuration == specConfiguration) {
    activeLogger = loggers[suppress ? 1 : 0];
  } else {
    activeLogger.warn('Use of suppressSpecErr() is disallowed except in test code');
  }
};

const defaultFormat = ':remote-addr :method :url HTTP/:http-version :status - :response-time ms';

logger.connectLogger = ({ level = 'debug', format = defaultFormat, nolog } = {}) => {
  init();
  return log4js.connectLogger(activeLogger, { level, format, nolog });
};
