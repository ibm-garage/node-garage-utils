const cfutil = require("./cfutil");

const expectedServices = {
  service1: [
    {
      credentials: {
        password: "passw0rd",
        username: "user",
      },
      label: "service1",
      name: "my-service1",
    },
  ],
};

const expectedUserProvided = {
  NODE_ENV: " stage",
  GREETING: " Hello, world!",
  EMPTY: "",
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
NODE_ENV: stage
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

describe("parseServices()", () => {
  test("parses the VCAP_SERVICES out of cf env output", () => {
    expect(cfutil.parseServices(envOutput)).toEqual(expectedServices);
  });

  test("throws when it cannot parse the output", () => {
    expect(() => cfutil.parseServices("Oops!")).toThrow("Invalid cf env output");
  });
});

describe("parseUserProvided()", () => {
  test("parses the user-provided environment variables out of cf env output", () => {
    expect(cfutil.parseUserProvided(envOutput)).toEqual(expectedUserProvided);
  });

  test("returns an empty object when there are no user-provided environment variables", () => {
    expect(cfutil.parseUserProvided(envOutputNoUser)).toEqual({});
  });

  test("throws when it cannot parse the output", () => {
    expect(() => cfutil.parseUserProvided("Oops!")).toThrow("Invalid cf env output");
  });
});

describe("envValue()", () => {
  test("returns a safe value unchanged", () => {
    expect(cfutil.envValue("100%-safe_value")).toBe("100%-safe_value");
  });

  test("trims whitespace off the beginning and end of a safe value", () => {
    expect(cfutil.envValue("  safe   ")).toBe("safe");
  });

  test("adds single quotes to escape an unsafe value", () => {
    expect(cfutil.envValue("unsafe value")).toBe("'unsafe value'");
  });

  test("escapes any single quotes that appear in the value", () => {
    expect(cfutil.envValue("Hallowe'en")).toBe("Hallowe\\'en");
  });

  test("excludes escaped quotes from quoted portion of an unsafe value", () => {
    expect(cfutil.envValue("I'm having fun")).toBe("'I'\\''m having fun'");
  });
});

describe("envScript()", () => {
  test("returns the expected env script content for an .env file", () => {
    expect(cfutil.envScript(".env", false)).toBe(expectedEnvScript);
  });

  test("returns the expected env script content for a services.json file", () => {
    expect(cfutil.envScript("services.json", true)).toBe(expectedJsonScript);
  });
});

describe("splitLines()", () => {
  test("converts a chunk of data into a string and converts it into lines", () => {
    const data = Buffer.from("line 1\nline 2\nline 3");
    const expected = ["line 1", "line 2", "line 3"];
    expect(cfutil.splitLines(data)).toEqual(expected);
  });

  test("does not include an empty last line when the data ends with a newline", () => {
    const data = Buffer.from("line 1\nline 2\n");
    const expected = ["line 1", "line 2"];
    expect(cfutil.splitLines(data)).toEqual(expected);
  });

  test("handles CRLF line endings correctly", () => {
    const data = Buffer.from("line 1\r\nline 2\r\n");
    const expected = ["line 1", "line 2"];
    expect(cfutil.splitLines(data)).toEqual(expected);
  });
});

describe("selectLine()", () => {
  describe("by default", () => {
    test("extracts the JSON message from a line", () => {
      expect(cfutil.selectLine(jsonLine, false, false)).toBe(jsonMessage);
    });

    test("trims the leading whitespace from a non-JSON app line", () => {
      const expected = nonJsonLine.substring(3);
      expect(cfutil.selectLine(nonJsonLine, false, false)).toBe(expected);
    });

    test("trims the leading whitespace from a non-app line", () => {
      const expected = nonAppLine.substring(3);
      expect(cfutil.selectLine(nonAppLine, false, false)).toBe(expected);
    });

    test("trims the leading whitespace off a line with no message", () => {
      const expected = shortLine.substring(3);
      expect(cfutil.selectLine(shortLine, false, false)).toBe(expected);
    });

    test("returns a line that continues a previous log message unchanged", () => {
      expect(cfutil.selectLine(continuedLine, false, false)).toBe(continuedLine);
    });
  });

  describe("with appOnly true", () => {
    test("extracts the JSON message from a line", () => {
      expect(cfutil.selectLine(jsonLine, true, false)).toBe(jsonMessage);
    });

    test("trims the leading whitespace from a non-JSON app line", () => {
      const expected = nonJsonLine.substring(3);
      expect(cfutil.selectLine(nonJsonLine, true, false)).toBe(expected);
    });

    test("returns false for a non-app line", () => {
      expect(cfutil.selectLine(nonAppLine, true, false)).toBe(false);
    });

    test("returns a line that continues a previous log message unchanged", () => {
      expect(cfutil.selectLine(continuedLine, true, false)).toBe(continuedLine);
    });
  });

  describe("with jsonOnly true", () => {
    test("extracts the JSON message from a line", () => {
      expect(cfutil.selectLine(jsonLine, false, true)).toBe(jsonMessage);
    });

    test("returns false for a non-JSON app line", () => {
      expect(cfutil.selectLine(nonJsonLine, false, true)).toBe(false);
    });

    test("returns false for a non-app line (which is also non-JSON)", () => {
      expect(cfutil.selectLine(nonAppLine, false, true)).toBe(false);
    });

    test("returns false for a line that continues a previous log message", () => {
      expect(cfutil.selectLine(continuedLine, false, true)).toBe(false);
    });
  });
});
