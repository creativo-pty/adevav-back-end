'use strict';

const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const Sequelize = require('sequelize');

let sequelize;
let thePath;

function loadModels() {
  fs.readdirSync(thePath).forEach((file) => {
    require(`${thePath}/${file}`)(sequelize);
  });
}

function initializeDB(server) {
  loadModels();
  return new Promise((resolve, reject) => {
    let tryCount = 0;

    function syncDB(err) {
      tryCount++;

      if (tryCount > 10) {
        server.logger.error('Could not initialize database connection. Exitting now: ' + err.stack);
        return process.exit(1);
      }

      sequelize.sync()
      .then((db) => {
        return resolve(db.models);
      }).catch((err) => {
        server.logger.error(err);
        server.logger.error('DB connection failed. Retrying in 10 seconds...');
        return setTimeout(syncDB.bind(this, err), 10000);
      });
    }

    return syncDB();
  });
}

const Database = {
  register: function(server, { config, pathToModels }, next) {

    sequelize = new Sequelize(config.database, config.username, config.password, Object.assign({}, config, {
      dialectOptions: {
        connectTimeout: 20000
      },
      logging: false
    }));

    thePath = pathToModels;

    server.logger.info('Syncing models...');
    initializeDB(server)
    .then((models) => {
      server.logger.info('Syncing done!');
      server.decorate('server', 'models', models);
      return next();
    })
    .catch(next);
  },

  loadDb: initializeDB
};

const config = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: `${process.env.DB_NAME}${process.env.NODE_ENV === 'test' ? '_test' : ''}`,
  host: process.env.DB_HOST || 'mysql',
  dialect: process.env.DB_DIALECT || 'mysql'
};

Database.register.attributes = {
  name: 'Database',
  version: '1.0.0'
};

module.exports = {
  register: Database,
  options: {
    config,
    pathToModels: path.normalize(__dirname + '/../models')
  }
};
