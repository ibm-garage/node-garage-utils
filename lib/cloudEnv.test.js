const cloudEnv = require("./cloudEnv");

describe("_platform()", () => {
  const origVcapApplication = process.env.VCAP_APPLICATION;
  const origKubernetesServiceHost = process.env.KUBERNETES_SERVICE_HOST;

  afterEach(() => {
    if (origVcapApplication == null) {
      delete process.env.VCAP_APPLICATION;
    } else {
      process.env.VCAP_APPLICATION = origVcapApplication;
    }
    if (origKubernetesServiceHost == null) {
      delete process.env.KUBERNETES_SERVICE_HOST;
    } else {
      process.env.KUBERNETES_SERVICE_HOST = origKubernetesServiceHost;
    }
    cloudEnv.reset();
  });

  test("returns undefined when not in a cloud environment", () => {
    delete process.env.VCAP_APPLICATION;
    delete process.env.KUBERNETES_SERVICE_HOST;
    expect(cloudEnv._platform()).toBeUndefined();
  });

  test("returns 'cf' when the VCAP_APPLICATION environment variable is defined", () => {
    process.env.VCAP_APPLICATION = "{}";
    delete process.env.KUBERNETES_SERVICE_HOST;
    expect(cloudEnv._platform()).toBe("cf");
  });

  test("returns 'kube' when the KUBERNETES_SERVICE_HOST environment variable is defined", () => {
    delete process.env.VCAP_APPLICATION;
    process.env.KUBERNETES_SERVICE_HOST = "10.0.0.1";
    expect(cloudEnv._platform()).toBe("kube");
  });

  test("ignores empty environment variable values", () => {
    process.env.VCAP_APPLICATION = "";
    process.env.KUBERNETES_SERVICE_HOST = "";
    expect(cloudEnv._platform()).toBeUndefined();
  });
});

test("has the default platform value", () => {
  expect(cloudEnv.platform).toBe(cloudEnv._platform());
});

describe("_port()", () => {
  const origPort = process.env.PORT;

  afterEach(() => {
    if (origPort == null) {
      delete process.env.PORT;
    } else {
      process.env.PORT = origPort;
    }
    cloudEnv.reset();
  });

  test("returns the value of the PORT environment variable if specified", () => {
    process.env.PORT = "8080";
    expect(cloudEnv._port()).toBe("8080");
  });

  test("returns the default '3000' when no PORT is specified", () => {
    delete process.env.PORT;
    expect(cloudEnv._port()).toBe("3000");
  });

  test("returns the default '3000' when PORT is empty", () => {
    process.env.PORT = "";
    expect(cloudEnv._port()).toBe("3000");
  });
});

describe("reset()", () => {
  test("resets the platform to its default value", () => {
    cloudEnv.platform = "changed";
    cloudEnv.reset();
    expect(cloudEnv.platform).toBe(cloudEnv._platform());
  });

  test("resets the port to its default value", () => {
    cloudEnv.port = "changed";
    cloudEnv.reset();
    expect(cloudEnv.port).toBe(cloudEnv._port());
  });
});

describe("the boolean platform functions:", () => {
  afterAll(() => {
    cloudEnv.reset();
  });

  describe("when platform is 'cf'", () => {
    beforeAll(() => {
      cloudEnv.platform = "cf";
    });

    test("isCf() returns true", () => {
      expect(cloudEnv.isCf()).toBe(true);
    });

    test("isKube() returns false", () => {
      expect(cloudEnv.isKube()).toBe(false);
    });
  });

  describe("when platform is 'kube'", () => {
    beforeAll(() => {
      cloudEnv.platform = "kube";
    });

    test("isCf() returns false", () => {
      expect(cloudEnv.isCf()).toBe(false);
    });

    test("isKube() returns true", () => {
      expect(cloudEnv.isKube()).toBe(true);
    });
  });

  describe("when platform is 'custom'", () => {
    beforeAll(() => {
      cloudEnv.platform = "custom";
    });

    test("isCf() returns false", () => {
      expect(cloudEnv.isCf()).toBe(false);
    });

    test("isKube() returns false", () => {
      expect(cloudEnv.isKube()).toBe(false);
    });
  });

  describe("when platform is undefined", () => {
    beforeAll(() => {
      cloudEnv.platform = undefined;
    });

    test("isCf() returns false", () => {
      expect(cloudEnv.isCf()).toBe(false);
    });

    test("isKube() returns false", () => {
      expect(cloudEnv.isKube()).toBe(false);
    });
  });
});
