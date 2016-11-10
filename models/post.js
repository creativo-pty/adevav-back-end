'use strict';

const _ = require('lodash');
const moment = require('moment');
const Promise = require('bluebird');
const Sequelize = require('sequelize');

module.exports = function(db) {
  const Post = db.define('Post', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
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
      allowNull: false,
      defaultValue: 'Draft'
    },
    visibility: {
      type: Sequelize.ENUM('Administrator', 'Editor', 'Author', 'Contributor', 'Subscriber', 'Private', 'Public'),
      allowNull: false,
      defaultValue: 'Public'
    },
    publishedOn: {
      type: Sequelize.DATE,
      allowNull: true
    }
  }, {
    classMethods: {
      listPosts: function(opts) {
        const options = {
          include: [{
            model: this.sequelize.models.User,
            as: 'author'
          }],
          order: [['slug', 'ASC']],
          where: {
            visibility: {
              $in: ['Public']
            }
          }
        };

        if (opts.user) {
          switch (opts.user.role) {
            case 'Administrator':
              options.where.visibility.$in.push('Administrator');
            case 'Editor':
              options.where.visibility.$in.push('Editor');
            case 'Author':
              options.where.visibility.$in.push('Author');
            case 'Contributor':
              options.where.visibility.$in.push('Contributor');
            case 'Subscriber':
              options.where.visibility.$in.push('Subscriber');
          }
        } else {
          options.where.status = 'Published';
        }

        return Promise.props({
          main: this.findAll(options),
          own: (opts.user) ? this.listPrivatePostsByAuthor(opts.user) : Promise.resolve(null)
        })
        .then(({ main, own }) => {
          if (own && own.length) {
            return _.sortBy(main.concat(own), ['slug']);
          }
          return main;
        });
      },

      listPostsBySlug: function(slug) {
        return this.findAll({
          where: {
            slug: { $like: `${slug}%` }
          }
        });
      },

      listPrivatePostsByAuthor: function(author) {
        const options = {
          include: [{
            model: this.sequelize.models.User,
            as: 'author',
            where: { id: author.id }
          }],
          order: [['slug', 'ASC']],
          where: {
            visibility: 'Private'
          }
        };

        return this.findAll(options);
      },

      createPost: function(postData) {
        delete postData.id;

        if (!postData.slug) {
          postData.slug = _.kebabCase(postData.title);
        }

        if (postData.status === 'Published') {
          postData.publishedOn = moment().format();
        } else {
          delete postData.publishedOn;
        }

        return this.listPostsBySlug(postData.slug)
        .then((posts) => {
          if (posts.length) {
            postData.slug += '-' + posts.length;
          }

          return this.create(postData);
        })
        .then((post) => post.reload({
          include: [{
            model: this.sequelize.models.User,
            as: 'author'
          }]
        }));
      },

      getPost: function(postId) {
        return this.findById(postId);
      }
    },

    tableName: 'posts'
  });

  return Post;
};

module.exports.register = function({ Post, User }) {
  Post.belongsTo(User, {
    as: 'author',
    foreignKey: 'authorId'
  });
};
