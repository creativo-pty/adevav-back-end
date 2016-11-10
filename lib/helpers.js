'use strict';

const _ = require('lodash');
const Boom = require('boom');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const Promise = require('bluebird');

const { jwtExpiresInDays, jwtSessionKey } = require('../config/server');

const Helpers = {};

Helpers.createJWTToken = function(user) {
  return 'Bearer ' + jwt.sign({
    iss: 'ADEVAV',
    iat: moment().unix(),
    exp: moment().add(jwtExpiresInDays, 'day').unix(),
    aud: 'adevav.org',
    sub: user.id,
    role: user.role
  }, jwtSessionKey, { algorithm: 'HS256'});
};

Helpers.errorHandler = function(reply, err) {
  this.logger.error(err.stack);

  return reply(Boom.badImplementation('An unknown error has occured. Please try again later.'));
};

Helpers.extractTokenFromHeaders = function({ authorization }) {
  let authParts = [];

  if (authorization) {
    authParts = authorization.split(' ');
  }

  const token = (authParts.length === 2) ? authParts[1] : '';

  return verifyJWT(token);
};

exports.register = function(server, options, next) {
  // Bind the server to the helper functions
  _.each(Helpers, (helper, idx) => {
    Helpers[idx] = helper.bind(server);
  });

  server.decorate('server', 'helpers', Helpers);
  next();
};

exports.register.attributes = {
  name: 'Helpers',
  version: '1.0.0'
};

function verifyJWT(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, jwtSessionKey, { algorithm: 'HS256'}, (err, decoded) => {
      if (err) {
        return resolve({});
      }
      return resolve(decoded);
    });
  });
};
