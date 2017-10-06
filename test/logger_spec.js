'use strict';

const { expect } = require('chai');
const log4js = require('log4js');
const { logger } = require('../index');

describe('logger', () => {
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

  describe('setLevel()', () => {
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

  describe('connectLogger()', () => {
    it('returns a middleware function', () => {
      expect(logger.connectLogger()).to.be.a('function');
    });
  });
});
