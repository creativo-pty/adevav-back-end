'use strict';

const Boom = require('boom');

const Errors = require('../lib/errors');
const Formatters = require('../lib/formatters');

exports.login = function({ payload }, reply) {

  return this.models.User.getUserByEmail(payload.email)
  .then((loginUser) => {

    if (!loginUser || !loginUser.isValidPassword(payload.password)) {
      throw new Errors.InvalidEmailPasswordError();
    }

    const token = this.helpers.createJWTToken(loginUser);

    return reply(Formatters.loginResult({ token, loginUser })).code(200);
  })

  .catch(Errors.InvalidEmailPasswordError, () => {
    return reply(Boom.unauthorized('Invalid email or password'));
  })
  .catch(this.helpers.errorHandler.bind(this, reply));
};

exports.scope = function({ auth, policies }, reply) {
  const allowedPolicies = {};

  const role = auth.credentials.role;

  for (const resource in policies) {
    if (!allowedPolicies[resource]) {
      allowedPolicies[resource] = [];
    }

    for (const name in policies[resource]) {
      // Check first if role is denied
      if (policies[resource][name].deny.includes(role)) {
        continue;
      }

      const allowed = policies[resource][name].allow;

      if (allowed.includes('*') || allowed.includes('all') || allowed.includes('any')) {
        allowedPolicies[resource].push(name);
        continue;
      }

      if (allowed.includes(role)) {
        allowedPolicies[resource].push(name);
        continue;
      }

      if (allowed.includes('self')) {
        allowedPolicies[resource].push(`${name}:self`);
      }
    }
  }

  return reply(allowedPolicies).code(200);
};
