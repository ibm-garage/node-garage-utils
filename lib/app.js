'use strict';

const path = require('path');

const app = {};
module.exports = app;

// Exposed only for own unit testing. Do not change!
app._dir = __dirname;

// App config holds cached values for rootDir() and env(), as well as functions
// that check for known values of env() to avoid the need for string comparisons.
// Use this, instead of calling the app methods directly, to allow manipulation
// of the apparent configuration, especially for testing.

app.config = {
  rootDir: rootDir(),
  isSpec: () => isSpec(rootDir()),
  env: env(),
  isUnit: () => app.config.env === 'unit',
  isDev: () => app.config.env === 'dev',
  isTest: () => app.config.env === 'test',
  isProd: () => app.config.env === 'prod'
};

function isSpec(rootDir) {
  const mochaFilename = path.join(rootDir, 'node_modules', 'mocha', 'bin', '_mocha');
  return require.main.filename == mochaFilename;
}

app.rootDir = rootDir;

function rootDir() {
  const dir = app._dir;

  // Ideal case: when run as a module in node_modules
  const nm = path.sep + 'node_modules' + path.sep;
  const nmi = dir.indexOf(nm);
  if (nmi != -1) {
    return dir.substring(0, nmi);
  }

  // Stopgap case: when run as a module in user_modules
  const um = path.sep + 'user_modules' + path.sep;
  const umi = dir.indexOf(um);
  if (umi != -1) {
    return dir.substring(0, umi);
  }

  // Development case: when run as its own application
  const lib = path.sep + 'lib';
  const i = dir.lastIndexOf(lib);
  if (i != -1 && i == dir.length - lib.length) {
    return dir.substring(0, i);
  }

  throw new Error('Cannot determine app root dir due to invalid location of app.js');
}

app.env = env;

function env() {
  const gappEnv = process.env.GAPP_ENV;
  if (gappEnv) {
    return gappEnv;
  }
  return isSpec(rootDir()) ? 'unit' : process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
}
