'use strict';

const Joi = require('joi');

const User = require('./user');

const { postId: PostID } = require('./uuid');

module.exports = Joi.object().keys({
  id: PostID.allow('').optional(),
  title: Joi.string().max(256).required()
    .description('Post\'s title')
    .example('My First Post')
    .label('Title'),
  slug: Joi.string().max(256).allow('').optional()
    .description('Post\'s slug')
    .example('my-first-post')
    .label('Slug'),
  body: Joi.string().required()
    .description('Post\'s body')
    .example('The most important sentence in any article is the first one. If it doesn’t induce the reader to proceed to the second sentence, your article is dead. And if the second sentence doesn’t induce him to continue to the third sentence, it’s equally dead. Of such a progression of sentences, each tugging the reader forward until... safely hooked, a writer constructs that fateful unit: the lead.')
    .label('Body'),
  status: Joi.string().allow('').optional()
    .allow('Draft', 'Pending Review', 'Published')
    .default('Draft')
    .description('Post\'s status')
    .example('Published')
    .label('Status'),
  visibility: Joi.string().allow('').optional()
    .allow('Administrator', 'Editor', 'Author', 'Contributor', 'Subscriber', 'Private', 'Public')
    .default('Public')
    .description('Post\'s visibility')
    .example('Private')
    .label('Visibility'),
  publishedOn: Joi.date().iso().allow('').optional()
    .description('Time when Post was Published')
    .example('2014-09-08T08:02:17-05:00')
    .label('Published On'),
  author: User.optional()
})
.label('Post');
