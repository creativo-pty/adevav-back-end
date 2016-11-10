'use strict';

const Boom = require('boom');

const Errors = require('../lib/errors');
const Formatters = require('../lib/formatters');

exports.listPosts = function({ headers }, reply) {

  return this.helpers.extractTokenFromHeaders(headers)
  .then(({ sub }) => this.models.User.getUser(sub))

  .then((user) => this.models.Post.listPosts({ user }))

  .then((posts) => {
    return reply(Formatters.posts(posts)).code(200);
  })

  .catch(this.helpers.errorHandler.bind(this, reply));
};

exports.createPost = function({ auth, payload }, reply) {

  return this.models.User.getUser(auth.credentials.userId)
  .then((user) => {
    if (!user) {
      throw new Errors.ForbiddenError();
    }

    const isPublished = payload.status === 'Published';
    const cannotPublish = user.role === 'Contributor';

    if (isPublished && cannotPublish) {
      throw new Errors.BadRequestError();
    }

    payload.authorId = user.id;

    return this.models.Post.createPost(payload);
  })
  .then((post) => {
    return reply(Formatters.post(post)).code(201);
  })

  .catch(Errors.BadRequestError, () => {
    return reply(Boom.badRequest('You are not allowed to publish posts'));
  })
  .catch(Errors.ForbiddenError, () => {
    return reply(Boom.forbidden('You are not allowed to use this resource.'));
  })
  .catch(this.helpers.errorHandler.bind(this, reply));
};
