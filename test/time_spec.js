const { expect } = require("chai");
const moment = require("moment");
const { time } = require("../index");

describe("time", () => {
  describe("parseUnixTime()", () => {
    it("returns undefined for no input", () => {
      expect(time.parseUnixTime()).to.be.undefined;
    });

    it("returns undefined for an invalid UNIX time", () => {
      expect(time.parseUnixTime("yesterday")).to.be.undefined;
    });

    it("returns a moment corresponding to a UNIX time", () => {
      const m = time.parseUnixTime(1318781876406);
      expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).to.equal("2011-10-16T16:17:56.406+00:00");
    });

    it("returns a moment corresponding to a negative UNIX time", () => {
      const m = time.parseUnixTime("-86400000");
      expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).to.equal("1969-12-31T00:00:00.000+00:00");
    });

    it("returns a moment corresponding to a valid UNIX time string", () => {
      const m = time.parseUnixTime("1318781876406");
      expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).to.equal("2011-10-16T16:17:56.406+00:00");
    });

    it("handles non-integer input that can be converted to an integer", () => {
      const m = time.parseUnixTime("1318781876406.62 milliseconds");
      expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).to.equal("2011-10-16T16:17:56.406+00:00");
    });
  });

  describe("parseIso()", () => {
    it("returns undefined for no input", () => {
      expect(time.parseIso()).to.be.undefined;
    });

    it("returns undefined for an invalid date-time string", () => {
      expect(time.parseIso("foo")).to.be.undefined;
    });

    it("returns undefined for a close-but-not-quite date-time string", () => {
      expect(time.parseIso("1996-07-40T00Z")).to.be.undefined;
    });

    it("returns undefined for a date-time string with no UTC offset", () => {
      expect(time.parseIso("1996-07-14T00")).to.be.undefined;
    });

    it("returns the expected moment for a valid UTC date-time string", () => {
      const m = time.parseIso("1996-07-14T00Z");
      expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).to.equal("1996-07-14T00:00:00.000+00:00");
    });

    it("returns the expected moment for a complete date-time string with zero UTC offset", () => {
      const m = time.parseIso("2008-01-14T13:21:13.451+00:00");
      expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).to.equal("2008-01-14T13:21:13.451+00:00");
    });

    it("returns the expected moment for a complete date-time string with non-zero UTC offset", () => {
      const m = time.parseIso("2008-01-14T13:21:13.451+06:00");
      expect(m.format("YYYY-MM-DDTHH:mm:ss.SSSZ")).to.equal("2008-01-14T13:21:13.451+06:00");
    });
  });

  describe("isIsoUtc()", () => {
    it("returns false for no input", () => {
      expect(time.isIsoUtc()).to.be.false;
    });

    it("returns false for an invalid date-time string", () => {
      expect(time.isIsoUtc("foo")).to.be.false;
    });

    it("returns false for a close-but-not-quite date-time string", () => {
      expect(time.isIsoUtc("1996-07-40T00Z")).to.be.false;
    });

    it("returns false for a date-time string with no UTC offset", () => {
      expect(time.isIsoUtc("1996-07-14T00")).to.be.false;
    });

    it("returns true for a valid UTC date-time string", () => {
      expect(time.isIsoUtc("1996-07-14T00Z")).to.be.true;
    });

    it("returns true for a complete date-time string with zero UTC offset", () => {
      expect(time.isIsoUtc("2008-01-14T13:21:13.451+00:00")).to.be.true;
    });

    it("returns false for a complete date-time string with non-zero UTC offset", () => {
      expect(time.isIsoUtc("2008-01-14T13:21:13.451+06:00")).to.be.false;
    });
  });

  describe("formatIsoUtc()", () => {
    it("returns undefined for no input", () => {
      expect(time.formatIsoUtc()).to.be.undefined;
    });

    it("throws an exception for non-moment input", () => {
      expect(() => {
        time.formatIsoUtc("now");
      }).to.throw(TypeError);
    });

    it("correctly formats a UTC date-time", () => {
      const m = moment("2016-09-02T09:15Z", moment.ISO_8601);
      expect(time.formatIsoUtc(m)).to.equal("2016-09-02T09:15:00.000Z");
    });

    it("correctly formats a full date-time with UTC offset", () => {
      const m = moment("2005-09-11T18:00:03.623-08:00", moment.ISO_8601);
      expect(time.formatIsoUtc(m)).to.equal("2005-09-12T02:00:03.623Z");
    });

    it("correctly formats a date (assumed local time)", () => {
      const m = moment("2016-09-02T09:15", moment.ISO_8601);
      expect(time.formatIsoUtc(m)).to.equal(m.utc().format("YYYY-MM-DDTHH:mm:ss.SSS") + "Z");
    });

    it("correctly formats the current time", () => {
      const m = moment();
      expect(time.formatIsoUtc(m)).to.equal(m.utc().format("YYYY-MM-DDTHH:mm:ss.SSS") + "Z");
    });
  });

  describe("nowIsoUtc()", () => {
    it("returns the current time as a UTC date-time", () => {
      const now = time.nowIsoUtc();

      // Trim to minutes so it's very unlikely to have changed
      const expectedMin = moment.utc().format("YYYY-MM-DDTHH:mm");
      expect(now).to.have.lengthOf(24);
      expect(now.substring(0, expectedMin.length)).to.equal(expectedMin);
    });
  });
});
