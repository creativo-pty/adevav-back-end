'use strict';

const Boom = require('boom');
const Joi = require('joi');

const FORBIDDEN = Boom.forbidden('You are not allowed to use this resource.');

const AuthenticationScope = Joi.object()
  .description('An object in which each key is the resource and the value is an array of permissions for that resource')
  .example({ users: ['list', 'view', 'create', 'update'], posts: ['list', 'view'] })
  .label('AuthenticationScope');

function boomError(statusCode, name, message, label) {
  return Joi.object().keys({
    statusCode: Joi.number().required().description('HTTP Status Code').example(statusCode).label('Status Code'),
    message: Joi.string().required().description('Description of the error').example(message).label('Error Message'),
    error: Joi.string().required().description('Error name').example(name).label('Error Name')
  }).label(label);
}

const policies = {};

function applyPolicies(request, reply) {
  // If route is swagger, move on
  if (request.route.realm.plugin === 'hapi-swagger') {
    return reply.continue();
  }

  const settings = request.route.settings;

  // If no credentials set and route has auth set, deny
  if (!request.auth.credentials && settings.auth) {
    return reply(FORBIDDEN);
  }

  // If no policy is set, continue
  if (!settings.plugins.policy) {
    return reply.continue();
  }

  const role = request.auth.credentials.role;

  // Get the route policies
  let allow = settings.plugins.policy.allow || [];
  let deny = settings.plugins.policy.deny || [];

  // In case allow or deny are not arrays, turn them into arrays
  if (!Array.isArray(allow)) {
    allow = [allow];
  }

  if (!Array.isArray(deny)) {
    deny = [deny];
  }

  // If allow and deny are empty, or allow includes *, all, or any (which mean allow any) then continue
  if ((!allow.length && !deny.length) || allow.includes('*') || allow.includes('all') || allow.includes('any')) {
    return reply.continue();
  }

  // If allow includes the role, continue
  if ((allow.length && allow.includes(role))) {
    return reply.continue();
  }

  // If deny does not include the role, continue
  if (deny.length && !deny.includes(role) && !allow.includes('self')) {
    return reply.continue();
  }

  // If user is owner, don't check for other allows but do check if role is denied
  if (allow.includes('self') && !deny.includes(role)) {
    request.auth.credentials.self = true;
    return reply.continue();
  }

  // Anything else means denied
  return reply(FORBIDDEN);
}

function register(route) {
  if (!route.config || !route.config.plugins || !route.config.plugins.policy) {
    return;
  }

  const { name, resource, allow, deny } = route.config.plugins.policy;

  if (!policies[resource]) {
    policies[resource] = {};
  }

  policies[resource][name] = { allow: allow || [], deny: deny || [] };

  return;
}

function isSelf() {
  return this.auth.credentials.self;
}

function forbidden() {
  return this(FORBIDDEN);
}

function authScope(request, reply) {
  try {
    const role = request.auth.credentials.role;

    const allowedPolicies = {};

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
  } catch (err) {
    this.logger.error(err.stack);
    return reply(Boom.badImplementation('An unknown error has occured. Please try again later.'));
  }
}

const Policies = {
  register: function(server, options, next) {
    server.logger.info('Registering policies...');

    server.ext('onPreHandler', applyPolicies.bind(server));
    server.decorate('request', 'isSelf', isSelf);
    server.decorate('reply', 'forbidden', forbidden);
    server.decorate('server', 'policies', { register });

    if (!options.AuthorizationSchema) {
      throw Error('The Authorization Token schema is required for swagger documentation');
    }

    // Register route for policy
    const route = {
      method: 'GET',
      path: options.authScopePath || '/auth/scope/me',
      config: {
        auth: options.auth || 'jwt',
        handler: authScope,
        description: 'List user permissions',
        notes: 'Lists all the permission the currently logged in user has in the application',
        plugins: {
          'hapi-swagger': {
            responses: {
              '200': {
                description: 'Success',
                schema: AuthenticationScope
              },
              '401': {
                description: 'Unauthorized',
                schema: boomError(401, 'Unauthorized', 'Resource needs authentication', 'AuthenticationError')
              },
              '500': {
                description: 'Internal Server Error',
                schema: boomError(500, 'Internal Server Error', 'An unknown error has occured. Please try again later.', 'InternalServerError')
              }
            }
          }
        },
        tags: ['api'],
        validate: {
          headers: options.AuthorizationSchema.unknown()
        }
      }
    };

    server.bind(server);
    server.route(route);
    server.logger.info('Policies registered!');
    return next();
  }
};

Policies.register.attributes = {
  name: 'Policies',
  version: '1.0.1'
};

module.exports = {
  register: Policies,
  options: {
    AuthorizationSchema: require('../schemas/authorizationToken')
  }
};
