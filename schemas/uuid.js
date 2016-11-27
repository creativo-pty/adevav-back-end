'use strict';

const _ = require('lodash');
const Joi = require('joi');
const uuid = require('uuid');

function uuidSchemaGenerator(objectName) {
  const name = _.startCase(objectName);
  return Joi.string().guid().required()
    .description(`The ${name}\'s ID`)
    .example(uuid.v4())
    .label(`${name} ID`);
}

function uuidSchemasGenerator(objectNames) {
  const schemas = {};

  objectNames.forEach((name) => {
    schemas[`${name}Id`] = uuidSchemaGenerator(name);
  });

  return schemas;
}

module.exports = uuidSchemasGenerator([
  'user'
]);
