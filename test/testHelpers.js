'use strict';

const Code = require('code');
const Lab = require('lab');
const sinon = require('sinon');

const lab = exports.lab = Lab.script();

const server = require('../lib/server');

Object.assign(global, {
  after: lab.after,
  afterEach: lab.afterEach,
  before: lab.before,
  beforeEach: lab.beforeEach,
  describe: lab.describe,
  expect: Code.expect,
  it: lab.it,
  Lab,
  Server: server,
  sinon
});
