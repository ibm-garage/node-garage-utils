const moment = require("moment");
const time = require("./time");

describe("parseUnixTime()", () => {
  test("returns undefined for no input", () => {
    expect(time.parseUnixTime()).toBeUndefined();
  });

  test("returns undefined for an invalid UNIX time", () => {
    expect(time.parseUnixTime("yesterday")).toBeUndefined();
  });

  test("returns a moment corresponding to a UNIX time", () => {
    const m = time.parseUnixTime(1318781876406);
    expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).toBe("2011-10-16T16:17:56.406+00:00");
  });

  test("returns a moment corresponding to a negative UNIX time", () => {
    const m = time.parseUnixTime("-86400000");
    expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).toBe("1969-12-31T00:00:00.000+00:00");
  });

  test("returns a moment corresponding to a valid UNIX time string", () => {
    const m = time.parseUnixTime("1318781876406");
    expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).toBe("2011-10-16T16:17:56.406+00:00");
  });

  test("handles non-integer input that can be converted to an integer", () => {
    const m = time.parseUnixTime("1318781876406.62 milliseconds");
    expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).toBe("2011-10-16T16:17:56.406+00:00");
  });
});

describe("parseIso()", () => {
  test("returns undefined for no input", () => {
    expect(time.parseIso()).toBeUndefined();
  });

  test("returns undefined for an invalid date-time string", () => {
    expect(time.parseIso("foo")).toBeUndefined();
  });

  test("returns undefined for a close-but-not-quite date-time string", () => {
    expect(time.parseIso("1996-07-40T00Z")).toBeUndefined();
  });

  test("returns undefined for a date-time string with no UTC offset", () => {
    expect(time.parseIso("1996-07-14T00")).toBeUndefined();
  });

  test("returns the expected moment for a valid UTC date-time string", () => {
    const m = time.parseIso("1996-07-14T00Z");
    expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).toBe("1996-07-14T00:00:00.000+00:00");
  });

  test("returns the expected moment for a complete date-time string with zero UTC offset", () => {
    const m = time.parseIso("2008-01-14T13:21:13.451+00:00");
    expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).toBe("2008-01-14T13:21:13.451+00:00");
  });

  test("returns the expected moment for a complete date-time string with non-zero UTC offset", () => {
    const m = time.parseIso("2008-01-14T13:21:13.451+06:00");
    expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).toBe("2008-01-14T13:21:13.451+06:00");
  });
});

describe("isIsoUtc()", () => {
  test("returns false for no input", () => {
    expect(time.isIsoUtc()).toBe(false);
  });

  test("returns false for an invalid date-time string", () => {
    expect(time.isIsoUtc("foo")).toBe(false);
  });

  test("returns false for a close-but-not-quite date-time string", () => {
    expect(time.isIsoUtc("1996-07-40T00Z")).toBe(false);
  });

  test("returns false for a date-time string with no UTC offset", () => {
    expect(time.isIsoUtc("1996-07-14T00")).toBe(false);
  });

  test("returns true for a valid UTC date-time string", () => {
    expect(time.isIsoUtc("1996-07-14T00Z")).toBe(true);
  });

  test("returns true for a complete date-time string with zero UTC offset", () => {
    expect(time.isIsoUtc("2008-01-14T13:21:13.451+00:00")).toBe(true);
  });

  test("returns false for a complete date-time string with non-zero UTC offset", () => {
    expect(time.isIsoUtc("2008-01-14T13:21:13.451+06:00")).toBe(false);
  });
});

describe("formatIsoUtc()", () => {
  test("returns undefined for no input", () => {
    expect(time.formatIsoUtc()).toBeUndefined();
  });

  test("throws an exception for non-moment input", () => {
    expect(() => {
      time.formatIsoUtc("now");
    }).toThrow(TypeError);
  });

  test("correctly formats a UTC date-time", () => {
    const m = moment("2016-09-02T09:15Z", moment.ISO_8601);
    expect(time.formatIsoUtc(m)).toBe("2016-09-02T09:15:00.000Z");
  });

  test("correctly formats a full date-time with UTC offset", () => {
    const m = moment("2005-09-11T18:00:03.623-08:00", moment.ISO_8601);
    expect(time.formatIsoUtc(m)).toBe("2005-09-12T02:00:03.623Z");
  });

  test("correctly formats a date (assumed local time)", () => {
    const m = moment("2016-09-02T09:15", moment.ISO_8601);
    expect(time.formatIsoUtc(m)).toBe(m.utc().format("YYYY-MM-DDTHH:mm:ss.SSS") + "Z");
  });

  test("correctly formats the current time", () => {
    const m = moment();
    expect(time.formatIsoUtc(m)).toBe(m.utc().format("YYYY-MM-DDTHH:mm:ss.SSS") + "Z");
  });
});

describe("nowIsoUtc()", () => {
  test("returns the current time as a UTC date-time", () => {
    const now = time.nowIsoUtc();

    // Trim to minutes so it's very unlikely to have changed
    const expectedMin = moment.utc().format("YYYY-MM-DDTHH:mm");
    expect(now).toHaveLength(24);
    expect(now.substring(0, expectedMin.length)).toBe(expectedMin);
  });
});
