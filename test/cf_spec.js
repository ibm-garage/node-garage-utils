'use strict';

const chai = require('chai');
const expect = chai.expect;
const path = require('path');
const utils = require('../index');

const app = utils.app;
const cf = utils.cf;

const cloudantCreds = {
  host: 'host-bluemix.cloudant.com',
  password: 'passw0rd',
  port: 443,
  url: 'https://user:passw0rd@host-bluemix.cloudant.com',
  username: 'user'
};

const userProvidedCreds = {
  host: 'service1.com',
  url: 'https://service1.com/api/v1'
};

const vcapServices =
  '{"discovery":[{"credentials":{"password":"passw0rd","url":"https://gateway.watsonplatform.net/discovery/api","username":"user"},"label":"discovery","name":"cyberguardian-discovery","plan":"lite","provider":null,"syslog_drain_url":null}]}';

const rootDir = app.rootDir();
const testDir = path.join(rootDir, 'test');

function mockServicesFile(mock) {
  // Adjust app root dir so that test mock services.json is found
  app.config.rootDir = mock ? testDir : rootDir;
}

describe('cf', () => {
  beforeEach(() => {
    cf._appEnv = undefined;
  });

  afterEach(() => {
    mockServicesFile(false);
    cf._appEnv = undefined;
    delete process.env.VCAP_SERVICES;
  });

  describe('getAppEnv()', () => {
    it('returns an app env with expected properties', () => {
      const appEnv = cf.getAppEnv();
      expect(appEnv.app).to.deep.equal({});
      expect(appEnv.services).to.deep.equal({});
      expect(appEnv.name).to.not.be.undefined;
      expect(appEnv.isLocal).to.be.true;
      expect(appEnv.getServiceCredsByLabel).to.be.a('function');
      expect(appEnv.getServiceCredsByName).to.be.a('function');
    });

    it('uses VCAP_SERVICES environment variable to populate app env services if set', () => {
      process.env.VCAP_SERVICES = vcapServices;
      const appEnv = cf.getAppEnv();
      expect(appEnv.services.discovery).to.have.lengthOf(1);
    });

    it('uses services.json file to populate app env services if found', () => {
      mockServicesFile(true);
      const appEnv = cf.getAppEnv();
      expect(appEnv.services.cloudantNoSQLDB).to.have.lengthOf(1);
      expect(appEnv.services['user-provided']).to.have.lengthOf(2);
    });

    it('uses VCAP_SERVICES and ignores services.json if both are found', () => {
      mockServicesFile(true);
      process.env.VCAP_SERVICES = vcapServices;
      const appEnv = cf.getAppEnv();
      expect(appEnv.services.discovery).to.have.lengthOf(1);
      expect(appEnv.services.cloudantNoSQLDB).to.be.undefined;
      expect(appEnv.services['user-provided']).to.be.undefined;
    });

    it('returns an app env with no services when neither VCAP_SERVICES nor services.json is not found', () => {
      const appEnv = cf.getAppEnv();
      expect(appEnv.services).to.be.empty;
    });
  });

  describe('getServiceCredsByLabel()', () => {
    describe('when the app env has no services', () => {
      it('throws an error for a service label', () => {
        const fn = () => {
          cf.getAppEnv().getServiceCredsByLabel('cloudantNoSQLDB');
        };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a service label regexp', () => {
        const fn = () => {
          cf.getAppEnv().getServiceCredsByLabel(/NoSQL/);
        };
        expect(fn).to.throw(/Service not found/);
      });
    });

    describe('when the app env has services', () => {
      beforeEach(() => {
        mockServicesFile(true);
      });

      afterEach(() => {
        mockServicesFile(false);
      });

      it('returns credentials for a service label', () => {
        const creds = cf.getAppEnv().getServiceCredsByLabel('cloudantNoSQLDB');
        expect(creds).to.deep.equal(cloudantCreds);
      });

      it('returns credentials for a regexp that matches a service label', () => {
        const creds = cf.getAppEnv().getServiceCredsByLabel(/NoSQL/);
        expect(creds).to.deep.equal(cloudantCreds);
      });

      it('throws an error for a non-existent service label', () => {
        const fn = () => {
          cf.getAppEnv().getServiceCredsByLabel('badService');
        };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a regexp that does not match a service label', () => {
        const fn = () => {
          cf.getAppEnv().getServiceCredsByLabel(/badService/);
        };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a service label with multiple instances', () => {
        const fn = () => {
          cf.getAppEnv().getServiceCredsByLabel('user-provided');
        };
        expect(fn).to.throw(/Multiple instances of service found/);
      });

      it('throws an error for a regexp that matches a service label with multiple instances', () => {
        const fn = () => {
          cf.getAppEnv().getServiceCredsByLabel(/user/);
        };
        expect(fn).to.throw(/Multiple instances of service found/);
      });
    });
  });

  describe('getServiceCredsByName()', () => {
    describe('when the app env has no services', () => {
      it('throws an error for a service name', () => {
        const fn = () => {
          cf.getAppEnv().getServiceCredsByName('test-cloudantNoSQLDB');
        };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a service name regexp', () => {
        const fn = () => {
          cf.getAppEnv().getServiceCredsByName(/NoSQL/);
        };
        expect(fn).to.throw(/Service not found/);
      });
    });

    describe('when the app env has services', () => {
      beforeEach(() => {
        mockServicesFile(true);
      });

      afterEach(() => {
        mockServicesFile(false);
      });

      it('returns credentials for a service name', () => {
        const creds = cf.getAppEnv().getServiceCredsByName('test-cloudantNoSQLDB');
        expect(creds).to.deep.equal(cloudantCreds);
      });

      it('returns credentials for a regexp that matches a service name', () => {
        const creds = cf.getAppEnv().getServiceCredsByName(/NoSQL/);
        expect(creds).to.deep.equal(cloudantCreds);
      });

      it('throws an error for a non-existent service name', () => {
        const fn = () => {
          cf.getAppEnv().getServiceCredsByName('badService');
        };
        expect(fn).to.throw(/Service not found/);
      });

      it('returns credentials for the first of multiple service names matched by a regexp', () => {
        const creds = cf.getAppEnv().getServiceCredsByName(/service/);
        expect(creds).to.deep.equal(userProvidedCreds);
      });
    });
  });
});
