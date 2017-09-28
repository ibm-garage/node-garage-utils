'use strict';

const chai = require('chai');
const expect = chai.expect;
const path = require('path');
const app = require('../index').app;

describe('app', () => {
  describe('rootDir()', () => {
    let origAppDir;

    beforeEach(() => {
      origAppDir = app._dir;
    });

    afterEach(() => {
      app._dir = origAppDir;
    });

    it('returns the correct base dir relative to __dirname for this module', () => {
      expect(path.join(app.rootDir(), 'test')).to.equal(__dirname);
    });

    it('returns the expected root when app tweaked to simulate installation under node_modules', () => {
      const rootDir = path.sep + path.join('home', 'myapp');
      const dir = path.join(rootDir, 'node_modules', 'sub', 'node_modules', 'lib');
      app._dir = dir;
      expect(app.rootDir()).to.equal(rootDir);
    });

    it('returns the expected root when app tweaked to simulate installation under user_modules', () => {
      const rootDir = path.sep + path.join('home', 'myapp');
      const dir = path.join(rootDir, 'user_modules', 'lib');
      app._dir = dir;
      expect(app.rootDir()).to.equal(rootDir);
    });

    it('throws when app is in an invalid location', () => {
      app._dir = path.join(app._dir, 'oops');
      expect(() => {
        app.rootDir();
      }).to.throw(Error, /invalid location/);
    });
  });

  describe('env()', () => {
    beforeEach(() => {
      delete process.env.GAPP_ENV;
    });

    after(() => {
      delete process.env.GAPP_ENV;
    });

    it('returns the value of the GAPP_ENV environment variable if set', () => {
      process.env.GAPP_ENV = 'custom';
      expect(app.env()).to.equal('custom');
    });

    describe('when the GAPP_ENV environment variable is not set', () => {
      it("returns 'unit' in an unmodified unit testing environment, where mocha is the main module", () => {
        expect(app.env()).to.equal('unit');
      });

      describe('when the main module is tweaked to simulate a non-testing environment', () => {
        let origMainFilename, origNodeEnv;

        beforeEach(() => {
          origMainFilename = require.main.filename;
          origNodeEnv = process.env.NODE_ENV;
          require.main.filename = path.join(app.rootDir(), 'app.js');
        });

        afterEach(() => {
          require.main.filename = origMainFilename;
          process.env.NODE_ENV = origNodeEnv;
        });

        it("returns 'dev' if the NODE_ENV environment variable is not set", () => {
          delete process.env.NODE_ENV;
          expect(app.env()).to.equal('dev');
        });

        it("returns 'prod' if NODE_ENV is set to 'production'", () => {
          process.env.NODE_ENV = 'production';
          expect(app.env()).to.equal('prod');
        });

        it("returns 'dev' if NODE_ENV is set to anything else", () => {
          process.env.NODE_ENV = 'prod';
          expect(app.env()).to.equal('dev');
        });
      });
    });
  });

  describe('config', () => {
    it('has the default rootDir value', () => {
      expect(app.config.rootDir).to.equal(app.rootDir());
    });

    it('has the default env value', () => {
      expect(app.config.env).to.equal(app.env());
    });

    describe('isSpec()', () => {
      let origMainFilename;

      beforeEach(() => {
        origMainFilename = require.main.filename;
      });

      afterEach(() => {
        require.main.filename = origMainFilename;
      });

      it('returns true in an unmodified unit testing environment, where mocha is the main module', () => {
        expect(app.config.isSpec()).to.be.true;
      });

      it('returns false when the main module is tweaked to simulate a non-testing environment', () => {
        require.main.filename = path.join(app.rootDir(), 'app.js');
        expect(app.config.isSpec()).to.be.false;
      });
    });

    describe('the boolean env functions...', () => {
      after(() => {
        app.config.env = app.env();
      });

      describe("when env is 'unit'", () => {
        beforeEach(() => {
          app.config.env = 'unit';
        });

        it('isUnit() returns true', () => {
          expect(app.config.isUnit()).to.be.true;
        });
        it('isDev() returns false', () => {
          expect(app.config.isDev()).to.be.false;
        });

        it('isTest() returns false', () => {
          expect(app.config.isTest()).to.be.false;
        });

        it('isProd() returns false', () => {
          expect(app.config.isProd()).to.be.false;
        });
      });

      describe("when env is 'dev'", () => {
        beforeEach(() => {
          app.config.env = 'dev';
        });

        it('isUnit() returns false', () => {
          expect(app.config.isUnit()).to.be.false;
        });
        it('isDev() returns true', () => {
          expect(app.config.isDev()).to.be.true;
        });

        it('isTest() returns false', () => {
          expect(app.config.isTest()).to.be.false;
        });

        it('isProd() returns false', () => {
          expect(app.config.isProd()).to.be.false;
        });
      });

      describe("when env is 'test'", () => {
        beforeEach(() => {
          app.config.env = 'test';
        });

        it('isUnit() returns false', () => {
          expect(app.config.isUnit()).to.be.false;
        });
        it('isDev() returns false', () => {
          expect(app.config.isDev()).to.be.false;
        });

        it('isTest() returns true', () => {
          expect(app.config.isTest()).to.be.true;
        });

        it('isProd() returns false', () => {
          expect(app.config.isProd()).to.be.false;
        });
      });

      describe("when env is 'prod'", () => {
        beforeEach(() => {
          app.config.env = 'prod';
        });

        it('isUnit() returns false', () => {
          expect(app.config.isUnit()).to.be.false;
        });
        it('isDev() returns false', () => {
          expect(app.config.isDev()).to.be.false;
        });

        it('isTest() returns false', () => {
          expect(app.config.isTest()).to.be.false;
        });

        it('isProd() returns true', () => {
          expect(app.config.isProd()).to.be.true;
        });
      });

      describe("when env is 'custom'", () => {
        beforeEach(() => {
          app.config.env = 'custom';
        });

        it('isUnit() returns false', () => {
          expect(app.config.isUnit()).to.be.false;
        });
        it('isDev() returns false', () => {
          expect(app.config.isDev()).to.be.false;
        });

        it('isTest() returns false', () => {
          expect(app.config.isTest()).to.be.false;
        });

        it('isProd() returns false', () => {
          expect(app.config.isProd()).to.be.false;
        });
      });
    });
  });
});
