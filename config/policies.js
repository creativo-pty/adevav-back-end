'use strict';

const Boom = require('boom');

const FORBIDDEN = Boom.forbidden('You are not allowed to use this resource.');

const policies = {};

function applyPolicies({ route, auth }, reply) {
  // If route is swagger, move on
  if (route.realm.plugin === 'hapi-swagger') {
    return reply.continue();
  }

  const settings = route.settings;

  // If no credentials set and route has auth set, deny
  if (!auth.credentials && settings.auth) {
    return reply(FORBIDDEN);
  }

  // If no policy is set, continue
  if (!settings.plugins.policy) {
    return reply.continue();
  }

  const role = auth.credentials.role;

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
    auth.credentials.self = true;
    return reply.continue();
  }

  // Anything else means denied
  return reply(FORBIDDEN);
}

function register({ config }) {
  if (!config || !config.plugins || !config.plugins.policy) {
    return;
  }

  const { name, resource, allow, deny } = config.plugins.policy;

  if (!policies[resource]) {
    policies[resource] = {};
  }

  policies[resource][name] = { allow: allow || [], deny: deny || [] };

  return;
}

function isSelf() {
  return this.auth.credentials.self;
}

const Policies = {
  register: function(server, options, next) {
    server.logger.info('Registering policies...');

    server.ext('onPreHandler', applyPolicies.bind(server));
    server.decorate('request', 'isSelf', isSelf);
    server.decorate('request', 'policies', policies);
    server.decorate('server', 'policies', { register });

    server.logger.info('Policies registered!');
    return next();
  }
};

Policies.register.attributes = {
  name: 'Policies',
  version: '1.0.2'
};

module.exports = {
  register: Policies
};
