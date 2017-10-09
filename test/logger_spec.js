'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const log4js = require('log4js');
const { logger, appEnv } = require('../index');

describe('logger', () => {
  describe('configure()', () => {
    // The logger utility only calls log4js.configure() once, as the framework expects. Though
    // these tests reset the utility, they use a stub on log4js.configure() to check the
    // selected configuration and to avoid repeatedly calling through to the real function.
    let stub;

    before(() => {
      logger._reset();
    });

    beforeEach(() => {
      stub = sinon.stub(log4js, 'configure');
    });

    afterEach(() => {
      expect(stub.calledOnce);
      stub.restore();
      logger._reset();
    });

    function getAppenders() {
      return stub.args[0][0].categories.default.appenders;
    }

    describe('when a configuration type is explicitly specified', () => {
      it('uses the correct configuration for localApp', () => {
        logger.configure({ type: 'app' });
        expect(getAppenders()).to.deep.equal(['localAppOut']);
      });

      it('uses the correct configuration for cfApp', () => {
        logger.configure({ type: 'cfApp' });
        expect(getAppenders()).to.deep.equal(['cfAppOut']);
      });

      describe('selects the correct configuration for app', () => {
        afterEach(() => {
          delete process.env.VCAP_APPLICATION;
        });

        it('uses the localApp configuration in a non-CF environment', () => {
          logger.configure({ type: 'cfApp' });
          expect(getAppenders()).to.deep.equal(['cfAppOut']);
        });

        it('uses the cfApp configuration in a CF environment', () => {
          process.env.VCAP_APPLICATION = '{}';
          logger.configure({ type: 'cfApp' });
          expect(getAppenders()).to.deep.equal(['cfAppOut']);
        });
      });

      it('uses the correct configuration for spec', () => {
        logger.configure({ type: 'spec' });
        expect(getAppenders()).to.deep.equal(['specFile', 'specErr']);
      });

      it('uses the correct configuration for script', () => {
        logger.configure({ type: 'script' });
        expect(getAppenders()).to.deep.equal(['scriptErr']);
      });

      it('ignores an invalid type and uses spec by default', () => {
        logger.configure({ type: 'invalid' });
        expect(getAppenders()).to.deep.equal(['specFile', 'specErr']);
      });
    });

    describe('when a configuration type is not specified', () => {
      afterEach(() => {
        appEnv.reset();
        delete process.env.VCAP_APPLICATION;
      });

      it('uses the spec configuration in an unmodified unit testing environment', () => {
        logger.configure();
        expect(getAppenders()).to.deep.equal(['specFile', 'specErr']);
      });

      it('uses the script configuration when the app env is tweaked to simulate a script', () => {
        appEnv.mainFile = path.join(appEnv.rootDir, 'bin', 'secrets');
        logger.configure();
        expect(getAppenders()).to.deep.equal(['scriptErr']);
      });

      it('uses the localApp configuration when the app env is tweaked to simulate a non-CF app', () => {
        appEnv.rootDir = path.join('home', 'app');
        appEnv.mainFile = path.join(appEnv.rootDir, 'server', 'server.js');
        logger.configure();
        expect(getAppenders()).to.deep.equal(['localAppOut']);
      });

      it('uses the cfApp configuration when the app env is tweaked to simulate a CF app', () => {
        appEnv.rootDir = path.join('home', 'app');
        appEnv.mainFile = path.join(appEnv.rootDir, 'server', 'server.js');
        process.env.VCAP_APPLICATION = '{}';
        logger.configure();
        expect(getAppenders()).to.deep.equal(['cfAppOut']);
      });
    });
  });

  describe('setLevel()', () => {
    // The level is shared across all log4js loggers of the same category, so we can spy on the
    // utility's underlying logger.
    function getLevel() {
      return log4js.getLogger('supressSpecErr').level.levelStr.toLowerCase();
    }

    afterEach(() => {
      logger.setLevel();
    });

    it('sets the logging level', () => {
      logger.setLevel('trace');
      expect(getLevel()).to.equal('trace');
    });

    it('ignores an invalid level name', () => {
      logger.setLevel('invalid');
      expect(getLevel()).to.equal('all');
    });

    it('resets to the default level is none is specified', () => {
      logger.setLevel('fatal');
      logger.setLevel();
      expect(getLevel()).to.equal('all');
    });
  });

  describe('logging functions call through to underlying logger without error', () => {
    afterEach(() => {
      logger.suppressSpecErr(false);
    });

    it('log() for logging at any specified level', () => {
      logger.log('info', 'This is logged at level info');
    });

    it('trace() for logging trace messages', () => {
      logger.trace('Entered foo() with options', { a: 1, b: 2, c: [1, 2, 3] });
    });

    it('debug() for logging debgging messages', () => {
      logger.debug('Cleaned up %d items', 240);
    });

    it('info() for logging informational messages', () => {
      logger.info('Initialization complete');
    });

    it('warn() for logging warnings', () => {
      logger.suppressSpecErr(true);
      const err = new Error('Oops!');
      logger.warn('Synchronization failed.', err);
    });

    it('error() for logging errors', () => {
      logger.suppressSpecErr(true);
      const err = new Error('Data request failed');
      const cause = new Error('Oops!');
      err.cause = cause;
      logger.error(err);
    });

    it('fatal() for logging fatal errors', () => {
      logger.suppressSpecErr(true);
      logger.fatal('Application failed. Shutting down...');
    });
  });

  describe('connectLogger()', () => {
    it('returns a middleware function', () => {
      expect(logger.connectLogger()).to.be.a('function');
    });
  });
});