const moment = require("moment");

const time = {};
module.exports = time;

// Creates a moment from the given UNIX time (milliseconds since the Epoch).
// If the UNIX time is not an integer, it will be converted if possible.
// Returns a UTC moment, or undefined for invalid input.
time.parseUnixTime = n => {
  n = parseInt(n);
  if (n) {
    const m = moment(n);
    if (m.isValid()) {
      return m.utc();
    }
  }
  return undefined;
};

// Strictly parses an ISO 8601 date-time string that must specify a UTC offset (or Z).
// Returns a moment, or undefined if the date is invalid or doesn't have a UTC offset.
// The moment has the UTC offset specified in the string by default.
// You can use utc() or local() to shift to UTC or local time.
time.parseIso = s => {
  const m = moment.parseZone(s, moment.ISO_8601, true);
  if (!m.isValid()) {
    return undefined;
  }

  // Look at the creation data format to verify that a UTC offset was specified.
  const format = m.creationData().format;
  return format.charAt(format.length - 1) == "Z" ? m : undefined;
};

// Returns true for an ISO 8601 date-time string with a zero UTC offset, false otherwise.
time.isIsoUtc = s => {
  const m = time.parseIso(s);
  return !!m && m.utcOffset() == 0;
};

// Converts a moment to an ISO 8601 date-time string with a 0 UTC offset (Z).
time.formatIsoUtc = m => {
  return m && m.isValid()
    ? m
        .clone()
        .utc()
        .format("YYYY-MM-DDTHH:mm:ss.SSS") + "Z"
    : undefined;
};

// Returns the current time as an ISO 8601 date-time string with a 0 UTC offset (Z).
time.nowIsoUtc = () => {
  return time.formatIsoUtc(moment());
};
