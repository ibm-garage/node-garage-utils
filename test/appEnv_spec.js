'use strict';

const { expect } = require('chai');
const path = require('path');
const { appEnv } = require('../index');

describe('app', () => {
  describe('_rootDir()', () => {
    let origAppDir;

    beforeEach(() => {
      origAppDir = appEnv._dir;
    });

    afterEach(() => {
      appEnv._dir = origAppDir;
    });

    it('returns the correct base dir relative to __dirname for this module', () => {
      expect(path.join(appEnv._rootDir(), 'test')).to.equal(__dirname);
    });

    it('returns the expected root when appEnv tweaked to simulate installation under node_modules', () => {
      const rootDir = path.sep + path.join('home', 'myapp');
      const dir = path.join(rootDir, 'node_modules', 'sub', 'node_modules', 'lib');
      appEnv._dir = dir;
      expect(appEnv._rootDir()).to.equal(rootDir);
    });

    it('returns the expected root when appEnv tweaked to simulate installation under user_modules', () => {
      const rootDir = path.sep + path.join('home', 'myapp');
      const dir = path.join(rootDir, 'user_modules', 'lib');
      appEnv._dir = dir;
      expect(appEnv._rootDir()).to.equal(rootDir);
    });

    it('throws when appEnv is in an invalid location', () => {
      appEnv._dir = path.join(appEnv._dir, 'oops');
      expect(() => {
        appEnv._rootDir();
      }).to.throw(Error, /invalid location/);
    });
  });

  describe('_env()', () => {
    beforeEach(() => {
      delete process.env.GAPP_ENV;
    });

    after(() => {
      delete process.env.GAPP_ENV;
    });

    it('returns the value of the GAPP_ENV environment variable if set', () => {
      process.env.GAPP_ENV = 'custom';
      expect(appEnv._env()).to.equal('custom');
    });

    describe('when the GAPP_ENV environment variable is not set', () => {
      it("returns 'unit' in an unmodified unit testing environment, where mocha is the main module", () => {
        expect(appEnv._env()).to.equal('unit');
      });

      describe('when the main module is tweaked to simulate a non-testing environment', () => {
        let origMainFilename, origNodeEnv;

        beforeEach(() => {
          origMainFilename = require.main.filename;
          origNodeEnv = process.env.NODE_ENV;
          require.main.filename = path.join(appEnv._rootDir(), 'app.js');
        });

        afterEach(() => {
          require.main.filename = origMainFilename;
          process.env.NODE_ENV = origNodeEnv;
        });

        it("returns 'dev' if the NODE_ENV environment variable is not set", () => {
          delete process.env.NODE_ENV;
          expect(appEnv._env()).to.equal('dev');
        });

        it("returns 'prod' if NODE_ENV is set to 'production'", () => {
          process.env.NODE_ENV = 'production';
          expect(appEnv._env()).to.equal('prod');
        });

        it("returns 'dev' if NODE_ENV is set to anything else", () => {
          process.env.NODE_ENV = 'prod';
          expect(appEnv._env()).to.equal('dev');
        });
      });
    });
  });

  it('has the default rootDir value', () => {
    expect(appEnv.rootDir).to.equal(appEnv._rootDir());
  });

  it('has the default mainFile value', () => {
    expect(appEnv.mainFile).to.equal(require.main.filename);
  });

  it('has the default env value', () => {
    expect(appEnv.env).to.equal(appEnv._env());
  });

  describe('reset()', () => {
    it('resets the rootDir to its default value', () => {
      appEnv.rootDir = 'changed';
      appEnv.reset();
      expect(appEnv.rootDir).to.equal(appEnv._rootDir());
    });

    it('resets the mainFile to its default value', () => {
      appEnv.mainFile = 'changed';
      appEnv.reset();
      expect(appEnv.mainFile).to.equal(require.main.filename);
    });

    it('resets the env to its default value', () => {
      appEnv.env = 'changed';
      appEnv.reset();
      expect(appEnv.env).to.equal(appEnv._env());
    });
  });

  describe('isSpec()', () => {
    afterEach(() => {
      appEnv.reset();
    });

    it('returns true in an unmodified unit testing environment, where mocha is the main module', () => {
      expect(appEnv.isSpec()).to.be.true;
    });

    it('returns false when the main module is tweaked to simulate a non-testing environment', () => {
      appEnv.mainFile = path.join(appEnv._rootDir(), 'app.js');
      expect(appEnv.isSpec()).to.be.false;
    });
  });

  describe('the boolean env functions...', () => {
    after(() => {
      appEnv.reset();
    });

    describe("when env is 'unit'", () => {
      before(() => {
        appEnv.env = 'unit';
      });

      it('isUnit() returns true', () => {
        expect(appEnv.isUnit()).to.be.true;
      });
      it('isDev() returns false', () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it('isTest() returns false', () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it('isProd() returns false', () => {
        expect(appEnv.isProd()).to.be.false;
      });
    });

    describe("when env is 'dev'", () => {
      before(() => {
        appEnv.env = 'dev';
      });

      it('isUnit() returns false', () => {
        expect(appEnv.isUnit()).to.be.false;
      });
      it('isDev() returns true', () => {
        expect(appEnv.isDev()).to.be.true;
      });

      it('isTest() returns false', () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it('isProd() returns false', () => {
        expect(appEnv.isProd()).to.be.false;
      });
    });

    describe("when env is 'test'", () => {
      before(() => {
        appEnv.env = 'test';
      });

      it('isUnit() returns false', () => {
        expect(appEnv.isUnit()).to.be.false;
      });
      it('isDev() returns false', () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it('isTest() returns true', () => {
        expect(appEnv.isTest()).to.be.true;
      });

      it('isProd() returns false', () => {
        expect(appEnv.isProd()).to.be.false;
      });
    });

    describe("when env is 'prod'", () => {
      before(() => {
        appEnv.env = 'prod';
      });

      it('isUnit() returns false', () => {
        expect(appEnv.isUnit()).to.be.false;
      });
      it('isDev() returns false', () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it('isTest() returns false', () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it('isProd() returns true', () => {
        expect(appEnv.isProd()).to.be.true;
      });
    });

    describe("when env is 'custom'", () => {
      before(() => {
        appEnv.env = 'custom';
      });

      it('isUnit() returns false', () => {
        expect(appEnv.isUnit()).to.be.false;
      });
      it('isDev() returns false', () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it('isTest() returns false', () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it('isProd() returns false', () => {
        expect(appEnv.isProd()).to.be.false;
      });
    });
  });
});
