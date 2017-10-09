'use strict';

const path = require('path');
const fs = require('fs');
const cfenv = require('cfenv');
const appEnv = require('./appEnv');
const logger = require('./logger');

const cf = {};
module.exports = cf;

// Exposed only for own unit testing. Do not use!
cf._cfEnv = undefined;

cf.cfEnv = () => {
  if (!cf._cfEnv) {
    const options = {};
    if (!process.env.VCAP_SERVICES) {
      try {
        const servicesFile = path.join(appEnv.rootDir, 'services.json');
        const services = JSON.parse(fs.readFileSync(servicesFile, 'utf8'));
        options.vcap = { services };
        logger.info('Read local services.json definition');
      } catch (err) {
        logger.info('No VCAP_SERVICES or services.json available');
      }
    }
    cf._cfEnv = cfenv.getAppEnv(options);
    addFunctions(cf._cfEnv);
  }
  return cf._cfEnv;
};

function addFunctions(cfEnv) {
  cfEnv.getServiceCredsByLabel = labelSpec => {
    const services = getServiceInstances(cfEnv.services, labelSpec);
    if (!services || services.length == 0) {
      throw noServiceError(cfEnv, labelSpec);
    }
    if (services.length > 1) {
      throw new Error('Multiple instances of service found: ' + labelSpec);
    }
    const creds = services[0].credentials;
    return creds || {};
  };

  cfEnv.getServiceCredsByName = nameSpec => {
    const creds = cfEnv.getServiceCreds(nameSpec);
    if (!creds) {
      throw noServiceError(cfEnv, nameSpec);
    }
    return creds;
  };
}

function getServiceInstances(services, labelSpec) {
  if (Object.prototype.toString.call(labelSpec) != '[object RegExp]') {
    return services[labelSpec];
  }

  for (const label in services) {
    if (services.hasOwnProperty(label) && labelSpec.test(label)) {
      return services[label];
    }
  }
  return undefined;
}

function noServiceError(cfEnv, spec) {
  let msg = 'Service not found: ' + spec;
  if (cfEnv.isLocal) {
    msg += ' (local services.json definition missing?)';
  }
  return new Error(msg);
}
