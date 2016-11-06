'use strict';

require('../testHelpers');

const Promise = require('bluebird');
// Remove unhandled promise errors from bluebird
Promise.onPossiblyUnhandledRejection(() => {});

const UserFixture = require('../fixtures/user');

let User;

exports.lab = Lab.script();

const server = Server.server;

describe('User resources', () => {
  let validTokens = [];

  before((done) => {
    Server.initialize()
    .then(() => {
      User = server.models.User;

      return logIn();
    })

    .then((tokens) => {
      validTokens = tokens;
      return done();
    })

    .catch(done);
  });

  describe('GET /users', () => {
    let adminUserInstance;
    let publicUserInstance;
    let userInstance;

    const instances = [];

    function callServer(token, test) {
      return server.inject({
        method: 'GET',
        url: '/users',
        headers: {
          Authorization: token
        }
      }, test);
    }

    before((done) => {
      const sampleAdminUser = {
        email: 'admin.user@example.com',
        role: 'Administrator',
        isAssociate: false
      };
      const samplePublicUser = {
        email: 'public.associate@example.com',
        role: 'Editor',
        isAssociate: true,
        position: 'Secretary',
        isPublic: true
      };
      const sampleUser = {
        email: 'regular.member@example.com',
        role: 'Subscriber',
        isAssociate: false
      };

      Promise.props({
        admin: User.createUser(sampleAdminUser),
        associate: User.createUser(samplePublicUser),
        user: User.createUser(sampleUser)
      })
      .then(({ admin, associate, user }) => {
        adminUserInstance = admin;
        publicUserInstance = associate;
        userInstance = user;
        instances.push(admin, associate, user);

        return done();
      })

      .catch(done);
    });

    after((done) => {
      destroyAll(instances)
      .then(() => done())
      .catch(done);
    });

    describe('success', () => {

      it('should return a list of Users when this endpoint is used correctly', (done) => {
        const token = createToken({ sub: userInstance.id });

        return callServer(token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: userInstance.id,
            firstName: '',
            lastName: '',
            avatar: '',
            role: 'Subscriber',
            isAssociate: false
          }]);

          return done();
        });
      });

      it('should return a list of public Associates if there is no token', (done) => {
        return callServer(null, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: publicUserInstance.id,
            firstName: '',
            lastName: '',
            avatar: '',
            role: 'Editor',
            isAssociate: true,
            position: 'Secretary',
            biography: '',
            isPublic: true
          }]);

          return done();
        });
      });

      it('should return a list of only the User accessing this endpoint if the User is not an Administrator', (done) => {
        const token = createToken({ sub: userInstance.id });

        return callServer(token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: userInstance.id,
            firstName: '',
            lastName: '',
            avatar: '',
            role: 'Subscriber',
            isAssociate: false
          }]);

          return done();
        });
      });

      it('should return a list of all Users if the User is an Administrator', (done) => {
        const token = createToken({ sub: adminUserInstance.id });

        return callServer(token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: adminUserInstance.id,
            firstName: '',
            lastName: '',
            avatar: '',
            role: 'Administrator',
            isAssociate: false
          }, {
            id: publicUserInstance.id,
            firstName: '',
            lastName: '',
            avatar: '',
            role: 'Editor',
            isAssociate: true,
            position: 'Secretary',
            biography: '',
            isPublic: true
          }, {
            id: userInstance.id,
            firstName: '',
            lastName: '',
            avatar: '',
            role: 'Subscriber',
            isAssociate: false
          }]);

          return done();
        });
      });
    });

    it('should return a 500 Internal Server Error if an unhandled error occurs', (done) => {
      sinon.stub(User, 'listUsers').returns(Promise.reject('Error in GET /users'));

      return callServer(validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(500);
        expect(statusMessage).to.equal('Internal Server Error');
        expect(result).to.equal({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        });

        User.listUsers.restore();
        return done();
      });
    });
  });

  describe('POST /users', () => {

    const validPayload = Object.assign({}, UserFixture, {
      email: 'john.doe@example.com'
    });

    function callServer(payload, token, test) {
      return server.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: {
          Authorization: token
        }
      }, test);
    }

    it('should return a newly created User when this endpoint is used correctly', (done) => {
      return callServer(validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(201);
        expect(statusMessage).to.equal('Created');
        expect(result).to.equal({
          id: result.id,
          firstName: 'John',
          lastName: 'Doe',
          avatar: '',
          role: 'Subscriber',
          isAssociate: true,
          position: 'Member',
          biography: 'John Doe moved to East Boston from St. Thomas, USVI. He studied engineering and business at the New York Maritime College and proceeded to work in a fast, upscale environment, assuring client delight on luxury super yachts. Passionate about the water, the move to Eastie was a natural fit. With encouragement from friends and neighbors, John started the East Boston Real Estate Company in 2011. In his free time, John loves to go sailing with his girlfriend Jane. He also runs a local musicians studio, and loves promoting live music events. Grateful for an amazing group of neighborhood friends, John makes sure that new residents are welcomed in a way that has become customary in East Boston.',
          isPublic: true
        });

        return User.getUser(result.id)
        .then((user) => destroyAll([user]))
        .then(() => done())
        .catch(done);
      });
    });

    describe('bad request', () => {

      it('should return a 400 Bad Request if the payload is missing', (done) => {
        return callServer(null, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: '"User" must be an object',
            validation: {
              source: 'payload',
              keys: ['User']
            }
          });
          return done();
        });
      });

      it('should return a 400 Bad Request if the email address is missing from the payload', (done) => {
        const invalidPayload = Object.assign({}, validPayload);
        delete invalidPayload.email;

        return callServer(invalidPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "Email Address" fails because ["Email Address" is required]',
            validation: {
              source: 'payload',
              keys: ['email']
            }
          });
          return done();
        });
      });

      it('should return a 400 Bad Request if the role is missing from the payload', (done) => {
        const invalidPayload = Object.assign({}, validPayload);
        delete invalidPayload.role;

        return callServer(invalidPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "Role" fails because ["Role" is required]',
            validation: {
              source: 'payload',
              keys: ['role']
            }
          });
          return done();
        });
      });
    });

    describe('user authorization', () => {

      it('should return a 201 Created if the User is an Administrator', (done) => {
        return callServer(validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: result.id,
            firstName: 'John',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: true,
            position: 'Member',
            biography: 'John Doe moved to East Boston from St. Thomas, USVI. He studied engineering and business at the New York Maritime College and proceeded to work in a fast, upscale environment, assuring client delight on luxury super yachts. Passionate about the water, the move to Eastie was a natural fit. With encouragement from friends and neighbors, John started the East Boston Real Estate Company in 2011. In his free time, John loves to go sailing with his girlfriend Jane. He also runs a local musicians studio, and loves promoting live music events. Grateful for an amazing group of neighborhood friends, John makes sure that new residents are welcomed in a way that has become customary in East Boston.',
            isPublic: true
          });

          return User.getUser(result.id)
          .then((user) => destroyAll([user]))
          .then(() => done())
          .catch(done);
        });
      });

      it('should return a 401 Unauthorized if the token is missing', (done) => {
        return callServer(validPayload, null, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(401);
          expect(statusMessage).to.equal('Unauthorized');
          expect(result).to.equal({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Missing authentication'
          });
          return done();
        });
      });

      it('should return a 401 Unauthorized if the token is invalid', (done) => {
        return callServer(validPayload, invalidToken(), ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(401);
          expect(statusMessage).to.equal('Unauthorized');
          expect(result).to.equal({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid credentials',
            attributes: {
              error: 'Invalid credentials'
            }
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Subscriber', (done) => {
        return callServer(validPayload, validTokens['Subscriber'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Contributor', (done) => {
        return callServer(validPayload, validTokens['Contributor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Author', (done) => {
        return callServer(validPayload, validTokens['Author'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Editor', (done) => {
        return callServer(validPayload, validTokens['Editor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });
    });

    it('should return a 409 Conflict if a User with the same email address exists', (done) => {
      User.createUser(validPayload)
      .then((user) => {
        const invalidPayload = Object.assign({}, validPayload, {
          email: 'john.doe@example.com'
        });

        return callServer(invalidPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(409);
          expect(statusMessage).to.equal('Conflict');
          expect(result).to.equal({
            statusCode: 409,
            error: 'Conflict',
            message: 'User already exist'
          });

          return destroyAll([user])
          .then(() => done())
          .catch(done);
        });
      });
    });

    it('should return a 500 Internal Server Error if an unhandled error occurs', (done) => {
      sinon.stub(User, 'create').returns(Promise.reject('Error in POST /users'));

      return callServer(validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(500);
        expect(statusMessage).to.equal('Internal Server Error');
        expect(result).to.equal({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        });

        User.create.restore();
        return done();
      });
    });
  });

  describe('GET /users/{userId}', () => {
    let userInstance;
    let publicUserInstance;

    const instances = [];

    function callServer(id, token, test) {
      return server.inject({
        method: 'GET',
        url: `/users/${id}`,
        headers: {
          'Authorization': token
        }
      }, test);
    }

    before((done) => {
      const sampleUser = Object.assign({}, UserFixture, {
        role: 'Subscriber',
        isAssociate: true,
        position: 'Member',
        isPublic: false
      });
      const samplePublicUser = Object.assign({}, UserFixture, {
        email: 'public@example.com',
        role: 'Subscriber',
        isAssociate: true,
        position: 'Member',
        isPublic: true
      });

      Promise.props({
        user: User.createUser(sampleUser),
        publicUser: User.createUser(samplePublicUser)
      })
      .then(({ user, publicUser }) => {
        userInstance = user;
        publicUserInstance = publicUser;
        instances.push(user, publicUser);
        return done();
      })
      .catch(done);
    });

    after((done) => {
      destroyAll(instances)
      .then(() => done())
      .catch(done);
    });

    describe('success', () => {

      it('should return the User when this endpoint is used correctly', (done) => {
        return callServer(userInstance.id, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: userInstance.id,
            firstName: 'John',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: true,
            position: 'Member',
            biography: 'John Doe moved to East Boston from St. Thomas, USVI. He studied engineering and business at the New York Maritime College and proceeded to work in a fast, upscale environment, assuring client delight on luxury super yachts. Passionate about the water, the move to Eastie was a natural fit. With encouragement from friends and neighbors, John started the East Boston Real Estate Company in 2011. In his free time, John loves to go sailing with his girlfriend Jane. He also runs a local musicians studio, and loves promoting live music events. Grateful for an amazing group of neighborhood friends, John makes sure that new residents are welcomed in a way that has become customary in East Boston.',
            isPublic: false
          });

          return done();
        });
      });

      it('should return the User if the token belong to an Administrator', (done) => {
        return callServer(userInstance.id, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: userInstance.id,
            firstName: 'John',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: true,
            position: 'Member',
            biography: 'John Doe moved to East Boston from St. Thomas, USVI. He studied engineering and business at the New York Maritime College and proceeded to work in a fast, upscale environment, assuring client delight on luxury super yachts. Passionate about the water, the move to Eastie was a natural fit. With encouragement from friends and neighbors, John started the East Boston Real Estate Company in 2011. In his free time, John loves to go sailing with his girlfriend Jane. He also runs a local musicians studio, and loves promoting live music events. Grateful for an amazing group of neighborhood friends, John makes sure that new residents are welcomed in a way that has become customary in East Boston.',
            isPublic: false
          });

          return done();
        });
      });

      it('should return the User if the User is public even when the token does not belong to an Administrator', (done) => {
        return callServer(publicUserInstance.id, validTokens['Subscriber'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicUserInstance.id,
            firstName: 'John',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: true,
            position: 'Member',
            biography: 'John Doe moved to East Boston from St. Thomas, USVI. He studied engineering and business at the New York Maritime College and proceeded to work in a fast, upscale environment, assuring client delight on luxury super yachts. Passionate about the water, the move to Eastie was a natural fit. With encouragement from friends and neighbors, John started the East Boston Real Estate Company in 2011. In his free time, John loves to go sailing with his girlfriend Jane. He also runs a local musicians studio, and loves promoting live music events. Grateful for an amazing group of neighborhood friends, John makes sure that new residents are welcomed in a way that has become customary in East Boston.',
            isPublic: true
          });

          return done();
        });
      });

      it('should return the User if the token does not belong to an Administrator but does belongs to the token\'s User', (done) => {
        const token = createToken({
          sub: userInstance.id,
          role: 'Subscriber'
        });

        return callServer(userInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: userInstance.id,
            firstName: 'John',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: true,
            position: 'Member',
            biography: 'John Doe moved to East Boston from St. Thomas, USVI. He studied engineering and business at the New York Maritime College and proceeded to work in a fast, upscale environment, assuring client delight on luxury super yachts. Passionate about the water, the move to Eastie was a natural fit. With encouragement from friends and neighbors, John started the East Boston Real Estate Company in 2011. In his free time, John loves to go sailing with his girlfriend Jane. He also runs a local musicians studio, and loves promoting live music events. Grateful for an amazing group of neighborhood friends, John makes sure that new residents are welcomed in a way that has become customary in East Boston.',
            isPublic: false
          });

          return done();
        });
      });
    });

    describe('bad request', () => {

      it('should return a 400 Bad Request if the ID provided is not a GUID', (done) => {
        return callServer('not.a.uuid', validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "User ID" fails because ["User ID" must be a valid GUID]',
            validation: {
              source: 'params',
              keys: ['userId']
            }
          });

          return done();
        });
      });
    });

    describe('user authorization', () => {

      it('should return a 201 Created if the User is an Administrator', (done) => {
        return callServer(userInstance.id, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: userInstance.id,
            firstName: 'John',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: true,
            position: 'Member',
            biography: 'John Doe moved to East Boston from St. Thomas, USVI. He studied engineering and business at the New York Maritime College and proceeded to work in a fast, upscale environment, assuring client delight on luxury super yachts. Passionate about the water, the move to Eastie was a natural fit. With encouragement from friends and neighbors, John started the East Boston Real Estate Company in 2011. In his free time, John loves to go sailing with his girlfriend Jane. He also runs a local musicians studio, and loves promoting live music events. Grateful for an amazing group of neighborhood friends, John makes sure that new residents are welcomed in a way that has become customary in East Boston.',
            isPublic: false
          });

          return done();
        });
      });

      it('should return a 401 Unauthorized if the token is missing', (done) => {
        return callServer(userInstance.id, null, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(401);
          expect(statusMessage).to.equal('Unauthorized');
          expect(result).to.equal({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Missing authentication'
          });
          return done();
        });
      });

      it('should return a 401 Unauthorized if the token is invalid', (done) => {
        return callServer(userInstance.id, invalidToken(), ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(401);
          expect(statusMessage).to.equal('Unauthorized');
          expect(result).to.equal({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid credentials',
            attributes: {
              error: 'Invalid credentials'
            }
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Subscriber, the token belongs to another User, and the User is not public', (done) => {
        return callServer(userInstance.id, validTokens['Subscriber'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Contributor, the token belongs to another User, and the User is not public', (done) => {
        return callServer(userInstance.id, validTokens['Contributor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Author, the token belongs to another User, and the User is not public', (done) => {
        return callServer(userInstance.id, validTokens['Author'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Editor, the token belongs to another User, and the User is not public', (done) => {
        return callServer(userInstance.id, validTokens['Editor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });
    });

    it('should return a 404 Not Found if the user was not found', (done) => {
      return callServer('a8a05442-9ecd-4201-8183-b6730c086359', validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(404);
        expect(statusMessage).to.equal('Not Found');
        expect(result).to.equal({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found'
        });

        return done();
      });
    });

    it('should return a 500 Internal Server Error if an unhandled error occurs', (done) => {
      sinon.stub(User, 'getUser').returns(Promise.reject('Error in GET /users/{userId}'));

      return callServer(userInstance.id, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(500);
        expect(statusMessage).to.equal('Internal Server Error');
        expect(result).to.equal({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        });

        User.getUser.restore();
        return done();
      });
    });
  });

  describe('PUT /users/{userId}', () => {
    let userInstance;

    const instances = [];
    const sampleUser = Object.assign({}, UserFixture, {
      password: 'password',
      newPassword: '',
      role: 'Subscriber'
    });
    const validPayload = {
      email: 'jane.doe@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'Subscriber',
      isAssociate: false,
      position: '',
      biography: '',
      isPublic: false
    };

    function callServer(id, payload, token, test) {
      return server.inject({
        method: 'PUT',
        url: `/users/${id}`,
        payload,
        headers: {
          'Authorization': token
        }
      }, test);
    }

    before((done) => {
      User.createUser(sampleUser)
      .then((user) => {
        userInstance = user;
        instances.push(user);
        return done();
      })
      .catch(done);
    });

    after((done) => {
      destroyAll(instances)
      .then(() => done())
      .catch(done);
    });

    describe('success', () => {

      it('should return the updated User when this endpoint is used correctly', (done) => {
        return callServer(userInstance.id, validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: userInstance.id,
            firstName: 'Jane',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: false
          });

          return userInstance.updateUser(sampleUser)
          .then(() => done())
          .catch(done);
        });
      });

      it('should update the User if the token belongs to an Administrator', (done) => {
        return callServer(userInstance.id, validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: userInstance.id,
            firstName: 'Jane',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: false
          });

          return userInstance.updateUser(sampleUser)
          .then(() => done())
          .catch(done);
        });
      });

      it('should update the User if the token belongs to this User', (done) => {
        const token = createToken({
          sub: userInstance.id,
          role: 'Subscriber'
        });

        return callServer(userInstance.id, validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: userInstance.id,
            firstName: 'Jane',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: false
          });

          return userInstance.updateUser(sampleUser)
          .then(() => done())
          .catch(done);
        });
      });

      it('should update the User\'s password if the password provided ', (done) => {
        const payload = Object.assign({}, validPayload, {
          password: 'password',
          newPassword: 'newPassword'
        });

        return callServer(userInstance.id, payload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: userInstance.id,
            firstName: 'Jane',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: false
          });

          return userInstance.updateUser(sampleUser)
          .then(() => done())
          .catch(done);
        });
      });
    });

    describe('bad request', () => {

      it('should return a 400 Bad Request if the ID provided is not a GUID', (done) => {
        return callServer('not.a.uuid', validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "User ID" fails because ["User ID" must be a valid GUID]',
            validation: {
              source: 'params',
              keys: ['userId']
            }
          });

          return done();
        });
      });

      it('should return a 400 Bad Request if the payload is missing', (done) => {
        return callServer(userInstance.id, null, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: '"User" must be an object',
            validation: {
              source: 'payload',
              keys: ['User']
            }
          });
          return done();
        });
      });

      it('should return a 400 Bad Request if the email address is missing from the payload', (done) => {
        const invalidPayload = Object.assign({}, validPayload);
        delete invalidPayload.email;

        return callServer(userInstance.id, invalidPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "Email Address" fails because ["Email Address" is required]',
            validation: {
              source: 'payload',
              keys: ['email']
            }
          });
          return done();
        });
      });

      it('should return a 400 Bad Request if the role is missing from the payload', (done) => {
        const invalidPayload = Object.assign({}, validPayload);
        delete invalidPayload.role;

        return callServer(userInstance.id, invalidPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "Role" fails because ["Role" is required]',
            validation: {
              source: 'payload',
              keys: ['role']
            }
          });
          return done();
        });
      });
    });

    describe('user authorization', () => {

      it('should return a 201 Created if the User is an Administrator', (done) => {
        return callServer(userInstance.id, validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: userInstance.id,
            firstName: 'Jane',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: false
          });

          return userInstance.updateUser(sampleUser)
          .then(() => done())
          .catch(done);
        });
      });

      it('should return a 401 Unauthorized if the token is missing', (done) => {
        return callServer(userInstance.id, validPayload, null, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(401);
          expect(statusMessage).to.equal('Unauthorized');
          expect(result).to.equal({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Missing authentication'
          });
          return done();
        });
      });

      it('should return a 401 Unauthorized if the token is invalid', (done) => {
        return callServer(userInstance.id, validPayload, invalidToken(), ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(401);
          expect(statusMessage).to.equal('Unauthorized');
          expect(result).to.equal({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid credentials',
            attributes: {
              error: 'Invalid credentials'
            }
          });
          return done();
        });
      });

      it('should return a 401 Unauthorized if an attempt was made to change the password without providing the correct password', (done) => {
        const invalidPayload = Object.assign({}, validPayload, {
          password: 'not.correct.password',
          newPassword: 'newPassword'
        });

        return callServer(userInstance.id, invalidPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(401);
          expect(statusMessage).to.equal('Unauthorized');
          expect(result).to.equal({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Password provided does not match with one on record'
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Subscriber and the token belongs to another User', (done) => {
        return callServer(userInstance.id, validPayload, validTokens['Subscriber'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Contributor and the token belongs to another User', (done) => {
        return callServer(userInstance.id, validPayload, validTokens['Contributor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Author and the token belongs to another User', (done) => {
        return callServer(userInstance.id, validPayload, validTokens['Author'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });

      it('should return a 403 Forbidden if the User is a Editor and the token belongs to another User', (done) => {
        return callServer(userInstance.id, validPayload, validTokens['Editor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(403);
          expect(statusMessage).to.equal('Forbidden');
          expect(result).to.equal({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not allowed to use this resource.'
          });
          return done();
        });
      });
    });

    it('should return a 404 Not Found if the user was not found', (done) => {
      return callServer('a8a05442-9ecd-4201-8183-b6730c086359', validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(404);
        expect(statusMessage).to.equal('Not Found');
        expect(result).to.equal({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found'
        });

        return done();
      });
    });

    it('should return a 409 Conflict if a User with the same email address exists', (done) => {
      User.createUser(validPayload)
      .then((user) => {
        const invalidPayload = Object.assign({}, validPayload);

        return callServer(userInstance.id, invalidPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(409);
          expect(statusMessage).to.equal('Conflict');
          expect(result).to.equal({
            statusCode: 409,
            error: 'Conflict',
            message: 'User already exist'
          });

          return Promise.all([
            destroyAll([user]),
            userInstance.updateUser(sampleUser)
          ])
          .then(() => done())
          .catch(done);
        });
      });
    });

    it('should return a 500 Internal Server Error if an unhandled error occurs', (done) => {
      sinon.stub(User, 'getUser').returns(Promise.reject('Error in PUT /users/{userId}'));

      return callServer(userInstance.id, validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(500);
        expect(statusMessage).to.equal('Internal Server Error');
        expect(result).to.equal({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        });

        User.getUser.restore();
        return done();
      });
    });
  });
});
