const path = require("path");
const fs = require("fs");

const appEnv = {};
module.exports = appEnv;

// Exposed only for own unit testing. Do not use!
appEnv._dir = __dirname;
appEnv._rootDir = rootDir;
appEnv._version = version;
appEnv._env = env;

// appEnv holds cached mainFile, rootDir, version, and env values, as well as
// functions that check for known values of env to avoid the need for clients
// to compare strings. This approach permits manipulation of the apparent
// environment, particularly for testing.
appEnv.reset = () => {
  appEnv.mainFile = require.main.filename;
  appEnv.rootDir = rootDir();
  appEnv.version = version();
  appEnv.env = env();
};
appEnv.reset();

appEnv.isDev = () => appEnv.env === "development";
appEnv.isProd = () => appEnv.env === "production";
appEnv.isTest = () => appEnv.env === "test";
appEnv.isScript = () => appEnv.env === "script";

// Try to find the app root starting from this module's location or, failing
// that, the entry point location.
function rootDir() {
  let dir = findRootDir(appEnv._dir);
  if (dir == null) {
    dir = findRootDir(updir(appEnv.mainFile));
  }
  return dir;
}

// Walk up to a directory containing package.json, passing through any whose
// parent is node_modules.
function findRootDir(startDir) {
  let dir = findPackageRootDir(startDir);
  while (dir && isPackageRoot(dir)) {
    const parent = updir(dir);
    if (!parent || path.basename(parent) !== "node_modules") {
      return dir;
    }
    dir = updir(parent);
  }
}

// Walk up to a directory containing package.json.
function findPackageRootDir(startDir) {
  let dir = startDir;
  while (dir) {
    if (isPackageRoot(dir)) {
      return dir;
    }
    dir = updir(dir);
  }
}

function updir(dir) {
  if (!dir) return false;
  const up = path.dirname(dir);
  return up === dir ? false : up;
}

function isPackageRoot(dir) {
  const packageFile = path.join(dir, "package.json");
  return fs.existsSync(packageFile);
}

function version() {
  if (appEnv.rootDir == null) return;
  try {
    const packageFile = path.join(appEnv.rootDir, "package.json");
    const manifest = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    return manifest.version;
  } catch (err) {
    return;
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
  const moduleBinDir = path.resolve(appEnv._dir, "..", "bin") + path.sep;
  return (
    mainFile.startsWith(moduleBinDir) ||
    mainFile.startsWith(path.join(appEnv.rootDir, "bin") + path.sep) ||
    mainFile.startsWith(path.join(appEnv.rootDir, "scripts") + path.sep)
  );
}
