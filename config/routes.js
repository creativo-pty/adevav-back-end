'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const Routes = {
  register: function(server, { pathToRoutes }, next) {
    fs.readdirSync(pathToRoutes).forEach((file) => {
      _.each(require(`${pathToRoutes}/${file}`), (route) => {
        server.bind(server);
        server.route(route);
      });
    });
    server.logger.info('Routes loaded!');
    next();
  }
};

Routes.register.attributes = {
  name: 'Routes',
  version: '1.3.0'
};

module.exports = {
  register: Routes,
  options: {
    pathToRoutes: path.normalize(__dirname + '/../routes')
  }
};
