'use strict';

const Joi = require('joi');

module.exports = Joi.object()
  .description('An object in which each key is the resource and the value is an array of permissions for that resource')
  .example({ users: ['list', 'view', 'create', 'update'], posts: ['list', 'view'] })
  .label('Authentication Scope');
