'use strict';

const errorFactory = require('error-factory');

const Errors = {
  BadRequestError: errorFactory('BadRequestError', {
    message: 'Bad Request',
    code: 'BadRequestError'
  }),
  InvalidTokenError: errorFactory('InvalidTokenError', {
    message: 'Invalid Token',
    code: 'InvalidTokenError'
  })
};

module.exports = Errors;
