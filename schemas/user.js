'use strict';

const Joi = require('joi');

const { userId: UserID } = require('./uuid');

module.exports = Joi.object().keys({

  // Basic User Properties
  id: UserID.allow('').optional(),
  password: Joi.string().max(256).allow('').optional()
    .description('User\'s current password')
    .example('john@doe123')
    .label('Password'),
  newPassword: Joi.string().max(256).allow('').optional()
    .description('User\'s new password')
    .example('aNEWjohn@doe123')
    .label('New Password'),
  email: Joi.string().email().max(256).required()
    .description('User\'s email address')
    .example('john.doe@example.com')
    .label('Email Address'),
  firstName: Joi.string().max(32).allow('').optional()
    .description('User\'s first name')
    .example('John')
    .label('First Name'),
  lastName: Joi.string().max(32).allow('').optional()
    .description('User\'s last name')
    .example('Doe')
    .label('Last Name'),
  avatar: Joi.string().allow('').optional()
    .description('User\'s Avatar URL')
    .example('/avatars/c4928a13-8632-42f1-94e8-a6ed26342526')
    .label('Avatar URL'),
  role: Joi.string().required()
    .allow('Administrator', 'Editor', 'Author', 'Contributor', 'Subscriber')
    .default('Subscriber')
    .description('User\'s role')
    .example('Subscriber')
    .label('Role'),

  // ADEVAV Associate Properties
  isAssociate: Joi.boolean().default(false).optional()
    .description('Whether this user is an associate')
    .example(true)
    .label('Is Associate'),
  position: Joi.string().allow('').optional()
    .allow('President', 'Vice-President', 'Secretary', 'Sub-Secretary', 'Treasurer', 'Sub-Treasurer', 'Auditor', 'Vocal', 'Member')
    .default('')
    .description('Associate\'s position')
    .example('Member')
    .label('Position'),
  biography: Joi.string().allow('').optional()
    .description('Associate\'s biography')
    .example('John Doe moved to East Boston from St. Thomas, USVI. He studied engineering and business at the New York Maritime College and proceeded to work in a fast, upscale environment, assuring client delight on luxury super yachts. Passionate about the water, the move to Eastie was a natural fit. With encouragement from friends and neighbors, John started the East Boston Real Estate Company in 2011. In his free time, John loves to go sailing with his girlfriend Jane. He also runs a local musicians studio, and loves promoting live music events. Grateful for an amazing group of neighborhood friends, John makes sure that new residents are welcomed in a way that has become customary in East Boston.')
    .label('Biography'),
  isPublic: Joi.boolean().default(false).optional()
    .description('Whether this associate has a public profile')
    .example(true)
    .label('Is Public')
})
.label('User');
