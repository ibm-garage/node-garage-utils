const { expect } = require("chai");
const path = require("path");
const { appEnv } = require("../index");

describe("appEnv", () => {
  describe("_rootDir()", () => {
    let origAppDir;

    beforeEach(() => {
      origAppDir = appEnv._dir;
    });

    afterEach(() => {
      appEnv._dir = origAppDir;
    });

    it("returns the correct base dir relative to __dirname for this module", () => {
      expect(path.join(appEnv._rootDir(), "test")).to.equal(__dirname);
    });

    it("returns the expected root when appEnv tweaked to simulate installation under node_modules", () => {
      const rootDir = path.sep + path.join("home", "myapp");
      const dir = path.join(rootDir, "node_modules", "sub", "node_modules", "lib");
      appEnv._dir = dir;
      expect(appEnv._rootDir()).to.equal(rootDir);
    });

    it("throws when appEnv is in an invalid location", () => {
      appEnv._dir = path.join(appEnv._dir, "oops");
      expect(() => {
        appEnv._rootDir();
      }).to.throw(Error, /invalid location/);
    });
  });

  describe("_version()", () => {
    const rootDir = appEnv.rootDir;
    const testDir = path.join(rootDir, "test");

    afterEach(() => {
      appEnv.rootDir = rootDir;
    });

    it("reads the version from package.json in the root dir", () => {
      appEnv.rootDir = testDir;
      expect(appEnv._version()).to.equal("1.2.3");
    });

    it("returns undefined if the package.json file is not found", () => {
      appEnv.rootDir = path.join(testDir, "bad");
      expect(appEnv._version()).to.be.undefined;
    });
  });

  describe("_env()", () => {
    let origNodeEnv;

    beforeEach(() => {
      origNodeEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
      if (origNodeEnv == null) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = origNodeEnv;
      }
    });

    it("returns 'test' in an unmodified testing environment", () => {
      expect(appEnv._env()).to.equal("test");
    });

    describe("when the NODE_ENV environment variable is set", () => {
      it("returns a standard value of NODE_ENV", () => {
        process.env.NODE_ENV = "production";
        expect(appEnv._env()).to.equal("production");
      });

      it("returns a custom value of NODE_ENV", () => {
        process.env.NODE_ENV = "custom";
        expect(appEnv._env()).to.equal("custom");
      });

      it("ignores an empty NODE_ENV value", () => {
        process.env.NODE_ENV = "";
        expect(appEnv._env()).to.equal("test");
      });
    });

    describe("when NODE_ENV is not set", () => {
      beforeEach(() => {
        delete process.env.NODE_ENV;
      });

      afterEach(() => {
        appEnv.reset();
      });

      it("returns 'test' if the last segment of the main module is _mocha", () => {
        appEnv.mainFile = path.join(appEnv.rootDir, "node_modules", "mocha", "bin", "_mocha");
        expect(appEnv._env()).to.equal("test");
      });

      it("returns undefined if the last segment of the main module ends with, but is not, _mocha", () => {
        appEnv.mainFile = path.join(appEnv.rootDir, "node_modules", "mocha", "bin", "not_mocha");
        expect(appEnv._env()).to.be.undefined;
      });

      it("returns 'script' if the main module is in a typical app script location", () => {
        appEnv.rootDir = path.join("home", "app");
        appEnv.mainFile = path.join(appEnv.rootDir, "scripts", "initdb");
        expect(appEnv._env()).to.equal("script");
      });

      it("returns 'script' if the main module is in a typical app binary location", () => {
        appEnv.rootDir = path.join("home", "app");
        appEnv.mainFile = path.join(appEnv.rootDir, "bin", "initdb");
        expect(appEnv._env()).to.equal("script");
      });

      it("returns 'script' if the main module is a binary in this module", () => {
        appEnv.mainFile = path.join(appEnv.rootDir, "bin", "cfutil.js");
        expect(appEnv._env()).to.equal("script");
      });

      it("returns undefined if the main module is in an atypical bin directory", () => {
        appEnv.mainFile = path.join("home", "app", "bin", "initdb");
        expect(appEnv._env()).to.be.undefined;
      });

      it("returns undefined if the main module is something else", () => {
        appEnv.rootDir = path.join("home", "app");
        appEnv.mainFile = path.join(appEnv.rootDir, "server", "server.js");
        expect(appEnv._env()).to.be.undefined;
      });
    });
  });

  it("has the default rootDir value", () => {
    expect(appEnv.rootDir).to.equal(appEnv._rootDir());
  });

  it("has the default mainFile value", () => {
    expect(appEnv.mainFile).to.equal(require.main.filename);
  });

  it("has a valid version value by default", () => {
    expect(appEnv.version).to.match(/^\d+\.\d+\.\d+$/);
  });

  it("has the default env value", () => {
    expect(appEnv.env).to.equal(appEnv._env());
  });

  describe("reset()", () => {
    it("resets the rootDir to its default value", () => {
      appEnv.rootDir = "changed";
      appEnv.reset();
      expect(appEnv.rootDir).to.equal(appEnv._rootDir());
    });

    it("resets the mainFile to its default value", () => {
      appEnv.mainFile = "changed";
      appEnv.reset();
      expect(appEnv.mainFile).to.equal(require.main.filename);
    });

    it("resets the version to its default value", () => {
      appEnv.version = "changed";
      appEnv.reset();
      expect(appEnv.version).to.equal(appEnv._version());
    });

    it("resets the env to its default value", () => {
      appEnv.env = "changed";
      appEnv.reset();
      expect(appEnv.env).to.equal(appEnv._env());
    });
  });

  describe("the boolean env functions:", () => {
    after(() => {
      appEnv.reset();
    });

    describe("when env is 'development'", () => {
      before(() => {
        appEnv.env = "development";
      });

      it("isDev() returns true", () => {
        expect(appEnv.isDev()).to.be.true;
      });

      it("isProd() returns false", () => {
        expect(appEnv.isProd()).to.be.false;
      });

      it("isTest() returns false", () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it("isScript() returns false", () => {
        expect(appEnv.isScript()).to.be.false;
      });
    });

    describe("when env is 'production'", () => {
      before(() => {
        appEnv.env = "production";
      });
      it("isDev() returns false", () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it("isProd() returns true", () => {
        expect(appEnv.isProd()).to.be.true;
      });

      it("isTest() returns false", () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it("isScript() returns false", () => {
        expect(appEnv.isScript()).to.be.false;
      });
    });

    describe("when env is 'test'", () => {
      before(() => {
        appEnv.env = "test";
      });

      it("isDev() returns false", () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it("isProd() returns false", () => {
        expect(appEnv.isProd()).to.be.false;
      });

      it("isTest() returns true", () => {
        expect(appEnv.isTest()).to.be.true;
      });

      it("isScript() returns false", () => {
        expect(appEnv.isScript()).to.be.false;
      });
    });

    describe("when env is 'script'", () => {
      before(() => {
        appEnv.env = "script";
      });

      it("isDev() returns false", () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it("isProd() returns false", () => {
        expect(appEnv.isProd()).to.be.false;
      });

      it("isTest() returns false", () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it("isScript() returns true", () => {
        expect(appEnv.isScript()).to.be.true;
      });
    });

    describe("when env is 'custom'", () => {
      before(() => {
        appEnv.env = "custom";
      });

      it("isDev() returns false", () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it("isProd() returns false", () => {
        expect(appEnv.isProd()).to.be.false;
      });

      it("isTest() returns false", () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it("isScript() returns false", () => {
        expect(appEnv.isScript()).to.be.false;
      });
    });
  });
});
