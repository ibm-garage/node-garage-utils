const path = require("path");
const appEnv = require("./appEnv");

describe("_rootDir()", () => {
  let origAppDir;

  beforeEach(() => {
    origAppDir = appEnv._dir;
  });

  afterEach(() => {
    appEnv._dir = origAppDir;
  });

  test("returns the correct base dir relative to __dirname for this module", () => {
    expect(path.join(appEnv._rootDir(), "lib")).toBe(__dirname);
  });

  test("returns the expected root when appEnv tweaked to simulate installation under node_modules", () => {
    const rootDir = path.sep + path.join("home", "myapp");
    const dir = path.join(rootDir, "node_modules", "sub", "node_modules", "lib");
    appEnv._dir = dir;
    expect(appEnv._rootDir()).toBe(rootDir);
  });

  test("throws when appEnv is in an invalid location", () => {
    appEnv._dir = path.join(appEnv._dir, "oops");
    expect(() => {
      appEnv._rootDir();
    }).toThrow(Error, /invalid location/);
  });
});

describe("_version()", () => {
  const testDir = path.join(appEnv.rootDir, "test");

  afterEach(() => {
    appEnv.reset();
  });

  test("reads the version from package.json in the root dir", () => {
    appEnv.rootDir = testDir;
    expect(appEnv._version()).toBe("1.2.3");
  });

  test("returns undefined if the package.json file is not found", () => {
    appEnv.rootDir = path.join(testDir, "bad");
    expect(appEnv._version()).toBeUndefined();
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
});
