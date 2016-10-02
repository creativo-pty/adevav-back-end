'use strict';

const config = require('./server');
const HapiSwagger = require('hapi-swagger');
const Pack = require('../package.json');

module.exports = {
  register: HapiSwagger,
  options: {
    info: {
      title: Pack.name,
      description: Pack.description,
      version: Pack.version
    },
    documentationPage: true,
    documentationPath: '/swagger_ui',
    jsonEditor: true,
    basePath: '/',
    pathPrefixSize: 2,
    jsonPath: '/docs/swagger.json',
    sortPaths: 'path-method',
    lang: 'en',
    tags: [{name: 'api'}],
    host: `${config.devHost}:${process.env.PORT || config.defaultPort}`
  }
};
