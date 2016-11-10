'use strict';

module.exports = {
  up: function(action, Sequelize) {

    return action.createTable('posts', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true
      },
      authorId: {
        type: Sequelize.UUID,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(256),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(256),
        unique: true,
        allowNull: false
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('Draft', 'Pending Review', 'Published'),
        allowNull: false
      },
      visibility: {
        type: Sequelize.ENUM('Administrator', 'Editor', 'Author', 'Contributor', 'Subscriber', 'Private', 'Public'),
        allowNull: false
      },
      publishedOn: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE
      },
      updatedAt: {
        type: Sequelize.DATE
      }
    })
    .then(() => action.addIndex('posts', ['authorId'], { indexName: 'authorId' }));
  },

  down: function(action) {

    return action.removeIndex('posts', 'authorId')
    .then(() => action.dropTable('posts'));
  }
};
