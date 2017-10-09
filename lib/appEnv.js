'use strict';

const path = require('path');

const appEnv = {};
module.exports = appEnv;

// Exposed only for own unit testing. Do not use!
appEnv._dir = __dirname;
appEnv._rootDir = rootDir;
appEnv._env = env;

// appEnv holds cached rootDir, mainFile, and env values, as well as functions
// that check for known values of env to avoid the need for string comparisons.
// This approach permits manipulation of the apparent environment, particularly
// for testing.
appEnv.reset = () => {
  appEnv.rootDir = rootDir();
  appEnv.mainFile = require.main.filename;
  appEnv.env = env();
};
appEnv.reset();

appEnv.isSpec = () => isSpec();
appEnv.isScript = () => isScript();
appEnv.isUnit = () => appEnv.env === 'unit';
appEnv.isDev = () => appEnv.env === 'dev';
appEnv.isTest = () => appEnv.env === 'test';
appEnv.isProd = () => appEnv.env === 'prod';

function isSpec() {
  const mochaFilename = path.join(appEnv.rootDir, 'node_modules', 'mocha', 'bin', '_mocha');
  return appEnv.mainFile == mochaFilename;
}

function isScript() {
  const mainFile = appEnv.mainFile;
  const moduleBinDir = path.normalize(path.join(appEnv._dir, '..', 'bin'));
  return (
    mainFile.startsWith(moduleBinDir) ||
    mainFile.startsWith(path.join(appEnv.rootDir, 'bin')) ||
    mainFile.startsWith(path.join(appEnv.rootDir, 'scripts'))
  );
}

function rootDir() {
  const dir = appEnv._dir;

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

function env() {
  const gappEnv = process.env.GAPP_ENV;
  if (gappEnv) {
    return gappEnv;
  }
  if (isSpec()) {
    return 'unit';
  }
  return process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
}
