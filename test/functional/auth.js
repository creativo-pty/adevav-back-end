'use strict';

require('../testHelpers');

const Promise = require('bluebird');
// Remove unhandled promise errors from bluebird
Promise.onPossiblyUnhandledRejection(() => {});

const UserFixture = require('../fixtures/user');

let User;

exports.lab = Lab.script();

const server = Server.server;

describe('Authentication resources', () => {
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

  describe('POST /auth/login', () => {
    let userInstance;

    const instances = [];
    const validPayload = {
      email: 'john.doe@example.com',
      password: 'strong.password'
    };
    const invalidPayload = Object.assign({}, validPayload, {
      email: 'new.john.doe@example.com',
      password: 'password'
    });

    function callServer(payload, test) {
      return server.inject({
        method: 'POST',
        url: '/auth/login',
        payload
      }, test);
    }

    before((done) => {
      const sampleUser = Object.assign({}, UserFixture, validPayload);
      const sampleUserWithoutPassword = Object.assign({}, UserFixture, invalidPayload);
      delete sampleUserWithoutPassword.password;

      Promise.props({
        user: User.createUser(sampleUser),
        empty: User.createUser(sampleUserWithoutPassword)
      })
      .then(({ user, empty }) => {
        userInstance = user;
        instances.push(user, empty);

        return done();
      })
      .catch(done);
    });

    after((done) => {
      destroyAll(instances)
      .then(() => done())
      .catch(done);
    });

    it('should return a token and the User signing in when this endpoint is used correctly', (done) => {
      return callServer(validPayload, ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(200);
        expect(statusMessage).to.equal('OK');
        expect(result).to.equal({
          token: result.token,
          user: {
            id: userInstance.id,
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            avatar: '',
            role: 'Subscriber',
            isAssociate: true,
            position: 'Member',
            biography: 'John Doe moved to East Boston from St. Thomas, USVI. He studied engineering and business at the New York Maritime College and proceeded to work in a fast, upscale environment, assuring client delight on luxury super yachts. Passionate about the water, the move to Eastie was a natural fit. With encouragement from friends and neighbors, John started the East Boston Real Estate Company in 2011. In his free time, John loves to go sailing with his girlfriend Jane. He also runs a local musicians studio, and loves promoting live music events. Grateful for an amazing group of neighborhood friends, John makes sure that new residents are welcomed in a way that has become customary in East Boston.',
            isPublic: true
          }
        });
        return done();
      });
    });

    describe('user authorization', () => {

      it('should return a 401 Unauthorized if the email address provided does not match any in the system', (done) => {
        const invalidPayload = Object.assign({}, validPayload, {
          email: 'not.a.valid@email.com'
        });

        return callServer(invalidPayload, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(401);
          expect(statusMessage).to.equal('Unauthorized');
          expect(result).to.equal({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid email or password'
          });
          return done();
        });
      });

      it('should return a 401 Unauthorized if the email address provided does not match any in the system', (done) => {
        return callServer(invalidPayload, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(401);
          expect(statusMessage).to.equal('Unauthorized');
          expect(result).to.equal({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid email or password'
          });
          return done();
        });
      });

      it('should return a 401 Unauthorized if the password provided does not match the User\'s password', (done) => {
        const invalidPayload = Object.assign({}, validPayload, {
          password: 'not.a.valid.password'
        });

        return callServer(invalidPayload, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(401);
          expect(statusMessage).to.equal('Unauthorized');
          expect(result).to.equal({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid email or password'
          });
          return done();
        });
      });
    });

    describe('bad request', () => {

      it('should return a 400 Bad Request if the payload is missing', (done) => {
        return callServer(null, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: '"Login Credentials" must be an object',
            validation: {
              source: 'payload',
              keys: ['Login Credentials']
            }
          });
          return done();
        });
      });

      it('should return a 400 Bad Request if the email address is missing from the payload', (done) => {
        const invalidPayload = Object.assign({}, validPayload);
        delete invalidPayload.email;

        return callServer(invalidPayload, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 400 Bad Request if the password is missing from the payload', (done) => {
        const invalidPayload = Object.assign({}, validPayload);
        delete invalidPayload.password;

        return callServer(invalidPayload, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "Password" fails because ["Password" is required]',
            validation: {
              source: 'payload',
              keys: ['password']
            }
          });
          return done();
        });
      });
    });

    it('should return a 500 Internal Server Error if an unhandled error occurs', (done) => {
      sinon.stub(User, 'getUserByEmail').returns(Promise.reject('Error in POST /auth/login'));

      return callServer(validPayload, ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(500);
        expect(statusMessage).to.equal('Internal Server Error');
        expect(result).to.equal({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        });

        User.getUserByEmail.restore();
        return done();
      });
    });
  });

  describe('GET /auth/scope', () => {

    function callServer(token, test) {
      return server.inject({
        method: 'GET',
        url: '/auth/scope',
        headers: {
          Authorization: token
        }
      }, test);
    }

    it('should return the authentication scope when this endpoint is used correctly', (done) => {
      return callServer(validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(200);
        expect(statusMessage).to.equal('OK');
        expect(result).to.equal({
          posts: ['create', 'update'],
          users: ['create', 'view', 'update']
        });
        return done();
      });
    });

    describe('user authorization', () => {

      it('should return a 200 OK if the User is an Administrator', (done) => {
        return callServer(validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            posts: ['create', 'update'],
            users: ['create', 'view', 'update']
          });
          return done();
        });
      });

      it('should return a 200 OK if the User is a Editor', (done) => {
        return callServer(validTokens['Editor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            posts: ['create', 'update'],
            users: ['view:self', 'update:self']
          });
          return done();
        });
      });

      it('should return a 200 OK if the User is a Author', (done) => {
        return callServer(validTokens['Author'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            posts: ['create', 'update:self'],
            users: ['view:self', 'update:self']
          });
          return done();
        });
      });

      it('should return a 200 OK if the User is a Contributor', (done) => {
        return callServer(validTokens['Contributor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            posts: ['create', 'update:self'],
            users: ['view:self', 'update:self']
          });
          return done();
        });
      });

      it('should return a 200 OK if the User is a Subscriber', (done) => {
        return callServer(validTokens['Subscriber'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            posts: [],
            users: ['view:self', 'update:self']
          });
          return done();
        });
      });

      it('should return a 401 Unauthorized if the token is missing', (done) => {
        return callServer(null, ({ result, statusCode, statusMessage }) => {
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
        return callServer(invalidToken(), ({ result, statusCode, statusMessage }) => {
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
    });
  });
});
