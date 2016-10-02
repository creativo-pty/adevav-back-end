'use strict';

const errorFactory = require('error-factory');

const Errors = {
  BadRequestError: errorFactory('BadRequestError', {
    message: 'Bad Request',
    code: 'BadRequestError'
  })
};

module.exports = Errors;
