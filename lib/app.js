'use strict';

const path = require('path');

const app = {};
module.exports = app;

// Exposed only for own unit testing. Do not change!
app._dir = __dirname;

// App environment holds cached values for rootDir(), isTest(), and isDev().
// Use this, instead of calling the methods directly, to allow manipulation of
// the apparent environment, especially for testing.
app.env = {
  rootDir: rootDir(),
  isTest: isTest(),
  isDev: isDev()
};

app.rootDir = rootDir;

function rootDir() {
  const dir = app._dir;

  // Normal case: when run as a module in node_modules
  const nm = path.sep + 'node_modules' + path.sep;
  const nmi = dir.indexOf(nm);
  if (nmi != -1) {
    return dir.substring(0, nmi);
  }

  // Development case: when run as its own application
  const lib = path.sep + 'lib';
  const i = dir.lastIndexOf(lib);
  if (i != -1 && i == dir.length - lib.length) {
    return dir.substring(0, i);
  }

  throw new Error('Cannot determine app root dir due to invalid location of app.js');
}

app.isTest = isTest;

function isTest() {
  const mochaFilename = rootDir() + '/node_modules/mocha/bin/_mocha';
  return require.main.filename == mochaFilename;
}

// Corresponds exactly to Express's interpretation of NODE_ENV
app.isDev = isDev;

function isDev() {
  const env = process.env.NODE_ENV;
  return env != 'production';
}
