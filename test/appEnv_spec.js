const { expect } = require("chai");
const path = require("path");
const { appEnv } = require("../index");

describe("app", () => {
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

    it("returns the expected root when appEnv tweaked to simulate installation under user_modules", () => {
      const rootDir = path.sep + path.join("home", "myapp");
      const dir = path.join(rootDir, "user_modules", "lib");
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
    beforeEach(() => {
      delete process.env.GAPP_ENV;
    });

    after(() => {
      delete process.env.GAPP_ENV;
    });

    it("returns the value of the GAPP_ENV environment variable if set", () => {
      process.env.GAPP_ENV = "custom";
      expect(appEnv._env()).to.equal("custom");
    });

    describe("when the GAPP_ENV environment variable is not set", () => {
      it("returns 'unit' in an unmodified unit testing environment, where mocha is the main module", () => {
        expect(appEnv._env()).to.equal("unit");
      });

      describe("when the main module is tweaked to simulate a non-testing environment", () => {
        let origNodeEnv;

        beforeEach(() => {
          origNodeEnv = process.env.NODE_ENV;
          appEnv.mainFile = path.join(appEnv._rootDir(), "app.js");
        });

        afterEach(() => {
          process.env.NODE_ENV = origNodeEnv;
          appEnv.reset();
        });

        it("returns 'dev' if the NODE_ENV environment variable is not set", () => {
          delete process.env.NODE_ENV;
          expect(appEnv._env()).to.equal("dev");
        });

        it("returns 'prod' if NODE_ENV is set to 'production'", () => {
          process.env.NODE_ENV = "production";
          expect(appEnv._env()).to.equal("prod");
        });

        it("returns 'dev' if NODE_ENV is set to anything else", () => {
          process.env.NODE_ENV = "prod";
          expect(appEnv._env()).to.equal("dev");
        });
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

  describe("isSpec()", () => {
    afterEach(() => {
      appEnv.reset();
    });

    it("returns true in an unmodified unit testing environment, where mocha is the main module", () => {
      expect(appEnv.isSpec()).to.be.true;
    });

    it("returns false when the main module is tweaked to simulate a non-testing environment", () => {
      appEnv.mainFile = path.join(appEnv.rootDir, "app.js");
      expect(appEnv.isSpec()).to.be.false;
    });
  });

  describe("isScript()", () => {
    afterEach(() => {
      appEnv.reset();
    });

    it("returns false in an unmodified unit testing environment, where mocha is the main module", () => {
      expect(appEnv.isScript()).to.be.false;
    });

    it("returns true when the main module is tweaked to simulate an app script", () => {
      appEnv.rootDir = path.join("home", "app");
      appEnv.mainFile = path.join(appEnv.rootDir, "scripts", "initdb");
      expect(appEnv.isScript()).to.be.true;
    });

    it("returns true when the main module is tweaked to simulate an app binary", () => {
      appEnv.rootDir = path.join("home", "app");
      appEnv.mainFile = path.join(appEnv.rootDir, "bin", "initdb");
      expect(appEnv.isScript()).to.be.true;
    });

    it("returns true when the main module is tweaked to simulate a module binary", () => {
      appEnv.mainFile = path.join(appEnv.rootDir, "bin", "secrets");
      expect(appEnv.isScript()).to.be.true;
    });

    it("returns false when the main module is anything else", () => {
      appEnv.rootDir = path.join("home", "app");
      appEnv.mainFile = path.join(appEnv.rootDir, "server", "server.js");
      expect(appEnv.isScript()).to.be.false;
    });
  });

  describe("the boolean env functions...", () => {
    after(() => {
      appEnv.reset();
    });

    describe("when env is 'unit'", () => {
      before(() => {
        appEnv.env = "unit";
      });

      it("isUnit() returns true", () => {
        expect(appEnv.isUnit()).to.be.true;
      });
      it("isDev() returns false", () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it("isTest() returns false", () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it("isProd() returns false", () => {
        expect(appEnv.isProd()).to.be.false;
      });
    });

    describe("when env is 'dev'", () => {
      before(() => {
        appEnv.env = "dev";
      });

      it("isUnit() returns false", () => {
        expect(appEnv.isUnit()).to.be.false;
      });
      it("isDev() returns true", () => {
        expect(appEnv.isDev()).to.be.true;
      });

      it("isTest() returns false", () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it("isProd() returns false", () => {
        expect(appEnv.isProd()).to.be.false;
      });
    });

    describe("when env is 'test'", () => {
      before(() => {
        appEnv.env = "test";
      });

      it("isUnit() returns false", () => {
        expect(appEnv.isUnit()).to.be.false;
      });
      it("isDev() returns false", () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it("isTest() returns true", () => {
        expect(appEnv.isTest()).to.be.true;
      });

      it("isProd() returns false", () => {
        expect(appEnv.isProd()).to.be.false;
      });
    });

    describe("when env is 'prod'", () => {
      before(() => {
        appEnv.env = "prod";
      });

      it("isUnit() returns false", () => {
        expect(appEnv.isUnit()).to.be.false;
      });
      it("isDev() returns false", () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it("isTest() returns false", () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it("isProd() returns true", () => {
        expect(appEnv.isProd()).to.be.true;
      });
    });

    describe("when env is 'custom'", () => {
      before(() => {
        appEnv.env = "custom";
      });

      it("isUnit() returns false", () => {
        expect(appEnv.isUnit()).to.be.false;
      });
      it("isDev() returns false", () => {
        expect(appEnv.isDev()).to.be.false;
      });

      it("isTest() returns false", () => {
        expect(appEnv.isTest()).to.be.false;
      });

      it("isProd() returns false", () => {
        expect(appEnv.isProd()).to.be.false;
      });
    });
  });
});
