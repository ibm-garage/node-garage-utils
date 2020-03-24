const path = require("path");
const appEnv = require("./appEnv");

describe("_rootDir()", () => {
  const origAppEnvDir = appEnv._dir;

  afterEach(() => {
    appEnv._dir = origAppEnvDir;
    appEnv.reset();
  });

  // Note: subsequent _rootDir() tests are only reliable if this one passes.
  test("returns the correct base dir relative to __dirname for this module", () => {
    expect(path.join(appEnv._rootDir(), "lib")).toBe(__dirname);
  });

  describe("in a simulated application with the garage-utils package installed under node-modules", () => {
    const rootDir = path.join(appEnv._rootDir(), "test", "app");

    test("returns the app root dir when garage-utils is a direct dependency", () => {
      appEnv._dir = path.join(rootDir, "node_modules", "garage-utils", "lib");
      expect(appEnv._rootDir()).toBe(rootDir);
    });

    test("returns the app root dir when garage-utils is a transitive dependency", () => {
      appEnv._dir = path.join(
        rootDir,
        "node_modules",
        "some-package",
        "node-modules",
        "some-other-package",
        "node-modules",
        "garage-utils",
        "lib"
      );
      expect(appEnv._rootDir()).toBe(rootDir);
    });
  });

  describe("in a simulated application with garage-utils package installed in an external location", () => {
    const externalDir = path.join(appEnv._rootDir(), "test", "external");
    const rootDir = path.join(appEnv._rootDir(), "test", "app");

    beforeEach(() => {
      appEnv._dir = path.join(externalDir, "node_modules", "garage-utils", "lib");
    });

    test("uses the entry point to find the app root dir", () => {
      appEnv.mainFile = path.join(rootDir, "app.js");
      expect(appEnv._rootDir()).toBe(rootDir);
    });

    test("finds the app root dir if the entry point is in a package in node-modules", () => {
      appEnv.mainFile = path.join(rootDir, "node_modules", "mocha", "bin", "_mocha");
      expect(appEnv._rootDir()).toBe(rootDir);
    });

    test("returns undefined if the entry point is also in a package in an external location", () => {
      appEnv.mainFile = path.join(externalDir, "node_modules", "garage-utils", "bin", "cfutil");
      expect(appEnv._rootDir()).toBeUndefined();
    });
  });

  describe("in unexpected environments", () => {
    test("returns undefined if this module and the entry point are not in Node packages", () => {
      // At least one of these probably won't exist.
      appEnv._dir = path.sep + "Users";
      appEnv.mainFile = path.join(path.sep + "home", "app.js");
      expect(appEnv._rootDir()).toBeUndefined();
    });

    test("returns undefined if the module location and entry point are falsey values", () => {
      appEnv._dir = undefined;
      appEnv.mainFile = false;
      expect(appEnv._rootDir()).toBeUndefined();
    });
  });
});

describe("_version()", () => {
  const testDir = path.join(appEnv.rootDir, "test");

  afterEach(() => {
    appEnv.reset();
  });

  test("reads the version from package.json in the root dir", () => {
    appEnv.rootDir = path.join(testDir, "app");
    expect(appEnv._version()).toBe("1.2.3");
  });

  test("returns undefined if the package.json file is not found", () => {
    appEnv.rootDir = path.join(testDir, "bad");
    expect(appEnv._version()).toBeUndefined();
  });

  test("returns undefined if appEnv.rootDir is undefined", () => {
    appEnv.rootDir = undefined;
    expect(appEnv._version()).toBeUndefined();
  });
});

describe("_env()", () => {
  const origNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (origNodeEnv == null) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = origNodeEnv;
    }
    appEnv.reset();
  });

  test("returns 'test' in an unmodified testing environment", () => {
    expect(appEnv._env()).toBe("test");
  });

  describe("when the NODE_ENV environment variable is set", () => {
    test("returns a standard value of NODE_ENV", () => {
      process.env.NODE_ENV = "production";
      expect(appEnv._env()).toBe("production");
    });

    test("returns a custom value of NODE_ENV", () => {
      process.env.NODE_ENV = "custom";
      expect(appEnv._env()).toBe("custom");
    });

    test("ignores an empty NODE_ENV value", () => {
      process.env.NODE_ENV = "";
      expect(appEnv._env()).toBeUndefined();
    });
  });

  describe("when NODE_ENV is not set", () => {
    beforeEach(() => {
      delete process.env.NODE_ENV;
    });

    test("returns 'test' if the last segment of the main module is _mocha", () => {
      appEnv.mainFile = path.join(appEnv.rootDir, "node_modules", "mocha", "bin", "_mocha");
      expect(appEnv._env()).toBe("test");
    });

    test("returns undefined if the last segment of the main module ends with, but is not, _mocha", () => {
      appEnv.mainFile = path.join(appEnv.rootDir, "node_modules", "mocha", "bin", "not_mocha");
      expect(appEnv._env()).toBeUndefined();
    });

    test("returns 'script' if the main module is in a typical app script location", () => {
      appEnv.rootDir = path.join("home", "app");
      appEnv.mainFile = path.join(appEnv.rootDir, "scripts", "initdb");
      expect(appEnv._env()).toBe("script");
    });

    test("returns 'script' if the main module is in a typical app binary location", () => {
      appEnv.rootDir = path.join("home", "app");
      appEnv.mainFile = path.join(appEnv.rootDir, "bin", "initdb");
      expect(appEnv._env()).toBe("script");
    });

    test("returns 'script' if the main module is a binary in this module", () => {
      appEnv.mainFile = path.join(appEnv.rootDir, "bin", "cfutil.js");
      expect(appEnv._env()).toBe("script");
    });

    test("returns undefined if the main module is in an atypical bin directory", () => {
      appEnv.mainFile = path.join("home", "app", "bin", "initdb");
      expect(appEnv._env()).toBeUndefined();
    });

    test("returns undefined if the main module is something else", () => {
      appEnv.rootDir = path.join("home", "app");
      appEnv.mainFile = path.join(appEnv.rootDir, "server", "server.js");
      expect(appEnv._env()).toBeUndefined();
    });
  });
});

