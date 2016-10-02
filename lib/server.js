'use strict';

const Hapi = require('hapi');
const Promise = require('bluebird');

const server = new Hapi.Server({
  debug: false
});

server.connection({
  port: process.env.PORT || 3001,
  routes: {
    cors: {
      origin: ['*'],
      additionalHeaders: ['Content-Type', 'Accept-Language', 'Accept-Encoding', 'Invitation', 'Reset']
    }
  }
});

// Load application plugins
const plugins = [
  require('inert'),
  require('vision'),
  require('../config/logs'),
  require('../config/swagger'),
  require('../config/database'), // Need to load db first to have it available in the decorator
  require('../config/associations'),
  require('./helpers'),
  require('../config/authentication'),
  require('../config/policies'),
  require('../config/routes')
];

function register() {
  return server.register(plugins);
}

exports.register = register;

function initialize() {
  if (server.models) {
    return Promise.resolve();
  }
  return register(plugins)
  .then(server.initialize.bind(server));
};

exports.initialize = initialize;

function start() {
  return register(plugins)
  .then(server.start.bind(server));
}

exports.start = start;

exports.info = server.info;

exports.server = server;
