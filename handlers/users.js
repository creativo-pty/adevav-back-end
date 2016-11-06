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

exports.getUser = function(request, reply) {

  const { auth, params } = request;

  return this.models.User.getUser(params.userId)
  .then((user) => {
    if (!user) {
      return reply(Boom.notFound('User not found'));
    }

    if (!user.isPublic && request.isSelf() && auth.credentials.userId !== params.userId) {
      return reply(Boom.forbidden('You are not allowed to use this resource.'));
    }

    return reply(Formatters.user(user)).code(200);
  })
  .catch(this.helpers.errorHandler.bind(this, reply));
};

exports.updateUser = function(request, reply) {

  const { auth, params, payload } = request;

  return this.models.User.getUser(params.userId)
  .then((user) => {
    if (!user) {
      throw new Errors.UserNotFoundError();
    }

    if (payload.newPassword && !user.isValidPassword(payload.password)) {
      throw new Errors.InvalidEmailPasswordError();
    }

    if (request.isSelf() && auth.credentials.userId !== params.userId) {
      throw new Errors.ForbiddenError();
    }

    return user.updateUser(payload);
  })
  .then((user) => reply(Formatters.user(user)).code(200))
  .catch(Errors.ExistingUserError, () => {
    return reply(Boom.conflict('User already exist'));
  })
  .catch(Errors.ForbiddenError, () => {
    return reply(Boom.forbidden('You are not allowed to use this resource.'));
  })
  .catch(Errors.InvalidEmailPasswordError, () => {
    return reply(Boom.unauthorized('Password provided does not match with one on record'));
  })
  .catch(Errors.UserNotFoundError, () => {
    return reply(Boom.notFound('User not found'));
  })
  .catch(this.helpers.errorHandler.bind(this, reply));
};
