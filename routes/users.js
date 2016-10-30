'use strict';

const Joi = require('joi');

const Users = require('../handlers/users');

const { apiPrefix } = require('../config/server');
const SCHEMAS = require('../lib/schemas');

const API_BASE_PATH = apiPrefix + '/users';

const routes = [];

// GET /users
routes.push({
  method: 'GET',
  path: API_BASE_PATH,
  config: {
    auth: false,
    handler: Users.listUsers,
    description: 'List users',
    notes: 'List the users in the system according to the parameters given',
    plugins: {
      'hapi-swagger': {
        responses: {
          '200': {
            description: 'OK',
            schema: Joi.array().items(SCHEMAS.User).label('Users')
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

// POST /users
routes.push({
  method: 'POST',
  path: API_BASE_PATH,
  config: {
    auth: 'jwt',
    handler: Users.createUser,
    description: 'Create a user',
    notes: 'Create a new user in the system',
    plugins: {
      'policy': {
        resource: 'users',
        name: 'create',
        allow: 'Administrator'
      },
      'hapi-swagger': {
        responses: {
          '201': {
            description: 'Created',
            schema: SCHEMAS.User
          },
          '400': {
            description: 'Bad Request',
            schema: SCHEMAS.Errors.BadRequestUserError
          },
          '401': {
            description: 'Unauthorized',
            schema: SCHEMAS.Errors.AuthenticationError
          },
          '403': {
            description: 'Forbidden',
            schema: SCHEMAS.Errors.ForbiddenError
          },
          '409': {
            description: 'Existing User',
            schema: SCHEMAS.Errors.ExistingUserError
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
      payload: SCHEMAS.User
    }
  }
});

module.exports = routes;
