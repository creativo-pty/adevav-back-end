'use strict';

const Joi = require('joi');

const Posts = require('../handlers/posts');

const { apiPrefix } = require('../config/server');
const SCHEMAS = require('../lib/schemas');

const API_BASE_PATH = apiPrefix + '/posts';

const routes = [];

// GET /posts
routes.push({
  method: 'GET',
  path: API_BASE_PATH,
  config: {
    auth: false,
    handler: Posts.listPosts,
    description: 'List posts',
    notes: 'List the posts in the system according to the parameters given',
    plugins: {
      'hapi-swagger': {
        responses: {
          '200': {
            description: 'OK',
            schema: Joi.array().items(SCHEMAS.Post).label('Posts')
          },
          '500': {
            description: 'Internal Server Error',
            schema: SCHEMAS.Errors.InternalServerError
          }
        }
      }
    },
    tags: ['api'],
    validate: {
      headers: SCHEMAS.AuthorizationToken.unknown()
    }
  }
});

// POST /posts
routes.push({
  method: 'POST',
  path: API_BASE_PATH,
  config: {
    auth: 'jwt',
    handler: Posts.createPost,
    description: 'Create a post',
    notes: 'Create a new post in the system',
    plugins: {
      'policy': {
        resource: 'posts',
        name: 'create',
        allow: ['Administrator', 'Editor', 'Author', 'Contributor']
      },
      'hapi-swagger': {
        responses: {
          '201': {
            description: 'Created',
            schema: SCHEMAS.Post
          },
          '400': {
            description: 'Bad Request',
            schema: SCHEMAS.Errors.BadRequestPostError
          },
          '401': {
            description: 'Unauthorized',
            schema: SCHEMAS.Errors.AuthenticationError
          },
          '403': {
            description: 'Forbidden',
            schema: SCHEMAS.Errors.ForbiddenError
          },
          '500': {
            description: 'Internal Server Error',
            schema: SCHEMAS.Errors.InternalServerError
          }
        }
      }
    },
    tags: ['api'],
    validate: {
      headers: SCHEMAS.AuthorizationToken.unknown(),
      payload: SCHEMAS.Post
    }
  }
});

// GET /posts/{postId}
routes.push({
  method: 'GET',
  path: API_BASE_PATH + '/{postId}',
  config: {
    auth: false,
    handler: Posts.getPost,
    description: 'Get post by ID',
    notes: 'Get a post in the system according to their ID',
    plugins: {
      'hapi-swagger': {
        responses: {
          '200': {
            description: 'OK',
            schema: SCHEMAS.Post
          },
          '400': {
            description: 'Bad Request',
            schema: SCHEMAS.Errors.BadRequestIdError
          },
          '403': {
            description: 'Forbidden',
            schema: SCHEMAS.Errors.ForbiddenError
          },
          '404': {
            description: 'Not Found',
            schema: SCHEMAS.Errors.PostNotFoundError
          },
          '500': {
            description: 'Internal Server Error',
            schema: SCHEMAS.Errors.InternalServerError
          }
        }
      }
    },
    tags: ['api'],
    validate: {
      headers: SCHEMAS.AuthorizationToken.unknown(),
      params: {
        postId: SCHEMAS.Uuid.postId
      }
    }
  }
});

// PUT /posts/{postId}
routes.push({
  method: 'PUT',
  path: API_BASE_PATH + '/{postId}',
  config: {
    auth: 'jwt',
    handler: Posts.updatePost,
    description: 'Update post by ID',
    notes: 'Update a post in the system according to their ID',
    plugins: {
      'policy': {
        resource: 'posts',
        name: 'update',
        allow: ['Administrator', 'Editor', 'self'],
        deny: 'Subscriber'
      },
      'hapi-swagger': {
        responses: {
          '201': {
            description: 'Created',
            schema: SCHEMAS.Post
          },
          '400': {
            description: 'Bad Request',
            schema: SCHEMAS.Errors.BadRequestPostError
          },
          '401': {
            description: 'Unauthorized',
            schema: SCHEMAS.Errors.AuthenticationError
          },
          '403': {
            description: 'Forbidden',
            schema: SCHEMAS.Errors.ForbiddenError
          },
          '404': {
            description: 'Not Found',
            schema: SCHEMAS.Errors.PostNotFoundError
          },
          '500': {
            description: 'Internal Server Error',
            schema: SCHEMAS.Errors.InternalServerError
          }
        }
      }
    },
    tags: ['api'],
    validate: {
      headers: SCHEMAS.AuthorizationToken.unknown(),
      params: {
        postId: SCHEMAS.Uuid.postId
      },
      payload: SCHEMAS.Post
    }
  }
});

module.exports = routes;
