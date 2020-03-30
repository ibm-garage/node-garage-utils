const cloudEnv = {};
module.exports = cloudEnv;

// Exposed only for own unit testing. Do not use!
cloudEnv._platform = platform;
cloudEnv._port = port;

// cloudEnv holds cached platform and port, as well as functions that check for known platform
// values to avoid the need for clients to compare strings. This approach permits manipulation of
// the apparent cloud environment, particularly for testing.
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

cloudEnv.serviceCreds = (specs, required) => {
  if (!Array.isArray(specs)) {
    specs = [specs];
  }

  const cfServices = parseVcapServices();
  const result = [];
  specs.forEach((spec) => {
    const creds = handleSpec(spec, cfServices);
    if (creds != null) {
      result.push(creds);
    }
  });

  if (result.length > 1) {
    throw new Error("Multiple services found");
  }
  if (result.length == 0 && required) {
    throw new Error("No service found");
  }
  return result[0];
};

function parseVcapServices() {
  try {
    const val = JSON.parse(process.env.VCAP_SERVICES);
    return typeof val === "object" && val;
  } catch (err) {
    return false;
  }
}

function handleSpec(spec, cfServices) {
  if (typeof spec !== "object") {
    spec = { name: spec };
  }

  const type = spec.type || (cfServices ? "cf" : "env");
  switch (type) {
    case "cf":
      return handleCfSpec(spec, cfServices);
    case "env":
      return handleEnvSpec(spec);
    default:
      throw new Error(`Invalid spec type - 'cf' or 'env' expected: ${type}`);
  }
}

function handleCfSpec(spec, cfServices) {
  const { name, label } = spec;
  if (name == null && label == null) {
    throw new Error(`Invalid CF spec - name or label required: ${JSON.stringify(spec)}`);
  }

  let services = findServicesByLabel(label, cfServices);
  if (name != null) {
    services = services.filter((service) => service.name === name);
  }

  if (services.length > 1) {
    throw new Error(`Multiple services found for CF spec: ${JSON.stringify(spec)}`);
  }
  return services.length === 1 ? services[0].credentials : undefined;
}

function findServicesByLabel(label, cfServices) {
  if (label != null) {
    const services = cfServices[label];
    return Array.isArray(services) ? services : [];
  }
  const result = [];
  Object.values(cfServices).forEach((services) => result.push(...services));
  return result;
}

function handleEnvSpec(spec) {
  const { name } = spec;
  if (name == null) {
    throw new Error(`Invalid environment service spec - name required: ${JSON.stringify(spec)}`);
  }

  const val = process.env[name];
  if (val != null) {
    try {
      const creds = JSON.parse(val);
      if (typeof creds === "object") {
        return creds;
      }
    } catch (err) {
      // Fall through to throw more helpful error
    }
    throw new Error(`Invalid creds environment variable - JSON object expected: ${name}`);
  }
}
