'use strict';

const chai = require('chai');
const expect = chai.expect;
const path = require('path');
const utils = require('../index');

const app = utils.app;
const cf = utils.cf;

const testDir = path.join(app.rootDir(), 'test');
const servicesFile = path.join(testDir, 'services.json');

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

describe('cf', () => {
  beforeEach(() => {
    cf._appEnv = undefined;
  });

  afterEach(() => {
    app.env.rootDir = app.rootDir();
    cf._appEnv = undefined;
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

    it('returns an app env with no services when services.json is not found', () => {
      // Adjust app root dir so that no services.json is found
      app.env.rootDir = path.join(app.rootDir(), 'invalid');
      const appEnv = cf.getAppEnv();
      expect(appEnv.services).to.be.empty;
    });

    it('returns an app env with services when services.json is found', () => {
      // Adjust app root dir so that test mock services.json is found
      app.env.rootDir = testDir;
      const appEnv = cf.getAppEnv();
      expect(appEnv.services.cloudantNoSQLDB).to.have.lengthOf(1);
      expect(appEnv.services['user-provided']).to.have.lengthOf(2);
    });
  });

  describe('mock()', () => {
    afterEach(() => {
      cf._appEnv = undefined;
    });

    it('with no services file, mocks the app env to contain no services', () => {
      cf.mock();
      const appEnv = cf.getAppEnv();
      expect(appEnv.services).to.be.empty;
    });

    it('with a services file, mocks the app env to contain the services therein', () => {
      cf.mock(servicesFile);
      const appEnv = cf.getAppEnv();
      expect(appEnv.services.cloudantNoSQLDB).to.have.lengthOf(1);
      expect(appEnv.services['user-provided']).to.have.lengthOf(2);
    });

    it('returns an unmock() function that resets the app env so that a default one is constructed next time', () => {
      const unmock = cf.mock(servicesFile);
      let appEnv = cf.getAppEnv();
      expect(appEnv.services).to.not.be.empty;
      unmock();
      appEnv = cf.getAppEnv();
      expect(appEnv.services).to.be.empty;
    });
  });

  describe('getServiceCredsByLabel()', () => {
    describe('when the app env has no services', () => {
      let unmock;

      beforeEach(() => {
        unmock = cf.mock();
      });

      afterEach(() => {
        unmock();
      });

      it('throws an error for a service label', () => {
        const fn = () => { cf.getAppEnv().getServiceCredsByLabel('cloudantNoSQLDB'); };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a service label regexp', () => {
        const fn = () => { cf.getAppEnv().getServiceCredsByLabel(/NoSQL/); };
        expect(fn).to.throw(/Service not found/);
      });
    });

    describe('when the app env has services', () => {
      let unmock;

      beforeEach(() => {
        unmock = cf.mock(servicesFile);
      });

      afterEach(() => {
        unmock();
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
        const fn = () => { cf.getAppEnv().getServiceCredsByLabel('badService'); };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a regexp that does not match a service label', () => {
        const fn = () => { cf.getAppEnv().getServiceCredsByLabel(/badService/); };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a service label with multiple instances', () => {
        const fn = () => { cf.getAppEnv().getServiceCredsByLabel('user-provided'); };
        expect(fn).to.throw(/Multiple instances of service found/);
      });

      it('throws an error for a regexp that matches a service label with multiple instances', () => {
        const fn = () => { cf.getAppEnv().getServiceCredsByLabel(/user/); };
        expect(fn).to.throw(/Multiple instances of service found/);
      });
    });
  });

  describe('getServiceCredsByName()', () => {
    describe('when the app env has no services', () => {
      let unmock;

      beforeEach(() => {
        unmock = cf.mock();
      });

      afterEach(() => {
        unmock();
      });

      it('throws an error for a service name', () => {
        const fn = () => { cf.getAppEnv().getServiceCredsByName('test-cloudantNoSQLDB'); };
        expect(fn).to.throw(/Service not found/);
      });

      it('throws an error for a service name regexp', () => {
        const fn = () => { cf.getAppEnv().getServiceCredsByName(/NoSQL/); };
        expect(fn).to.throw(/Service not found/);
      });
    });

    describe('when the app env has services', () => {
      let unmock;

      beforeEach(() => {
        unmock = cf.mock(servicesFile);
      });

      afterEach(() => {
        unmock();
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
        const fn = () => { cf.getAppEnv().getServiceCredsByName('badService'); };
        expect(fn).to.throw(/Service not found/);
      });

      it('returns credentials for the first of multiple service names matched by a regexp', () => {
        const creds = cf.getAppEnv().getServiceCredsByName(/service/);
        expect(creds).to.deep.equal(userProvidedCreds);
      });
    });
  });
});
