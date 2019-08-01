const cloudEnv = {};
module.exports = cloudEnv;

// Exposed only for own unit testing. Do not use!
cloudEnv._platform = platform;
cloudEnv._port = port;

// cloudEnv holds cached platform and port values, as well as functions that
// check for known platform values to avoid the need for clients to compare
// strings. This approach permits manipulation of the apparent cloud
// environment, particularly for testing.
cloudEnv.reset = () => {
  cloudEnv.platform = platform();
  cloudEnv.port = port();
};
cloudEnv.reset();

cloudEnv.isCf = () => cloudEnv.platform === "cf";
cloudEnv.isKube = () => cloudEnv.platform === "kube";

function platform() {
  if (process.env.VCAP_APPLICATION) return "cf";
  if (process.env.KUBERNETES_SERVICE_HOST) return "kube";
}

function port() {
  return process.env.PORT || "3000";
}
