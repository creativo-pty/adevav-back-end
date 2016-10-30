'use strict';

const Boom = require('boom');

const Formatters = require('../lib/formatters');

const INVALID_EMAIL_PASSWORD = Boom.unauthorized('Invalid email or password');

exports.login = function({ payload }, reply) {

  return this.models.User.getUserByEmail(payload.email)
  .then((loginUser) => {

    if (!loginUser || !loginUser.isValidPassword(payload.password)) {
      return reply(INVALID_EMAIL_PASSWORD);
    }

    const token = this.helpers.createJWTToken(loginUser);

    return reply(Formatters.loginResult({ token, loginUser })).code(200);
  })

  .catch(this.helpers.errorHandler.bind(this, reply));
};
