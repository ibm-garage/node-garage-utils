'use strict';

const chai = require('chai');
const expect = chai.expect;
const logging = require('../index').logging;

describe('logging', () => {
  describe('formatter()', () => {
    const ts = '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{2}Z|(?:[+\\-][0-9]{4})';

    it('formats an empty log entry', () => {
      expect(logging.formatter({})).to.equal('');
    });

    it('formats a minimal log entry with just a level', () => {
      const options = { timestamp: false, level: 'error', label: null, message: '', meta: {}};
      expect(logging.formatter(options)).to.equal('[ERROR] ');
    });

    it('formats a basic log entry with level and message', () => {
      const options = { timestamp: false, level: 'warn', label: null, message: 'Something looks wrong', meta: {}};
      expect(logging.formatter(options)).to.equal('[WARN] Something looks wrong');
    });

    it('formats a log entry with default timestamp, level, and message', () => {
      const options = { timestamp: true, level: 'info', label: null, message: 'Something happened', meta: {}};
      expect(logging.formatter(options)).to.match(new RegExp(ts + ' \\[INFO\\] Something happened'));
    });

    it('formats a log entry with custom timestamp, level, and message', () => {
      const options = {
        timestamp: () => '12:30PM',
        level: 'info', label: null, message: 'Something happened', meta: {}};
      expect(logging.formatter(options)).to.equal('12:30PM [INFO] Something happened');
    });

    it('formats a log entry with default timestamp, level, label, and message', () => {
      const options = { timestamp: true, level: 'verbose', label: 'api', message: 'Some detail', meta: {}};
      expect(logging.formatter(options)).to.match(new RegExp(ts + ' \\[VERBOSE\\] \\[api\\] Some detail'));
    });

    it('formats a log entry with default timestamp, level, and error', () => {
      const error = new Error('Oops');
      const options = { timestamp: true, level: 'error', label: null, message: '', meta: error };
      expect(logging.formatter(options)).to.match(new RegExp(ts + ' \\[ERROR\\] Error: Oops\n      at Context'));
    });

    it('formats a log entry with level, message, and simple metadata', () => {
      const options = { timestamp: false, level: 'trace', message: 'Entering foo()', meta: { x: 3, y: 4 }};
      const expected = '[TRACE] Entering foo() { x: 3, y: 4 }';
      expect(logging.formatter(options)).to.equal(expected);
    });

    it('formats a log entry with level, message, and complex metadata', () => {
      const options = { timestamp: false, level: 'trace', message: 'Entering foo()',
        meta: { x: 3, y: 4, outer: { inner: 'value', arr: [ 1, 2, 3, { clipped: true } ] } }
      };
      const expected = '[TRACE] Entering foo()\n  { x: 3,\n    y: 4,\n    outer: { inner: \'value\', arr: [ 1, 2, 3, [Object] ] } }';
      expect(logging.formatter(options)).to.equal(expected);
    });

    it('formats a complete log entry with default timestamp, level, label, message, error, and metadata', () => {
      const options = {
        timestamp: true, level: 'error', label: 'api', message: 'Internal error',
        meta: { error: new Error('Oops'), id: 1443, code: 'oops' }
      };
      const log = logging.formatter(options);
      const expected = ts + ' \\[ERROR\\] \\[api\\] Internal error { id: 1443, code: \'oops\' }\n  Error: Oops\n      at Context';
      expect(log).to.match(new RegExp(expected));
    });
  });
});
