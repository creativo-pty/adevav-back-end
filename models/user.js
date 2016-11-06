'use strict';

const bcrypt = require('bcryptjs');
const Sequelize = require('sequelize');

const Errors = require('../lib/errors');

module.exports = function(db) {
  const User = db.define('User', {
    // Basic User Properties
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    password: {
      type: Sequelize.STRING(256),
      allowNull: true,
      set: function(value) {
        const salt = bcrypt.genSaltSync();
        return this.setDataValue('password', bcrypt.hashSync(value, salt));
      }
    },
    email: {
      type: Sequelize.STRING(256),
      unique: true,
      allowNull: false
    },
    firstName: {
      type: Sequelize.STRING(32),
      allowNull: true
    },
    lastName: {
      type: Sequelize.STRING(32),
      allowNull: true
    },
    avatar: {
      type: Sequelize.STRING,
      allowNull: true
    },
    role: {
      type: Sequelize.ENUM('Administrator', 'Editor', 'Author', 'Contributor', 'Subscriber'),
      allowNull: false,
      defaultValue: 'Subscriber'
    },

    // ADEVAV Associate Properties
    isAssociate: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    position: {
      type: Sequelize.ENUM('President', 'Vice-President', 'Secretary', 'Sub-Secretary', 'Treasurer', 'Sub-Treasurer', 'Auditor', 'Vocal', 'Member', ''),
      allowNull: true
    },
    biography: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    isPublic: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    classMethods: {
      listUsers: function(opts) {
        const options = {
          order: [['email', 'ASC']],
          where: {}
        };

        if (opts.onlyViewPublic) {
          options.where.isPublic = true;
        }

        if (opts.selfId) {
          options.where.id = opts.selfId;
        }

        return this.findAll(options);
      },

      createUser: function(userData) {
        delete userData.id;
        delete userData.avatar;

        return this.create(userData)
        .catch((err) => {
          if (err.name === 'SequelizeUniqueConstraintError') {
            throw new Errors.ExistingUserError();
          }
          throw err;
        });
      },

      getUser: function(userId) {
        return this.findById(userId);
      },

      getUserByEmail: function(email) {
        return this.findOne({
          where: { email }
        });
      }
    },

    instanceMethods: {
      isAdministrator: function() {
        return this.role === 'Administrator';
      },

      isValidPassword: function(password) {
        return this.password && bcrypt.compareSync(password, this.password);
      },

      updateUser: function(userData) {
        if (userData.newPassword) {
          this.password = userData.newPassword;
        }

        this.email = userData.email;
        this.firstName = userData.firstName;
        this.lastName = userData.lastName;
        this.role = userData.role;
        this.isAssociate = userData.isAssociate;
        this.position = userData.position;
        this.biography = userData.biography;
        this.isPublic = userData.isPublic;

        return this.save()
        .catch((err) => {
          if (err.name === 'SequelizeUniqueConstraintError') {
            throw new Errors.ExistingUserError();
          }
          throw err;
        });
      }
    },

    tableName: 'users'
  });

  return User;
};
