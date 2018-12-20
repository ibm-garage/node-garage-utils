const { expect } = require("chai");
const cfutil = require("../bin/cfutil");

const expectedServices = {
  service1: [
    {
      credentials: {
        password: "passw0rd",
        username: "user"
      },
      label: "service1",
      name: "my-service1"
    }
  ]
};

const expectedUserProvided = {
  NODE_ENV: " test",
  GREETING: " Hello, world!",
  EMPTY: ""
};

const envOutput = `Getting env variables for app my-app in org my-org / space my-space as user@ibm.com...
OK

System-Provided:
{
 "VCAP_SERVICES": {
  "service1": [
   {
    "credentials": {
     "password": "passw0rd",
     "username": "user"
    },
    "label": "service1",
    "name": "my-service1"
   }
  ]
 }
}

{
 "VCAP_APPLICATION": {
  "application_id": "1234",
  "application_name": "my-app"
 }
}

User-Provided:
NODE_ENV: test
GREETING: Hello, world!
EMPTY:

Running Environment Variable Groups:
BLUEMIX_REGION: ibm:yp:us-south

Staging Environment Variable Groups:
BLUEMIX_REGION: ibm:yp:us-south
`;

const envOutputNoUser = `Getting env variables for app my-app in org my-org / space my-space as user@ibm.com...
OK

System-Provided:
{
 "VCAP_SERVICES": {
  "service1": [
   {
    "credentials": {
     "password": "passw0rd",
     "username": "user"
    },
    "label": "service1",
    "name": "my-service1"
   }
  ]
 }
}

{
 "VCAP_APPLICATION": {
  "application_id": "1234",
  "application_name": "my-app"
 }
}

No user-defined env variables have been set

Running Environment Variable Groups:
BLUEMIX_REGION: ibm:yp:us-south

Staging Environment Variable Groups:
BLUEMIX_REGION: ibm:yp:us-south`;

describe("cfutil", () => {
  describe("parseServices()", () => {
    it("parses the VCAP_SERVICES out of cf env output", () => {
      expect(cfutil.parseServices(envOutput)).to.deep.equal(expectedServices);
    });

    it("throws when it cannot parse the output", () => {
      expect(() => cfutil.parseServices("Oops!")).to.throw("Invalid cf env output");
    });
  });

  describe("parseUserProvided()", () => {
    it("parses the user-provided environment variables out of cf env output", () => {
      expect(cfutil.parseUserProvided(envOutput)).to.deep.equal(expectedUserProvided);
    });

    it("returns an empty object when there are no user-provided environment variables", () => {
      expect(cfutil.parseUserProvided(envOutputNoUser)).to.deep.equal({});
    });

    it("throws when it cannot parse the output", () => {
      expect(() => cfutil.parseUserProvided("Oops!")).to.throw("Invalid cf env output");
    });
  });

  describe("envValue()", () => {
    it("returns a safe value unchanged", () => {
      expect(cfutil.envValue("100%-safe_value")).to.equal("100%-safe_value");
    });

    it("trims whitespace off the beginning and end of a safe value", () => {
      expect(cfutil.envValue("  safe   ")).to.equal("safe");
    });

    it("adds single quotes to escape an unsafe value", () => {
      expect(cfutil.envValue("unsafe value")).to.equal("'unsafe value'");
    });

    it("escapes any single quotes that appear in the value", () => {
      expect(cfutil.envValue("Hallowe'en")).to.equal("Hallowe\\'en");
    });

    it("excludes escaped quotes from quoted portion of an unsafe value", () => {
      expect(cfutil.envValue("I'm having fun")).to.equal("'I'\\''m having fun'");
    });
  });
});
