const { expect } = require("chai");
const { cf } = require("../index");

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

describe("cf", () => {
  describe("cfEnv()", () => {
    it("returns a cf env with expected properties", () => {
      const cfEnv = cf.cfEnv();
      expect(cfEnv.app).to.deep.equal({});
      expect(cfEnv.services).to.deep.equal({});
      expect(cfEnv.name).to.not.be.undefined;
      expect(cfEnv.isLocal).to.be.true;
      expect(cfEnv.getServiceCredsByLabel).to.be.a("function");
      expect(cfEnv.getServiceCredsByName).to.be.a("function");
    });

    it("uses vcap services from options, if specified", () => {
      const cfEnv = cf.cfEnv(options);
      expect(cfEnv.services.cloudantNoSQLDB).to.have.lengthOf(1);
      expect(cfEnv.services["user-provided"]).to.have.lengthOf(2);
    });
  });

  describe("getServiceCredsByLabel()", () => {
    it("returns the credentials for a service by label string", () => {
      const creds = cf.cfEnv(options).getServiceCredsByLabel("cloudantNoSQLDB");
      expect(creds).to.deep.equal(cloudantCreds);
    });

    it("returns credentials for the service whose label matches a specified regexp", () => {
      const creds = cf.cfEnv(options).getServiceCredsByLabel(/NoSQL/);
      expect(creds).to.deep.equal(cloudantCreds);
    });

    it("throws an error for a service label with multiple instances", () => {
      expect(() => cf.cfEnv(options).getServiceCredsByLabel("user-provided")).to.throw(
        "Multiple instances of service found"
      );
    });

    it("throws an error for a regexp that matches a service label with multiple instances", () => {
      expect(() => cf.cfEnv(options).getServiceCredsByLabel(/user/)).to.throw(
        "Multiple instances of service found"
      );
    });

    describe("when no service is found for the specified label string", () => {
      const cfEnv = cf.cfEnv(options);

      it("returns null by default", () => {
        expect(cfEnv.getServiceCredsByLabel("missing")).to.be.null;
      });

      it("throws an error if the service is required", () => {
        expect(() => cfEnv.getServiceCredsByLabel("missing", true)).to.throw("Service not found");
      });
    });

    describe("when no service is found for the specified regexp", () => {
      const cfEnv = cf.cfEnv(options);

      it("returns null by default", () => {
        expect(cfEnv.getServiceCredsByLabel(/missing/)).to.be.null;
      });

      it("throws an error if the service is required", () => {
        expect(() => cfEnv.getServiceCredsByLabel(/missing/, true)).to.throw("Service not found");
      });
    });

    describe("when no services are defined in the cf env", () => {
      const cfEnv = cf.cfEnv();

      it("returns null for a label string by default", () => {
        expect(cfEnv.getServiceCredsByLabel("cloudantNoSQLDB")).to.be.null;
      });

      it("returns null for a regexp by default", () => {
        expect(cfEnv.getServiceCredsByLabel(/NoSQL/)).to.be.null;
      });

      it("throws an error for a label string if the service is required", () => {
        expect(() => cfEnv.getServiceCredsByLabel("cloudantNoSQLDB", true)).to.throw(
          "Service not found"
        );
      });

      it("throws an error for a regex if the service is required", () => {
        expect(() => cfEnv.getServiceCredsByLabel(/NoSQL/, true)).to.throw("Service not found");
      });
    });
  });

  describe("getServiceCredsByName()", () => {
    it("returns the credentials for a service by instance name string", () => {
      const creds = cf.cfEnv(options).getServiceCredsByName("test-cloudantdb");
      expect(creds).to.deep.equal(cloudantCreds);
    });

    it("returns the credentials for the service whose name matches a specified regexp", () => {
      const creds = cf.cfEnv(options).getServiceCredsByName(/cloudantdb/);
      expect(creds).to.deep.equal(cloudantCreds);
    });

    it("returns credentials for the first of multiple services with names that match a regexp", () => {
      const creds = cf.cfEnv(options).getServiceCredsByName(/service/);
      expect(creds).to.deep.equal(ups1Creds);
    });

    describe("when no service is found for the specified instance name string", () => {
      const cfEnv = cf.cfEnv(options);

      it("returns null by default", () => {
        expect(cfEnv.getServiceCredsByName("missing")).to.be.null;
      });

      it("throws an error if the service is required", () => {
        expect(() => cfEnv.getServiceCredsByName("missing", true)).to.throw("Service not found");
      });
    });

    describe("when no service is found for the specified regexp", () => {
      const cfEnv = cf.cfEnv(options);

      it("returns null by default", () => {
        expect(cfEnv.getServiceCredsByName(/missing/)).to.be.null;
      });

      it("throws an error if the service is required", () => {
        expect(() => cfEnv.getServiceCredsByName(/missing/, true)).to.throw("Service not found");
      });
    });

    describe("when no services are defined in the cf env", () => {
      const cfEnv = cf.cfEnv();
      it("returns null for a name string by default", () => {
        expect(cfEnv.getServiceCredsByName("test-cloudantdb")).to.be.null;
      });

      it("returns null for a regexp by default", () => {
        expect(cfEnv.getServiceCredsByName(/cloudantdb/)).to.be.null;
      });

      it("throws an error for a name string if the service is required", () => {
        expect(() => cfEnv.getServiceCredsByName("test-cloudantdb", true)).to.throw(
          "Service not found"
        );
      });

      it("throws an error for a regexp if the service is required", () => {
        expect(() => cfEnv.getServiceCredsByName(/cloudantdb/, true)).to.throw("Service not found");
      });
    });
  });
});
