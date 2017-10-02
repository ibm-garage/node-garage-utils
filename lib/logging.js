'use strict';

const util = require('util');
const moment = require('moment');
const winston = require('winston');
const app = require('./app');
const errors = require('./errors');

const logging = {};
module.exports = logging;

// A formatter function for use with Winston. Use this for readable, consistent
// logging across an application.
//
// options:
//   timestamp: true, false, or a function that returns a formatted timestamp
//   level: a logging level, typically error, warn, info, verbose, debug, or silly
//   label: a component label or null for none
//   message: a log message or an empty string for none
//   meta: an object containing additional information, may be or contain an error
logging.formatter = options => {
  return (
    formatTimestamp(options.timestamp) +
    formatLevel(options.level) +
    formatLabel(options.label) +
    formatMessage(options.message, options.meta)
  );
};

function formatTimestamp(timestamp) {
  if (timestamp === true) {
    return moment().format('YYYY-MM-DDTHH:mm:ss.SSZZ') + ' ';
  }
  if (typeof timestamp === 'function') {
    return timestamp() + ' ';
  }
  return '';
}

function formatLevel(level) {
  return level ? '[' + level.toUpperCase() + '] ' : '';
}

function formatLabel(label) {
  return label ? '[' + label + '] ' : '';
}

function formatMessage(message, meta) {
  let error;
  if (typeof meta === 'object') {
    // If metadata is an error, or has one in an error property, remove it for separate handling.
    if (meta.stack) {
      error = meta;
      meta = undefined;
    } else if (typeof meta.error === 'object' && meta.error.stack) {
      error = meta.error;
      delete meta.error;
    }

    // Metadata is an empty object by default; replace by undefined for easier handling.
    if (meta && Object.keys(meta).length == 0) {
      meta = undefined;
    }
  }

  // Only put the metadata on a separate line if it spans lines, itself.
  // Strip out CRs, which were included in Node 6.4.0: https://github.com/nodejs/node/issues/8163
  const formattedMeta = util.inspect(meta).replace(/\r/g, '');
  const multiMeta = formattedMeta.indexOf('\n') != -1;
  let result = '';

  if (message) {
    result += message;
    if (meta && !multiMeta) {
      result += ' ';
    } else if (meta || error) {
      result += '\n  ';
    }
  }

  if (meta) {
    result += multiMeta ? indent(formattedMeta) : formattedMeta;
    if (error) {
      result += '\n  ';
    }
  }

  if (error) {
    result += indent(errors.stackWithCause(error));
  }
  return result;
}

function indent(text) {
  return text.replace(/(\r\n|\n|\r)/gm, '$1  ');
}

logging.configureWinston = cfAppEnv => {
  const level = app.config.isProd() ? 'verbose' : 'debug';
  const formatter = logging.formatter;
  const timestamp = !cfAppEnv || cfAppEnv.isLocal;
  const transport = new winston.transports.Console({ level, formatter, timestamp });
  winston.configure({ transports: [transport] });
};

logging.configureWinstonForTests = (suppressConsoleWarn, filename = 'test.log') => {
  const formatter = logging.formatter;
  const timestamp = true;
  const transports = [];
  transports.push(
    new winston.transports.File({ level: 'silly', filename, json: false, formatter, timestamp })
  );
  if (!suppressConsoleWarn) {
    transports.push(new winston.transports.Console({ level: 'warn', formatter, timestamp }));
  }
  winston.configure({ transports });
};

logging.morganToWinstonStream = (level = 'verbose') => {
  return {
    write: message => {
      winston.log(level, message.trim());
    }
  };
};
