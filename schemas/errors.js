'use strict';

const Joi = require('joi');

const Errors = {};

function boomError(statusCode, name, message, label) {
  return Joi.object().keys({
    statusCode: Joi.number().required()
      .description('HTTP Status Code')
      .example(statusCode)
      .label('Status Code'),
    message: Joi.string().required()
      .description('Description of the error')
      .example(message)
      .label('Error Message'),
    error: Joi.string().required()
      .description('Error name')
      .example(name)
      .label('Error Name')
  }).label(label);
}

// Application Errors
Errors.InternalServerError = boomError(500, 'Internal Server Error', 'An uknown error has occured. Please try again later.', 'InternalServerError');

module.exports = Errors;
