const cloudEnv = require("./cloudEnv");

const cloudantCreds = {
  host: "host-bluemix.cloudant.com",
  password: "passw0rd",
  port: 443,
  url: "https://user:passw0rd@host-bluemix.cloudant.com",
  username: "user"
};

const ups1Creds = {
  host: "service1.com",
  url: "https://service1.com/api/v1"
};

const ups2Creds = {
  host: "service2.com",
  url: "https://service2.com/api/v1"
};

const services = {
  cloudantNoSQLDB: [
    {
      credentials: cloudantCreds,
      label: "cloudantNoSQLDB",
      name: "test-cloudantdb",
      plan: "Shared",
      tags: ["data_management", "ibm_created", "ibm_dedicated_public"]
    }
  ],
  "user-provided": [
    {
      credentials: ups1Creds,
      label: "user-provided",
      name: "service1",
      syslog_drain_url: "",
      tags: []
    },
    {
      credentials: ups2Creds,
      label: "user-provided",
      name: "service2",
      syslog_drain_url: "",
      tags: []
    }
  ]
};

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

test("has the default platform value", () => {
  expect(cloudEnv.platform).toBe(cloudEnv._platform());
});

test("has the default port value", () => {
  expect(cloudEnv.port).toBe(cloudEnv._port());
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

describe("serviceCreds()", () => {
  describe("in a CF or CF-simulated environment, where VCAP_SERVICES is defined", () => {
    const origVcapServices = process.env.VCAP_SERVICES;

    beforeAll(() => {
      process.env.VCAP_SERVICES = JSON.stringify(services);
    });

    afterAll(() => {
      if (origVcapServices == null) {
        delete process.env.VCAP_SERVICES;
      } else {
        process.env.VCAP_SERVICES = origVcapServices;
      }
    });

    test("selects a service by label and name and returns its credentials", () => {
      const spec = { label: "user-provided", name: "service2" };
      expect(cloudEnv.serviceCreds(spec)).toEqual(ups2Creds);
    });

    test("selects a service by label only and returns its credentials", () => {
      const spec = { label: "cloudantNoSQLDB" };
      expect(cloudEnv.serviceCreds(spec)).toEqual(cloudantCreds);
    });

    test("selects a service by name only and returns its credentials", () => {
      const spec = { name: "service1" };
      expect(cloudEnv.serviceCreds(spec)).toEqual(ups1Creds);
    });

    test("treats a simple string specification as a name", () => {
      expect(cloudEnv.serviceCreds("service1")).toEqual(ups1Creds);
    });

    test("returns undefined if a label is specified but it does not match any service", () => {
      const spec = { label: "bad-label" };
      expect(cloudEnv.serviceCreds(spec)).toBeUndefined();
    });

    test("returns undefined if a name is specified but it does not match any service", () => {
      expect(cloudEnv.serviceCreds("bad-name")).toBeUndefined();
    });

    test("throws an error for a required service if the spec does not match anything", () => {
      expect(() => cloudEnv.serviceCreds("bad-name", true)).toThrow("No service found");
    });

    test("throws an error if no label or name is specified", () => {
      expect(() => cloudEnv.serviceCreds({})).toThrow("Invalid CF spec");
    });

    test("throws an error if more than one service is matched", () => {
      const spec = { label: "user-provided" };
      expect(() => cloudEnv.serviceCreds(spec)).toThrow("Multiple services found for CF spec");
    });

    describe("with an explicitly specified spec type", () => {
      const origCloudantCreds = process.env.CLOUDANT_CREDS;

      afterEach(() => {
        if (origCloudantCreds == null) {
          delete process.env.CLOUDANT_CREDS;
        } else {
          process.env.CLOUDANT_CREDS = origCloudantCreds;
        }
      });

      test("handles the default type 'cf' when specified explicitly", () => {
        const spec = { type: "cf", label: "user-provided", name: "service2" };
        expect(cloudEnv.serviceCreds(spec)).toEqual(ups2Creds);
      });

      test("retrieves service credentials from an environment variable for type 'env'", () => {
        process.env.CLOUDANT_CREDS = JSON.stringify(cloudantCreds);
        const spec = { type: "env", name: "CLOUDANT_CREDS" };
        expect(cloudEnv.serviceCreds(spec)).toEqual(cloudantCreds);
      });

      test("throws an error for an invalid spec type", () => {
        const spec = { type: "invalid", name: "service1" };
        expect(() => cloudEnv.serviceCreds(spec)).toThrow("Invalid spec type");
      });
    });
  });

  describe("in a non-CF environment", () => {
    const origCloudantCreds = process.env.CLOUDANT_CREDS;

    afterEach(() => {
      if (origCloudantCreds == null) {
        delete process.env.CLOUDANT_CREDS;
      } else {
        process.env.CLOUDANT_CREDS = origCloudantCreds;
      }
    });

    test("selects an environment variable by name, parses its value as JSON, and returns the resulting object", () => {
      process.env.CLOUDANT_CREDS = JSON.stringify(cloudantCreds);
      const spec = { name: "CLOUDANT_CREDS" };
      expect(cloudEnv.serviceCreds(spec)).toEqual(cloudantCreds);
    });

    test("treats a simple string specification as a name", () => {
      process.env.CLOUDANT_CREDS = JSON.stringify(cloudantCreds);
      expect(cloudEnv.serviceCreds("CLOUDANT_CREDS")).toEqual(cloudantCreds);
    });

    test("returns undefined by default if the named environment variable is not defined", () => {
      expect(cloudEnv.serviceCreds("BAD_NAME")).toBeUndefined();
    });

    test("throws an error for a required service if the named environment variable is not defined", () => {
      expect(() => cloudEnv.serviceCreds("BAD_NAME", true)).toThrow("No service found");
    });

    test("throws an error if no name is specified", () => {
      expect(() => cloudEnv.serviceCreds({})).toThrow("Invalid environment service spec");
    });

    test("throws an error if the environment variable cannot be parsed as JSON", () => {
      process.env.CLOUDANT_CREDS = "not json";
      expect(() => cloudEnv.serviceCreds("CLOUDANT_CREDS")).toThrow(
        "Invalid creds environment variable"
      );
    });

    test("throws an error if parsing the environment variable yields a non-object value", () => {
      process.env.CLOUDANT_CREDS = '"not an object"';
      expect(() => cloudEnv.serviceCreds("CLOUDANT_CREDS")).toThrow(
        "Invalid creds environment variable"
      );
    });

    describe("with an explicitly specified spec type", () => {
      test("handles the default type 'env' when specified explicitly", () => {
        process.env.CLOUDANT_CREDS = JSON.stringify(cloudantCreds);
        const spec = { type: "env", name: "CLOUDANT_CREDS" };
        expect(cloudEnv.serviceCreds(spec)).toEqual(cloudantCreds);
      });

      test("ignores a spec of type 'cf'", () => {
        process.env.CLOUDANT_CREDS = JSON.stringify(cloudantCreds);
        const spec = { type: "cf", name: "CLOUDANT_CREDS" };
        expect(cloudEnv.serviceCreds(spec)).toBeUndefined();
      });

      test("throws an error for an invalid spec type", () => {
        const spec = { type: "invalid", name: "CLOUDANT_CREDS" };
        expect(() => cloudEnv.serviceCreds(spec)).toThrow("Invalid spec type");
      });
    });
  });

  describe("for multiple specs", () => {
    const origVcapServices = process.env.VCAP_SERVICES;
    const origCloudantCreds = process.env.CLOUDANT_CREDS;

    beforeAll(() => {
      process.env.VCAP_SERVICES = JSON.stringify(services);
      process.env.CLOUDANT_CREDS = JSON.stringify(cloudantCreds);
    });

    afterAll(() => {
      if (origVcapServices == null) {
        delete process.env.VCAP_SERVICES;
      } else {
        process.env.VCAP_SERVICES = origVcapServices;
      }
      if (origCloudantCreds == null) {
        delete process.env.CLOUDANT_CREDS;
      } else {
        process.env.CLOUDANT_CREDS = origCloudantCreds;
      }
    });

    test("returns creds for a single service if one spec is satisfied", () => {
      const creds = cloudEnv.serviceCreds([
        "service1",
        "svc1",
        {
          type: "env",
          name: "SERVICE1_CREDS"
        }
      ]);
      expect(creds).toEqual(ups1Creds);
    });

    test("returns undefined by default if no spec is satisfied", () => {
      const creds = cloudEnv.serviceCreds([
        "service3",
        {
          type: "env",
          name: "SERVICE3_CREDS"
        }
      ]);
      expect(creds).toBeUndefined();
    });

    test("throws an error for a required service if no spec is satisfied", () => {
      const specs = ["service3", { type: "env", name: "SERVICE3_CREDS" }];
      expect(() => cloudEnv.serviceCreds(specs, true)).toThrow("No service found");
    });

    test("throws an error if more than one spec is satisfied", () => {
      const specs = [{ label: "cloudantNoSQLDB" }, { type: "env", name: "CLOUDANT_CREDS" }];
      expect(() => cloudEnv.serviceCreds(specs)).toThrow("Multiple services found");
    });
  });
});
