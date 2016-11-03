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

      it('should return a 200 Created if the User is an Administrator', (done) => {
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
});
