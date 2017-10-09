'use strict';

const { expect } = require('chai');
const path = require('path');
const { appEnv, cf } = require('../index');

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

const rootDir = appEnv.rootDir;
const testDir = path.join(rootDir, 'test');

function mockServicesFile(mock) {
  // Adjust app root dir so that test mock services.json is found
  appEnv.rootDir = mock ? testDir : rootDir;
}

describe('cf', () => {
  beforeEach(() => {
    cf._cfEnv = undefined;
  });

  afterEach(() => {
    mockServicesFile(false);
    cf._cfEnv = undefined;
    delete process.env.VCAP_SERVICES;
  });

  describe('cfEnv()', () => {
    it('returns an cf env with expected properties', () => {
      const cfEnv = cf.cfEnv();
      expect(cfEnv.app).to.deep.equal({});
      expect(cfEnv.services).to.deep.equal({});
      expect(cfEnv.name).to.not.be.undefined;
      expect(cfEnv.isLocal).to.be.true;
      expect(cfEnv.getServiceCredsByLabel).to.be.a('function');
      expect(cfEnv.getServiceCredsByName).to.be.a('function');
    });

    it('uses VCAP_SERVICES environment variable to populate cf env services if set', () => {
      process.env.VCAP_SERVICES = vcapServices;
      const cfEnv = cf.cfEnv();
      expect(cfEnv.services.discovery).to.have.lengthOf(1);
    });

    it('uses services.json file to populate cf env services if found', () => {
      mockServicesFile(true);
      const cfEnv = cf.cfEnv();
      expect(cfEnv.services.cloudantNoSQLDB).to.have.lengthOf(1);
      expect(cfEnv.services['user-provided']).to.have.lengthOf(2);
    });

    it('uses VCAP_SERVICES and ignores services.json if both are found', () => {
      mockServicesFile(true);
      process.env.VCAP_SERVICES = vcapServices;
      const cfEnv = cf.cfEnv();
      expect(cfEnv.services.discovery).to.have.lengthOf(1);
      expect(cfEnv.services.cloudantNoSQLDB).to.be.undefined;
      expect(cfEnv.services['user-provided']).to.be.undefined;
    });

    it('returns a cf env with no services when neither VCAP_SERVICES nor services.json is not found', () => {
      const cfEnv = cf.cfEnv();
      expect(cfEnv.services).to.be.empty;
    });
  });

  describe('getServiceCredsByLabel()', () => {
    describe('when the cf env has no services', () => {
      it('throws an error for a service label', () => {
        const fn = () => {
          cf.cfEnv().getServiceCredsByLabel('cloudantNoSQLDB');
        };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a service label regexp', () => {
        const fn = () => {
          cf.cfEnv().getServiceCredsByLabel(/NoSQL/);
        };
        expect(fn).to.throw(/Service not found/);
      });
    });

    describe('when the cf env has services', () => {
      beforeEach(() => {
        mockServicesFile(true);
      });

      afterEach(() => {
        mockServicesFile(false);
      });

      it('returns credentials for a service label', () => {
        const creds = cf.cfEnv().getServiceCredsByLabel('cloudantNoSQLDB');
        expect(creds).to.deep.equal(cloudantCreds);
      });

      it('returns credentials for a regexp that matches a service label', () => {
        const creds = cf.cfEnv().getServiceCredsByLabel(/NoSQL/);
        expect(creds).to.deep.equal(cloudantCreds);
      });

      it('throws an error for a non-existent service label', () => {
        const fn = () => {
          cf.cfEnv().getServiceCredsByLabel('badService');
        };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a regexp that does not match a service label', () => {
        const fn = () => {
          cf.cfEnv().getServiceCredsByLabel(/badService/);
        };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a service label with multiple instances', () => {
        const fn = () => {
          cf.cfEnv().getServiceCredsByLabel('user-provided');
        };
        expect(fn).to.throw(/Multiple instances of service found/);
      });

      it('throws an error for a regexp that matches a service label with multiple instances', () => {
        const fn = () => {
          cf.cfEnv().getServiceCredsByLabel(/user/);
        };
        expect(fn).to.throw(/Multiple instances of service found/);
      });
    });
  });

  describe('getServiceCredsByName()', () => {
    describe('when the cf env has no services', () => {
      it('throws an error for a service name', () => {
        const fn = () => {
          cf.cfEnv().getServiceCredsByName('test-cloudantNoSQLDB');
        };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a service name regexp', () => {
        const fn = () => {
          cf.cfEnv().getServiceCredsByName(/NoSQL/);
        };
        expect(fn).to.throw(/Service not found/);
      });
    });

    describe('when the cf env has services', () => {
      beforeEach(() => {
        mockServicesFile(true);
      });

      afterEach(() => {
        mockServicesFile(false);
      });

      it('returns credentials for a service name', () => {
        const creds = cf.cfEnv().getServiceCredsByName('test-cloudantNoSQLDB');
        expect(creds).to.deep.equal(cloudantCreds);
      });

      it('returns credentials for a regexp that matches a service name', () => {
        const creds = cf.cfEnv().getServiceCredsByName(/NoSQL/);
        expect(creds).to.deep.equal(cloudantCreds);
      });

      it('throws an error for a non-existent service name', () => {
        const fn = () => {
          cf.cfEnv().getServiceCredsByName('badService');
        };
        expect(fn).to.throw(/Service not found/);
      });

      it('returns credentials for the first of multiple service names matched by a regexp', () => {
        const creds = cf.cfEnv().getServiceCredsByName(/service/);
        expect(creds).to.deep.equal(userProvidedCreds);
      });
    });
  });
});
