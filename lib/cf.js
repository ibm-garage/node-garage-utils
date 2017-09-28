'use strict';

const path = require('path');
const fs = require('fs');
const cfenv = require('cfenv');
const winston = require('winston');
const app = require('./app');

const cf = {};
module.exports = cf;

// Exposed only for own unit testing. Do not change!
cf._appEnv = undefined;

cf.getAppEnv = () => {
  if (!cf._appEnv) {
    try {
      const servicesFile = path.join(app.config.rootDir, 'services.json');
      const services = JSON.parse(fs.readFileSync(servicesFile, 'utf8'));
      winston.info('Read local services.json definition');
      cf._appEnv = cfenv.getAppEnv({ vcap: { services } });
    } catch (err) {
      winston.info('No local services.json definition available');
      cf._appEnv = cfenv.getAppEnv();
    }
    addFunctions(cf._appEnv);
  }
  return cf._appEnv;
};

// Mock services for application testing.
// Returns unmock() function
cf.mock = servicesFile => {
  if (servicesFile) {
    const services = JSON.parse(fs.readFileSync(servicesFile, 'utf8'));
    cf._appEnv = cfenv.getAppEnv({ vcap: { services } });
  } else {
    cf._appEnv = cfenv.getAppEnv();
  }
  addFunctions(cf._appEnv);

  return () => {
    cf._appEnv = undefined;
  };
};

function addFunctions(appEnv) {
  appEnv.getServiceCredsByLabel = labelSpec => {
    const services = getServiceInstances(appEnv.services, labelSpec);
    if (!services || services.length == 0) {
      throw noServiceError(appEnv, labelSpec);
    }
    if (services.length > 1) {
      throw new Error('Multiple instances of service found: ' + labelSpec);
    }
    const creds = services[0].credentials;
    return creds || {};
  };

  appEnv.getServiceCredsByName = nameSpec => {
    const creds = appEnv.getServiceCreds(nameSpec);
    if (!creds) {
      throw noServiceError(appEnv, nameSpec);
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

function noServiceError(appEnv, spec) {
  let msg = 'Service not found: ' + spec;
  if (appEnv.isLocal) {
    msg += ' (local services.json definition missing?)';
  }
  return new Error(msg);
}
