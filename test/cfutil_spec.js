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

const expectedEnvScript = `filename="\${1:-.env}"
set -a
. "$filename"
set +a
`;

const expectedJsonScript = `filename="\${1:-services.json}"
set -a
VCAP_SERVICES=$(cat "$filename")
set +a
`;

const jsonMessage =
  '{"name":"server","hostname":"6767b2d2-1685-11e9-8eb2-2801","pid":92,"level":30,"msg":"Something happened","time":"2018-12-21T14:45:49.736Z","v":0}';
const jsonLine = "   2018-12-21T09:45:49.73-0500 [APP/PROC/WEB/0] OUT " + jsonMessage;
const nonJsonLine =
  "   2018-12-21T09:45:49.18-0500 [APP/PROC/WEB/0] OUT [2018-12-21 14:45:49.184] [DEBUG] appid-user-manager - Getting all attributes";
const nonAppLine =
  '   2018-12-21T09:45:49.73-0500 [RTR/18] OUT my-app.mybluemix.net - [2018-12-21T14:45:49.067+0000] "GET /api/random HTTP/1.1" 200 0 0 "https://my-app.mybluemix.net/"';
const shortLine = "   2018-12-21T09:45:49.73-0500 [RTR/18] OUT";
const continuedLine = "    at <anonymous>:1:11";

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

  describe("envScript()", () => {
    it("returns the expected env script content for an .env file", () => {
      expect(cfutil.envScript(".env", false)).to.equal(expectedEnvScript);
    });

    it("returns the expected env script content for a services.json file", () => {
      expect(cfutil.envScript("services.json", true)).to.equal(expectedJsonScript);
    });
  });

  describe("splitLines()", () => {
    it("converts a chunk of data into a string and converts it into lines", () => {
      const data = Buffer.from("line 1\nline 2\nline 3");
      const expected = ["line 1", "line 2", "line 3"];
      expect(cfutil.splitLines(data)).to.deep.equal(expected);
    });

    it("does not include an empty last line when the data ends with a newline", () => {
      const data = Buffer.from("line 1\nline 2\n");
      const expected = ["line 1", "line 2"];
      expect(cfutil.splitLines(data)).to.deep.equal(expected);
    });

    it("handles CRLF line endings correctly", () => {
      const data = Buffer.from("line 1\r\nline 2\r\n");
      const expected = ["line 1", "line 2"];
      expect(cfutil.splitLines(data)).to.deep.equal(expected);
    });
  });

  describe("selectLine()", () => {
    describe("by default", () => {
      it("extracts the JSON message from a line", () => {
        expect(cfutil.selectLine(jsonLine, false, false)).to.equal(jsonMessage);
      });

      it("trims the leading whitespace from a non-JSON app line", () => {
        const expected = nonJsonLine.substring(3);
        expect(cfutil.selectLine(nonJsonLine, false, false)).to.equal(expected);
      });

      it("trims the leading whitespace from a non-app line", () => {
        const expected = nonAppLine.substring(3);
        expect(cfutil.selectLine(nonAppLine, false, false)).to.equal(expected);
      });

      it("trims the leading whitespace off a line with no message", () => {
        const expected = shortLine.substring(3);
        expect(cfutil.selectLine(shortLine, false, false)).to.equal(expected);
      });

      it("returns a line that continues a previous log message unchanged", () => {
        expect(cfutil.selectLine(continuedLine, false, false)).to.equal(continuedLine);
      });
    });

    describe("with appOnly true", () => {
      it("extracts the JSON message from a line", () => {
        expect(cfutil.selectLine(jsonLine, true, false)).to.equal(jsonMessage);
      });

      it("trims the leading whitespace from a non-JSON app line", () => {
        const expected = nonJsonLine.substring(3);
        expect(cfutil.selectLine(nonJsonLine, true, false)).to.equal(expected);
      });

      it("returns false for a non-app line", () => {
        expect(cfutil.selectLine(nonAppLine, true, false)).to.be.false;
      });

      it("returns a line that continues a previous log message unchanged", () => {
        expect(cfutil.selectLine(continuedLine, true, false)).to.equal(continuedLine);
      });
    });

    describe("with jsonOnly true", () => {
      it("extracts the JSON message from a line", () => {
        expect(cfutil.selectLine(jsonLine, false, true)).to.equal(jsonMessage);
      });

      it("returns false for a non-JSON app line", () => {
        expect(cfutil.selectLine(nonJsonLine, false, true)).to.be.false;
      });

      it("returns false for a non-app line (which is also non-JSON)", () => {
        expect(cfutil.selectLine(nonAppLine, false, true)).to.be.false;
      });

      it("returns false for a line that continues a previous log message", () => {
        expect(cfutil.selectLine(continuedLine, false, true)).to.be.false;
      });
    });
  });
});
