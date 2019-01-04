const cf = require("./cf");

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

const options = { vcap: { services } };

describe("cfEnv()", () => {
  test("returns a cf env with expected properties", () => {
    const cfEnv = cf.cfEnv();
    expect(cfEnv.app).toEqual({});
    expect(cfEnv.services).toEqual({});
    expect(cfEnv.name).not.toBeUndefined();
    expect(cfEnv.isLocal).toBe(true);
    expect(typeof cfEnv.getServiceCredsByLabel).toBe("function");
    expect(typeof cfEnv.getServiceCredsByName).toBe("function");
  });

  test("uses vcap services from options, if specified", () => {
    const cfEnv = cf.cfEnv(options);
    expect(cfEnv.services.cloudantNoSQLDB).toHaveLength(1);
    expect(cfEnv.services["user-provided"]).toHaveLength(2);
  });
});

describe("getServiceCredsByLabel()", () => {
  test("returns the credentials for a service by label string", () => {
    const creds = cf.cfEnv(options).getServiceCredsByLabel("cloudantNoSQLDB");
    expect(creds).toEqual(cloudantCreds);
  });

  test("returns credentials for the service whose label matches a specified regexp", () => {
    const creds = cf.cfEnv(options).getServiceCredsByLabel(/NoSQL/);
    expect(creds).toEqual(cloudantCreds);
  });

  test("throws an error for a service label with multiple instances", () => {
    expect(() => cf.cfEnv(options).getServiceCredsByLabel("user-provided")).toThrow(
      "Multiple instances of service found"
    );
  });

  test("throws an error for a regexp that matches a service label with multiple instances", () => {
    expect(() => cf.cfEnv(options).getServiceCredsByLabel(/user/)).toThrow(
      "Multiple instances of service found"
    );
  });

  describe("when no service is found for the specified label string", () => {
    const cfEnv = cf.cfEnv(options);

    test("returns null by default", () => {
      expect(cfEnv.getServiceCredsByLabel("missing")).toBeNull();
    });

    test("throws an error if the service is required", () => {
      expect(() => cfEnv.getServiceCredsByLabel("missing", true)).toThrow("Service not found");
    });
  });

  describe("when no service is found for the specified regexp", () => {
    const cfEnv = cf.cfEnv(options);

    test("returns null by default", () => {
      expect(cfEnv.getServiceCredsByLabel(/missing/)).toBeNull();
    });

    test("throws an error if the service is required", () => {
      expect(() => cfEnv.getServiceCredsByLabel(/missing/, true)).toThrow("Service not found");
    });
  });

  describe("when no services are defined in the cf env", () => {
    const cfEnv = cf.cfEnv();

    test("returns null for a label string by default", () => {
      expect(cfEnv.getServiceCredsByLabel("cloudantNoSQLDB")).toBeNull();
    });

    test("returns null for a regexp by default", () => {
      expect(cfEnv.getServiceCredsByLabel(/NoSQL/)).toBeNull();
    });

    test("throws an error for a label string if the service is required", () => {
      expect(() => cfEnv.getServiceCredsByLabel("cloudantNoSQLDB", true)).toThrow(
        "Service not found"
      );
    });

    test("throws an error for a regex if the service is required", () => {
      expect(() => cfEnv.getServiceCredsByLabel(/NoSQL/, true)).toThrow("Service not found");
    });
  });
});

describe("getServiceCredsByName()", () => {
  test("returns the credentials for a service by instance name string", () => {
    const creds = cf.cfEnv(options).getServiceCredsByName("test-cloudantdb");
    expect(creds).toEqual(cloudantCreds);
  });

  test("returns the credentials for the service whose name matches a specified regexp", () => {
    const creds = cf.cfEnv(options).getServiceCredsByName(/cloudantdb/);
    expect(creds).toEqual(cloudantCreds);
  });

  test("returns credentials for the first of multiple services with names that match a regexp", () => {
    const creds = cf.cfEnv(options).getServiceCredsByName(/service/);
    expect(creds).toEqual(ups1Creds);
  });

  describe("when no service is found for the specified instance name string", () => {
    const cfEnv = cf.cfEnv(options);

    test("returns null by default", () => {
      expect(cfEnv.getServiceCredsByName("missing")).toBeNull();
    });

    test("throws an error if the service is required", () => {
      expect(() => cfEnv.getServiceCredsByName("missing", true)).toThrow("Service not found");
    });
  });

  describe("when no service is found for the specified regexp", () => {
    const cfEnv = cf.cfEnv(options);

    test("returns null by default", () => {
      expect(cfEnv.getServiceCredsByName(/missing/)).toBeNull();
    });

    test("throws an error if the service is required", () => {
      expect(() => cfEnv.getServiceCredsByName(/missing/, true)).toThrow("Service not found");
    });
  });

  describe("when no services are defined in the cf env", () => {
    const cfEnv = cf.cfEnv();
    test("returns null for a name string by default", () => {
      expect(cfEnv.getServiceCredsByName("test-cloudantdb")).toBeNull();
    });

    test("returns null for a regexp by default", () => {
      expect(cfEnv.getServiceCredsByName(/cloudantdb/)).toBeNull();
    });

    test("throws an error for a name string if the service is required", () => {
      expect(() => cfEnv.getServiceCredsByName("test-cloudantdb", true)).toThrow(
        "Service not found"
      );
    });

    test("throws an error for a regexp if the service is required", () => {
      expect(() => cfEnv.getServiceCredsByName(/cloudantdb/, true)).toThrow("Service not found");
    });
  });
});
