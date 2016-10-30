'use strict';

module.exports = {
  up: function(action, Sequelize) {

    action.createTable('users', {
      // Basic User Properties
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      password: {
        type: Sequelize.STRING(256),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
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
        type: Sequelize.ENUM('President', 'Vice-President', 'Secretary', 'Sub-Secretary', 'Treasurer', 'Sub-Treasurer', 'Auditor', 'Vocal', 'Member'),
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
      },

      // Sequelize Properties
      createdAt: {
        type: Sequelize.DATE
      },
      updatedAt: {
        type: Sequelize.DATE
      }
    });
  },

  down: function(action, Sequelize) {

    action.dropTable('users');
  }
};
