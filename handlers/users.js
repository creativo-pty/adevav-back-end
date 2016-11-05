'use strict';

const Boom = require('boom');

const Errors = require('../lib/errors');
const Formatters = require('../lib/formatters');

exports.listUsers = function({ headers }, reply) {

  let authParts = [];

  if (headers.authorization) {
    authParts = headers.authorization.split(' ');
  }

  const token = (authParts.length === 2) ? authParts[1] : '';

  return this.helpers.verifyJWT(token)
  .then(({ sub }) => this.models.User.getUser(sub))

  .then((user) => {
    const options = {};

    if (!user) {
      options.onlyViewPublic = true;
    } else if (!user.isAdministrator()) {
      options.selfId = user.id;
    }

    return this.models.User.listUsers(options);
  })

  .then((users) => {
    return reply(Formatters.users(users)).code(200);
  })

  .catch(this.helpers.errorHandler.bind(this, reply));
};

exports.createUser = function({ payload }, reply) {

  return this.models.User.createUser(payload)
  .then((user) => {
    return reply(Formatters.user(user)).code(201);
  })

  .catch(Errors.ExistingUserError, () => {
    return reply(Boom.conflict('User already exist'));
  })
  .catch(this.helpers.errorHandler.bind(this, reply));
};
