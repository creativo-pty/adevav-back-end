'use strict';

const _ = require('lodash');
const Boom = require('boom');
const moment = require('moment');
const Promise = require('bluebird');
const jwt = require('jsonwebtoken');

const config = require('../config/server');

const Helpers = {};

Helpers.createJWTToken = function(user) {
  return 'Bearer ' + jwt.sign({
    iss: 'ADEVAV',
    iat: moment().unix(),
    exp: moment().add(config.jwtExpiresInDays, 'day').unix(),
    aud: 'adevav.org',
    sub: user.id,
    role: user.role
  }, config.jwtSessionKey, { algorithm: 'HS256'});
};

Helpers.errorHandler = function(reply, err) {
  this.logger.error(err.stack);

  return reply(Boom.badImplementation('An unknown error has occured. Please try again later.'));
};

Helpers.verifyJWT = function(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwtSessionKey, { algorithm: 'HS256'}, (err, decoded) => {
      if (err) {
        return reject(new Errors.InvalidTokenError(err.message, 'INVALID_TOKEN_ERROR'));
      }
      return resolve(decoded);
    });
  });
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
