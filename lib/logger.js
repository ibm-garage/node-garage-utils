'use strict';

const log4js = require('log4js');
const app = require('./app');

const cfLayout = { type: 'pattern', pattern: '[%p] %m' };
const localLayout = { type: 'pattern', pattern: '%[%d{ISO8601_WITH_TZ_OFFSET} [%p]%] %m' };
const fileLayout = { type: 'pattern', pattern: '%d{ISO8601_WITH_TZ_OFFSET} [%p] %m' };

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

function configure() {
  const configuration = app.config.isSpec()
    ? specConfiguration
    : process.env.VCAP_APPLICATION ? cfAppConfiguration : localAppConfiguration;
  log4js.configure(configuration);
}

const levels = ['all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal', 'off'];
const defaultLevel = app.config.isSpec() ? 'all' : app.config.isProd() ? 'info' : 'debug';

// In spec mode, the client can switch between two loggers. In app mode, there is a single logger.
let loggers;
let activeLogger;

function init() {
  if (!loggers) {
    configure();
    loggers = [log4js.getLogger()];
    if (app.config.isSpec()) {
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

logger.log = (...args) => getLogger().log(...args);
logger.trace = (...args) => getLogger().trace(...args);
logger.debug = (...args) => getLogger().debug(...args);
logger.info = (...args) => getLogger().info(...args);
logger.warn = (...args) => getLogger().warn(...args);
logger.error = (...args) => getLogger().error(...args);
logger.fatal = (...args) => getLogger().fatal(...args);

logger.setLevel = (level = defaultLevel) => {
  init();
  setLevel(level);
};

logger.suppressSpecErr = suppress => {
  init();
  if (app.config.isSpec()) {
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
