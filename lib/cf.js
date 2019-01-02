const cfenv = require("cfenv");

const cf = {};
module.exports = cf;

cf.cfEnv = options => {
  const cfEnv = cfenv.getAppEnv(options);
  addFunctions(cfEnv);
  return cfEnv;
};

function addFunctions(cfEnv) {
  cfEnv.getServiceCredsByLabel = (labelSpec, required) => {
    const services = getServiceInstances(cfEnv.services, labelSpec);
    if (!services || services.length == 0) {
      if (required) {
        throw noServiceError(cfEnv, labelSpec);
      }
      return null;
    }
    if (services.length > 1) {
      throw new Error("Multiple instances of service found: " + labelSpec);
    }
    const creds = services[0].credentials;
    return creds || {};
  };

  cfEnv.getServiceCredsByName = (nameSpec, required) => {
    const creds = cfEnv.getServiceCreds(nameSpec);
    if (required && !creds) {
      throw noServiceError(cfEnv, nameSpec);
    }
    return creds;
  };
}

function getServiceInstances(services, labelSpec) {
  if (typeof labelSpec === "string") {
    return services[labelSpec];
  }

  for (const label in services) {
    if (services.hasOwnProperty(label) && labelSpec.test(label)) {
      return services[label];
    }
  }
}

function noServiceError(cfEnv, spec) {
  let msg = "Service not found: " + spec;
  if (cfEnv.isLocal) {
    msg += " (have you configured your local environment with CF services?)";
  }
  return new Error(msg);
}