test("has the default rootDir value", () => {
  expect(appEnv.rootDir).toBe(appEnv._rootDir());
});

test("has the default mainFile value", () => {
  expect(appEnv.mainFile).toBe(__filename);
});

test("has a valid version value by default", () => {
  expect(appEnv.version).toMatch(/^\d+\.\d+\.\d+$/);
});

test("has the default env value", () => {
  expect(appEnv.env).toBe(appEnv._env());
});

describe("reset()", () => {
  test("resets the rootDir to its default value", () => {
    appEnv.rootDir = "changed";
    appEnv.reset();
    expect(appEnv.rootDir).toBe(appEnv._rootDir());
  });

  test("resets the mainFile to its default value", () => {
    appEnv.mainFile = "changed";
    appEnv.reset();
    expect(appEnv.mainFile).toBe(__filename);
  });

  test("resets the version to its default value", () => {
    appEnv.version = "changed";
    appEnv.reset();
    expect(appEnv.version).toBe(appEnv._version());
  });

  test("resets the env to its default value", () => {
    appEnv.env = "changed";
    appEnv.reset();
    expect(appEnv.env).toBe(appEnv._env());
  });
});

describe("the boolean env functions:", () => {
  afterAll(() => {
    appEnv.reset();
  });

  describe("when env is 'development'", () => {
    beforeAll(() => {
      appEnv.env = "development";
    });

    test("isDev() returns true", () => {
      expect(appEnv.isDev()).toBe(true);
    });

    test("isProd() returns false", () => {
      expect(appEnv.isProd()).toBe(false);
    });

    test("isTest() returns false", () => {
      expect(appEnv.isTest()).toBe(false);
    });

    test("isScript() returns false", () => {
      expect(appEnv.isScript()).toBe(false);
    });
  });

  describe("when env is 'production'", () => {
    beforeAll(() => {
      appEnv.env = "production";
    });
    test("isDev() returns false", () => {
      expect(appEnv.isDev()).toBe(false);
    });

    test("isProd() returns true", () => {
      expect(appEnv.isProd()).toBe(true);
    });

    test("isTest() returns false", () => {
      expect(appEnv.isTest()).toBe(false);
    });

    test("isScript() returns false", () => {
      expect(appEnv.isScript()).toBe(false);
    });
  });

  describe("when env is 'test'", () => {
    beforeAll(() => {
      appEnv.env = "test";
    });

    test("isDev() returns false", () => {
      expect(appEnv.isDev()).toBe(false);
    });

    test("isProd() returns false", () => {
      expect(appEnv.isProd()).toBe(false);
    });

    test("isTest() returns true", () => {
      expect(appEnv.isTest()).toBe(true);
    });

    test("isScript() returns false", () => {
      expect(appEnv.isScript()).toBe(false);
    });
  });

  describe("when env is 'script'", () => {
    beforeAll(() => {
      appEnv.env = "script";
    });

    test("isDev() returns false", () => {
      expect(appEnv.isDev()).toBe(false);
    });

    test("isProd() returns false", () => {
      expect(appEnv.isProd()).toBe(false);
    });

    test("isTest() returns false", () => {
      expect(appEnv.isTest()).toBe(false);
    });

    test("isScript() returns true", () => {
      expect(appEnv.isScript()).toBe(true);
    });
  });

  describe("when env is 'custom'", () => {
    beforeAll(() => {
      appEnv.env = "custom";
    });

    test("isDev() returns false", () => {
      expect(appEnv.isDev()).toBe(false);
    });

    test("isProd() returns false", () => {
      expect(appEnv.isProd()).toBe(false);
    });

    test("isTest() returns false", () => {
      expect(appEnv.isTest()).toBe(false);
    });

    test("isScript() returns false", () => {
      expect(appEnv.isScript()).toBe(false);
    });
  });

  describe("when env is undefined", () => {
    beforeAll(() => {
      appEnv.env = undefined;
    });

    test("isDev() returns false", () => {
      expect(appEnv.isDev()).toBe(false);
    });

    test("isProd() returns false", () => {
      expect(appEnv.isProd()).toBe(false);
    });

    test("isTest() returns false", () => {
      expect(appEnv.isTest()).toBe(false);
    });

    test("isScript() returns false", () => {
      expect(appEnv.isScript()).toBe(false);
    });
  });
});
