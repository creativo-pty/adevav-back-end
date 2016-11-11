'use strict';

const Boom = require('boom');
const Promise = require('bluebird');

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

exports.getPost = function({ headers, params }, reply) {

  return this.helpers.extractTokenFromHeaders(headers)
  .then(({ sub }) => Promise.props({
    post: this.models.Post.getPost(params.postId),
    user: this.models.User.getUser(sub)
  }))
  .then(({ post, user }) => {
    if (!post) {
      return reply(Boom.notFound('Post not found'));
    }

    if (!allowedToView(user, post)) {
      return reply(Boom.forbidden('You are not allowed to use this resource.'));
    }

    return reply(Formatters.post(post)).code(200);
  })
  .catch(this.helpers.errorHandler.bind(this, reply));
};

function allowedToView(user, post) {
  if (!user) {
    return post.visibility === 'Public';
  }

  const priviledges = {
    Public: 0,
    Subscriber: 1,
    Contributor: 2,
    Author: 3,
    Editor: 4,
    Administrator: 5,
    Private: 6
  };

  return (post.authorId === user.id) || (priviledges[user.role] >= priviledges[post.visibility]);
}
