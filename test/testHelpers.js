'use strict';

const Code = require('code');
const jwt = require('jsonwebtoken');
const Lab = require('lab');
const moment = require('moment');
const Promise = require('bluebird');
const sinon = require('sinon');
const uuid = require('node-uuid');

const lab = exports.lab = Lab.script();

const { jwtExpiresInDays, jwtSessionKey } = require('../config/server');
const server = require('../lib/server');

function createToken(options = {}) {
  return 'Bearer ' + jwt.sign({
    iss: 'ADEVAV',
    iat: moment().unix(),
    exp: moment().add(jwtExpiresInDays, 'day').unix(),
    aud: 'adevav.org',
    sub: options.sub || uuid.v4(),
    role: options.role || 'Administrator'
  }, jwtSessionKey, { algorithm: 'HS256' } );
}

function destroyAll(instances) {
  return Promise.each(instances, (instance) => {
    if (!instance.destroy) {
      throw new Error('Instance does not have a destroy function');
    }
    return instance.destroy();
  });
}

function invalidToken() {
  return 'Bearer ' + jwt.sign({
    iss: 'ADEVAV',
    iat: moment().unix(),
    exp: moment().add(jwtExpiresInDays, 'day').unix(),
    aud: 'adevav.org',
    sub: uuid.v4()
  }, jwtSessionKey, { algorithm: 'HS256' } );
}

const loggedUsers = {};

function logIn() {
  return Promise.props({
    Administrator: performLogin('Administrator'),
    Editor: performLogin('Editor'),
    Author: performLogin('Author'),
    Contributor: performLogin('Contributor'),
    Subscriber: performLogin('Subscriber')
  });
}

function performLogin(role) {
  return new Promise((resolve, reject) => {
    if (loggedUsers[role]) {
      return resolve(loggedUsers[role]);
    }

    loggedUsers[role] = 'Bearer ' + jwt.sign({
      iss: 'ADEVAV',
      iat: moment().unix(),
      exp: moment().add(jwtExpiresInDays, 'day').unix(),
      aud: 'adevav.org',
      sub: uuid.v4(),
      role
    }, jwtSessionKey, { algorithm: 'HS256' });

    return resolve(loggedUsers[role]);
  });
}

Object.assign(global, {
  after: lab.after,
  afterEach: lab.afterEach,
  before: lab.before,
  beforeEach: lab.beforeEach,
  createToken,
  describe: lab.describe,
  destroyAll,
  expect: Code.expect,
  invalidToken,
  it: lab.it,
  Lab,
  logIn,
  Server: server,
  sinon
});
