'use strict';

const chai = require('chai');
const expect = chai.expect;
const path = require('path');
const app = require('../index').app;

describe('app', () => {
  describe('rootDir()', () => {
    let origAppDir;

    beforeEach(() => {
      origAppDir = app._dir;
    });

    afterEach(() => {
      app._dir = origAppDir;
    });

    it('returns the correct base dir relative to __dirname for this module', () => {
      expect(path.join(app.rootDir(), 'test')).to.equal(__dirname);
    });

    it('returns the expected root when app tweaked to simulate installation under node_modules', () => {
      const rootDir = path.sep + path.join('home', 'myapp');
      const dir = path.join(rootDir, 'node_modules', 'sub', 'node_modules', 'lib');
      app._dir = dir;
      expect(app.rootDir()).to.equal(rootDir);
    });

    it('throws when app is in an invalid location', () => {
      app._dir = path.join(app._dir, 'oops');
      expect(() => { app.rootDir(); }).to.throw(Error, /invalid location/);
    });
  });

  describe('isTest()', () => {
    let origMainFilename;

    beforeEach(() => {
      origMainFilename = require.main.filename;
    });

    afterEach(() => {
      require.main.filename = origMainFilename;
    });

    it('returns true in an unmodified testing environment', () => {
      expect(app.isTest()).to.be.true;
    });

    it('returns false when mocha is tweaked to simulate a non-testing environment', () => {
      require.main.filename = path.join(app.rootDir(), 'app.js');
      expect(app.isTest()).to.be.false;
    });
  });

  describe('isDev()', () => {
    let origNodeEnv;

    beforeEach(() => {
      origNodeEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
      process.env.NODE_ENV = origNodeEnv;
    });

    it('returns true if the NODE_ENV environment variable is not set', () => {
      process.env.NODE_ENV = undefined;
      expect(app.isDev()).to.be.true;
    });

    it('returns true if NODE_ENV is set to \'development\'', () => {
      process.env.NODE_ENV = 'development';
      expect(app.isDev()).to.be.true;
    });

    it('returns false if NODE_ENV is set to \'production\'', () => {
      process.env.NODE_ENV = 'production';
      expect(app.isDev()).to.be.false;
    });

    it('returns true if NODE_ENV is set to anything else', () => {
      process.env.NODE_ENV = 'prod';
      expect(app.isDev()).to.be.true;
    });
  });

  describe('env', () => {
    it('has the default rootDir value', () => {
      expect(app.env.rootDir).to.equal(app.rootDir());
    });
    it('has the default isTest value', () => {
      expect(app.env.isTest).to.equal(app.isTest());
    });
    it('has the default isDev value', () => {
      expect(app.env.isDev).to.equal(app.isDev());
    });
  });
});
