const path = require("path");
const fs = require("fs");

const appEnv = {};
module.exports = appEnv;

// Exposed only for own unit testing. Do not use!
appEnv._dir = __dirname;
appEnv._rootDir = rootDir;
appEnv._version = version;
appEnv._env = env;

// appEnv holds cached rootDir, mainFile, and env values, as well as functions
// that check for known values of env to avoid the need for string comparisons.
// This approach permits manipulation of the apparent environment, particularly
// for testing.
appEnv.reset = () => {
  appEnv.rootDir = rootDir();
  appEnv.mainFile = require.main.filename;
  appEnv.version = version();
  appEnv.env = env();
};
appEnv.reset();

appEnv.isDev = () => appEnv.env === "development";
appEnv.isProd = () => appEnv.env === "production";
appEnv.isTest = () => appEnv.env === "test";
appEnv.isScript = () => appEnv.env === "script";

function rootDir() {
  const dir = appEnv._dir;

  // Usual case: when run as a module in node_modules
  const nm = path.sep + "node_modules" + path.sep;
  const nmi = dir.indexOf(nm);
  if (nmi != -1) {
    return dir.substring(0, nmi);
  }

  // Development case: when run as its own application
  const lib = path.sep + "lib";
  const i = dir.lastIndexOf(lib);
  if (i != -1 && i == dir.length - lib.length) {
    return dir.substring(0, i);
  }

  throw new Error("Cannot determine app root dir due to invalid location of appEnv.js");
}

function version() {
  try {
    const packageFile = path.join(appEnv.rootDir, "package.json");
    const manifest = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    return manifest.version;
  } catch (err) {
    return undefined;
  }
}

function env() {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv) return nodeEnv;
  if (isSpec()) return "test";
  if (isScript()) return "script";
}

function isSpec() {
  return appEnv.mainFile.endsWith(path.sep + "_mocha");
}

function isScript() {
  const mainFile = appEnv.mainFile;
  const moduleBinDir = path.normalize(path.join(appEnv._dir, "..", "bin"));
  return (
    mainFile.startsWith(moduleBinDir) ||
    mainFile.startsWith(path.join(appEnv.rootDir, "bin")) ||
    mainFile.startsWith(path.join(appEnv.rootDir, "scripts"))
  );
}
