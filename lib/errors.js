'use strict';

const errorFactory = require('error-factory');

const Errors = {
  BadRequestError: errorFactory('BadRequestError', {
    message: 'Bad Request',
    code: 'BadRequestError'
  }),
  ExistingUserError: errorFactory('ExistingUserError', {
    message: 'User already exist',
    code: 'ExistingUserError'
  }),
  ForbiddenError: errorFactory('ForbiddenError', {
    // TODO: When Boom issue is fixed, remove all periods from errors
    message: 'You are not allowed to use this resource.',
    code: 'ForbiddenError'
  }),
  InvalidEmailPasswordError: errorFactory('InvalidEmailPasswordError', {
    message: 'Invalid email or password',
    code: 'InvalidEmailPasswordError'
  }),
  PostNotFoundError: errorFactory('PostNotFoundError', {
    message: 'Post not found',
    code: 'PostNotFoundError'
  }),
  UserNotFoundError: errorFactory('UserNotFoundError', {
    message: 'User not found',
    code: 'UserNotFoundError'
  })
};

module.exports = Errors;
