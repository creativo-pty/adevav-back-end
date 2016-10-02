'use strict';

const hapiAuthwt = require('hapi-auth-jwt2');
const moment = require('moment');

const config = require('./server');

const Authentication = {
  register: function(server, { jwtSessionKey, tokenType }, next) {
    server.logger.info('Loading authentication strategies...');
    server.register(hapiAuthwt, (err) => {
      if (err) {
        return next(err);
      }
      server.auth.strategy('jwt', 'jwt', {
        key: jwtSessionKey,
        validateFunc: (decoded, request, callback) => {
          if (!decoded.role || !decoded.exp || decoded.exp < moment().unix()) {
            return callback(null, false);
          }

          return callback(null, true, { userId: decoded.sub, role: decoded.role });
        },
        verifyOptions: {
          algorithms: ['HS256']
        },
        tokenType: tokenType || ''
      });

      server.logger.info('Loading strategies done!');
      return next();
    });
  }
};

Authentication.register.attributes = {
  name: 'Authentication',
  version: '1.0.0'
};

module.exports = {
  register: Authentication,
  options: config
};
