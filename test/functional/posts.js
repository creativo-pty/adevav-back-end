'use strict';

require('../testHelpers');

const moment = require('moment');
const Promise = require('bluebird');

// Remove unhandled promise errors from bluebird
Promise.onPossiblyUnhandledRejection(() => {});

const PostFixture = require('../fixtures/post');

let Post;
let User;

exports.lab = Lab.script();

const server = Server.server;

describe('Post resources', () => {
  let fakeClock;

  let validTokens = [];

  const sampleUser = {
    email: 'user@example.com',
    role: 'Administrator',
    isAssociate: false
  };
  const sampleAdministrator = {
    email: 'administrator@example.com',
    role: 'Administrator',
    isAssociate: false
  };
  const sampleEditor = {
    email: 'editor@example.com',
    role: 'Editor',
    isAssociate: false
  };
  const sampleAuthor = {
    email: 'author@example.com',
    role: 'Author',
    isAssociate: false
  };
  const sampleContributor = {
    email: 'contributor@example.com',
    role: 'Contributor',
    isAssociate: false
  };
  const sampleSubscriber = {
    email: 'subscriber@example.com',
    role: 'Subscriber',
    isAssociate: false
  };

  before((done) => {
    fakeClock = sinon.useFakeTimers('Date');

    Server.initialize()
    .then(() => {
      Post = server.models.Post;
      User = server.models.User;

      return logIn();
    })
    .then((tokens) => {
      validTokens = tokens;
      return done();
    })
    .catch(done);
  });

  after((done) => {
    fakeClock.restore();
    return done();
  });

  describe('GET /posts', () => {
    let postInstance;
    let privatePostInstance;
    let userInstance;

    const instances = [];

    const samplePost = {
      title: 'My First Post',
      slug: 'my-first-post',
      body: 'This is my first post.',
      status: 'Published'
    };

    function callServer(token, test) {
      return server.inject({
        method: 'GET',
        url: '/posts',
        headers: {
          Authorization: token
        }
      }, test);
    }

    before((done) => {
      User.createUser(sampleUser)
      .then((user) => {
        userInstance = user;
        instances.push(user);

        const samplePostWithAuthor = Object.assign({}, samplePost, {
          authorId: user.id
        });
        const samplePrivatePost = Object.assign({}, samplePostWithAuthor, {
          visibility: 'Private',
          slug: 'my-first-post-private'
        });

        return Promise.props({
          publicPost: Post.createPost(samplePostWithAuthor),
          privatePost: Post.createPost(samplePrivatePost)
        });
      })

      .then(({ publicPost, privatePost }) => {
        postInstance = publicPost;
        privatePostInstance = privatePost;
        instances.push(publicPost, privatePost);
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

      it('should return a list of Posts when this endpoint is used correctly', (done) => {
        return callServer(validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: postInstance.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Published',
            visibility: 'Public',
            publishedOn: moment().format(),
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          }]);

          return done();
        });
      });

      it('should return a list that includes Private Posts if the User has written any Private Posts', (done) => {
        const token = createToken({ sub: userInstance.id });

        return callServer(token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: postInstance.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Published',
            visibility: 'Public',
            publishedOn: moment().format(),
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          }, {
            id: privatePostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-private',
            body: 'This is my first post.',
            status: 'Published',
            visibility: 'Private',
            publishedOn: moment().format(),
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          }]);

          return done();
        });
      });

      describe('view posts by visibility', () => {
        // Posts by Visibility
        let administratorPostInstance;
        let editorPostInstance;
        let authorPostInstance;
        let contributorPostInstance;
        let subscriberPostInstance;

        // Users by Role
        let administratorInstance;
        let editorInstance;
        let authorInstance;
        let contributorInstance;
        let subscriberInstance;

        const instances = [];

        before((done) => {
          Promise.props({
            administrator: User.createUser(sampleAdministrator),
            editor: User.createUser(sampleEditor),
            author: User.createUser(sampleAuthor),
            contributor: User.createUser(sampleContributor),
            subscriber: User.createUser(sampleSubscriber)
          })
          .then(({ administrator, editor, author, contributor, subscriber }) => {
            administratorInstance = administrator;
            editorInstance = editor;
            authorInstance = author;
            contributorInstance = contributor;
            subscriberInstance = subscriber;
            instances.push(administrator, editor, author, contributor, subscriber);

            const sampleDraft = Object.assign({}, samplePost, {
              status: 'Draft',
              authorId: userInstance.id
            });
            const sampleAdministratorPost = Object.assign({}, sampleDraft, {
              slug: 'my-first-post-administrator',
              visibility: 'Administrator'
            });
            const sampleEditorPost = Object.assign({}, sampleDraft, {
              slug: 'my-first-post-editor',
              visibility: 'Editor'
            });
            const sampleAuthorPost = Object.assign({}, sampleDraft, {
              slug: 'my-first-post-author',
              visibility: 'Author'
            });
            const sampleContributorPost = Object.assign({}, sampleDraft, {
              slug: 'my-first-post-contributor',
              visibility: 'Contributor'
            });
            const sampleSubscriberPost = Object.assign({}, sampleDraft, {
              slug: 'my-first-post-subscriber',
              visibility: 'Subscriber'
            });

            return Promise.props({
              administrator: Post.createPost(sampleAdministratorPost),
              editor: Post.createPost(sampleEditorPost),
              author: Post.createPost(sampleAuthorPost),
              contributor: Post.createPost(sampleContributorPost),
              subscriber: Post.createPost(sampleSubscriberPost)
            });
          })
          .then(({ administrator, editor, author, contributor, subscriber }) => {
            administratorPostInstance = administrator;
            editorPostInstance = editor;
            authorPostInstance = author;
            contributorPostInstance = contributor;
            subscriberPostInstance = subscriber;
            instances.push(administrator, editor, author, contributor, subscriber);

            return done();
          })
          .catch(done);
        });

        after((done) => {
          destroyAll(instances)
          .then(() => done())
          .catch(done);
        });

        it('should return a list of Posts visible to Administrator, Editor, Author, Contributor, Subscriber, and Public if the User is an Administrator', (done) => {
          const token = createToken({ sub: administratorInstance.id });

          return callServer(token, ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(200);
            expect(statusMessage).to.equal('OK');
            expect(result).to.equal([{
              id: postInstance.id,
              title: 'My First Post',
              slug: 'my-first-post',
              body: 'This is my first post.',
              status: 'Published',
              visibility: 'Public',
              publishedOn: moment().format(),
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: administratorPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-administrator',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Administrator',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: authorPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-author',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Author',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: contributorPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-contributor',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Contributor',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: editorPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-editor',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Editor',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: subscriberPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-subscriber',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Subscriber',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }]);

            return done();
          });
        });

        it('should return a list of Posts visible to Editor, Author, Contributor, Subscriber, and Public if the User is an Editor', (done) => {
          const token = createToken({ sub: editorInstance.id });

          return callServer(token, ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(200);
            expect(statusMessage).to.equal('OK');
            expect(result).to.equal([{
              id: postInstance.id,
              title: 'My First Post',
              slug: 'my-first-post',
              body: 'This is my first post.',
              status: 'Published',
              visibility: 'Public',
              publishedOn: moment().format(),
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: authorPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-author',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Author',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: contributorPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-contributor',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Contributor',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: editorPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-editor',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Editor',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: subscriberPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-subscriber',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Subscriber',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }]);

            return done();
          });
        });

        it('should return a list of Posts visible to Author, Contributor, Subscriber, and Public if the User is an Author', (done) => {
          const token = createToken({ sub: authorInstance.id });

          return callServer(token, ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(200);
            expect(statusMessage).to.equal('OK');
            expect(result).to.equal([{
              id: postInstance.id,
              title: 'My First Post',
              slug: 'my-first-post',
              body: 'This is my first post.',
              status: 'Published',
              visibility: 'Public',
              publishedOn: moment().format(),
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: authorPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-author',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Author',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: contributorPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-contributor',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Contributor',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: subscriberPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-subscriber',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Subscriber',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }]);

            return done();
          });
        });

        it('should return a list of Posts visible to Contributor, Subscriber, and Public if the User is an Contributor', (done) => {
          const token = createToken({ sub: contributorInstance.id });

          return callServer(token, ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(200);
            expect(statusMessage).to.equal('OK');
            expect(result).to.equal([{
              id: postInstance.id,
              title: 'My First Post',
              slug: 'my-first-post',
              body: 'This is my first post.',
              status: 'Published',
              visibility: 'Public',
              publishedOn: moment().format(),
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: contributorPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-contributor',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Contributor',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: subscriberPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-subscriber',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Subscriber',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }]);

            return done();
          });
        });

        it('should return a list of Posts visible to Subscriber and Public if the User is an Subscriber', (done) => {
          const token = createToken({ sub: subscriberInstance.id });

          return callServer(token, ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(200);
            expect(statusMessage).to.equal('OK');
            expect(result).to.equal([{
              id: postInstance.id,
              title: 'My First Post',
              slug: 'my-first-post',
              body: 'This is my first post.',
              status: 'Published',
              visibility: 'Public',
              publishedOn: moment().format(),
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }, {
              id: subscriberPostInstance.id,
              title: 'My First Post',
              slug: 'my-first-post-subscriber',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Subscriber',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }]);

            return done();
          });
        });

        it('should return a list of only Published Public Posts if the User has no role', (done) => {
          return callServer(null, ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(200);
            expect(statusMessage).to.equal('OK');
            expect(result).to.equal([{
              id: postInstance.id,
              title: 'My First Post',
              slug: 'my-first-post',
              body: 'This is my first post.',
              status: 'Published',
              visibility: 'Public',
              publishedOn: moment().format(),
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            }]);

            return done();
          });
        });
      });
    });

    describe('user authorization', () => {

      it('should return a 200 OK if the User is an Administrator', (done) => {
        return callServer(validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: postInstance.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Published',
            visibility: 'Public',
            publishedOn: moment().format(),
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          }]);

          return done();
        });
      });

      it('should return a 200 OK if the User is an Editor', (done) => {
        return callServer(validTokens['Editor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: postInstance.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Published',
            visibility: 'Public',
            publishedOn: moment().format(),
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          }]);

          return done();
        });
      });

      it('should return a 200 OK if the User is an Author', (done) => {
        return callServer(validTokens['Author'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: postInstance.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Published',
            visibility: 'Public',
            publishedOn: moment().format(),
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          }]);

          return done();
        });
      });

      it('should return a 200 OK if the User is an Contributor', (done) => {
        return callServer(validTokens['Contributor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: postInstance.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Published',
            visibility: 'Public',
            publishedOn: moment().format(),
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          }]);

          return done();
        });
      });

      it('should return a 200 OK if the User is an Subscriber', (done) => {
        return callServer(validTokens['Subscriber'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: postInstance.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Published',
            visibility: 'Public',
            publishedOn: moment().format(),
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          }]);

          return done();
        });
      });

      it('should return a 200 OK if the token is missing', (done) => {
        return callServer(null, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: postInstance.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Published',
            visibility: 'Public',
            publishedOn: moment().format(),
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          }]);

          return done();
        });
      });

      it('should return a 200 OK if the token is invalid', (done) => {
        return callServer(invalidToken(), ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal([{
            id: postInstance.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Published',
            visibility: 'Public',
            publishedOn: moment().format(),
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          }]);

          return done();
        });
      });
    });

    it('should return a 500 Internal Server Error if an unhandled error occurs', (done) => {
      sinon.stub(Post, 'listPosts').returns(Promise.reject('Error in GET /posts'));

      return callServer(validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(500);
        expect(statusMessage).to.equal('Internal Server Error');
        expect(result).to.equal({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        });

        Post.listPosts.restore();
        return done();
      });
    });
  });

  describe('POST /posts', () => {
    let administratorInstance;
    let contributorInstance;

    const instances = [];

    const validPayload = Object.assign({}, PostFixture, {
      status: 'Draft'
    });

    function callServer(payload, token, test) {
      return server.inject({
        method: 'POST',
        url: '/posts',
        payload,
        headers: {
          Authorization: token
        }
      }, test);
    }

    before((done) => {
      Promise.props({
        administrator: User.createUser(sampleAdministrator),
        contributor: User.createUser(sampleContributor)
      })
      .then(({ administrator, contributor }) => {
        administratorInstance = administrator;
        contributorInstance = contributor;
        instances.push(administrator, contributor);

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

      it('should return a newly created Post when this endpoint is used correctly', (done) => {
        const token = createToken({ sub: administratorInstance.id });

        return callServer(validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: result.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: administratorInstance.id,
              email: 'administrator@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return Post.getPost(result.id)
          .then((post) => destroyAll([post]))
          .then(() => done())
          .catch(done);
        });
      });

      it('should allow a User to publish a Post if they are not a Contributor', (done) => {
        fakeClock.tick(1000 * 60 * 60);

        const token = createToken({ sub: administratorInstance.id });

        const payload = Object.assign({}, validPayload, {
          status: 'Published'
        });

        return callServer(payload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: result.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Published',
            visibility: 'Public',
            publishedOn: moment().format(),
            author: {
              id: administratorInstance.id,
              email: 'administrator@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return Post.getPost(result.id)
          .then((post) => destroyAll([post]))
          .then(() => done())
          .catch(done);
        });
      });

      describe('post slugs', () => {
        const instances = [];

        before((done) => {
          const samplePost = Object.assign({}, PostFixture, {
            authorId: contributorInstance.id,
            status: 'Draft'
          });

          Post.createPost(samplePost)
          .then((post) => {
            instances.push(post);

            return done();
          })
          .catch(done);
        });

        after((done) => {
          destroyAll(instances)
          .then(() => done())
          .catch(done);
        });

        it('should generate a slug from the Post\'s title if no slug is provided', (done) => {
          const token = createToken({ sub: administratorInstance.id });
          const payload = Object.assign({}, validPayload, {
            title: 'My Post',
            body: 'This is a post.'
          });
          delete payload.slug;

          return callServer(payload, token, ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(201);
            expect(statusMessage).to.equal('Created');
            expect(result).to.equal({
              id: result.id,
              title: 'My Post',
              slug: 'my-post',
              body: 'This is a post.',
              status: 'Draft',
              visibility: 'Public',
              publishedOn: '',
              author: {
                id: administratorInstance.id,
                email: 'administrator@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            });

            return Post.getPost(result.id)
            .then((post) => destroyAll([post]))
            .then(() => done())
            .catch(done);
          });
        });

        it('should generate a different slug from the one generated if another Post with the same slug exists', (done) => {
          const token = createToken({ sub: administratorInstance.id });
          const payload = Object.assign({}, validPayload);
          delete payload.slug;

          return callServer(validPayload, token, ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(201);
            expect(statusMessage).to.equal('Created');
            expect(result).to.equal({
              id: result.id,
              title: 'My First Post',
              slug: 'my-first-post-1',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Public',
              publishedOn: '',
              author: {
                id: administratorInstance.id,
                email: 'administrator@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            });

            return Post.getPost(result.id)
            .then((post) => destroyAll([post]))
            .then(() => done())
            .catch(done);
          });
        });

        it('should generate a different slug from the one provided if another Post with the same slug exists', (done) => {
          const token = createToken({ sub: administratorInstance.id });

          return callServer(validPayload, token, ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(201);
            expect(statusMessage).to.equal('Created');
            expect(result).to.equal({
              id: result.id,
              title: 'My First Post',
              slug: 'my-first-post-1',
              body: 'This is my first post.',
              status: 'Draft',
              visibility: 'Public',
              publishedOn: '',
              author: {
                id: administratorInstance.id,
                email: 'administrator@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            });

            return Post.getPost(result.id)
            .then((post) => destroyAll([post]))
            .then(() => done())
            .catch(done);
          });
        });
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
            message: '"Post" must be an object',
            validation: {
              source: 'payload',
              keys: ['Post']
            }
          });
          return done();
        });
      });

      it('should return a 400 Bad Request if the title is missing from the payload', (done) => {
        const invalidPayload = Object.assign({}, validPayload);
        delete invalidPayload.title;

        return callServer(invalidPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "Title" fails because ["Title" is required]',
            validation: {
              source: 'payload',
              keys: ['title']
            }
          });
          return done();
        });
      });

      it('should return a 400 Bad Request if the body is missing from the payload', (done) => {
        const invalidPayload = Object.assign({}, validPayload);
        delete invalidPayload.body;

        return callServer(invalidPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "Body" fails because ["Body" is required]',
            validation: {
              source: 'payload',
              keys: ['body']
            }
          });
          return done();
        });
      });
    });

    describe('user authorization', () => {
      let editorInstance;
      let authorInstance;

      const instances = [];

      before((done) => {
        Promise.props({
          editor: User.createUser(sampleEditor),
          author: User.createUser(sampleAuthor)
        })
        .then(({ editor, author }) => {
          editorInstance = editor;
          authorInstance = author;
          instances.push(editor, author);

          return done();
        })
        .catch(done);
      });

      after((done) => {
        destroyAll(instances)
        .then(() => done())
        .catch(done);
      });

      it('should return a 201 Created if the User is an Administrator', (done) => {
        const token = createToken({ sub: administratorInstance.id });

        return callServer(validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: result.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: administratorInstance.id,
              email: 'administrator@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return Post.getPost(result.id)
          .then((post) => destroyAll([post]))
          .then(() => done())
          .catch(done);
        });
      });

      it('should return a 201 Created if the User is a Editor', (done) => {
        const token = createToken({ sub: editorInstance.id });

        return callServer(validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: result.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: editorInstance.id,
              email: 'editor@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Editor',
              isAssociate: false
            }
          });

          return Post.getPost(result.id)
          .then((post) => destroyAll([post]))
          .then(() => done())
          .catch(done);
        });
      });

      it('should return a 201 Created if the User is a Author', (done) => {
        const token = createToken({ sub: authorInstance.id });

        return callServer(validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: result.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: authorInstance.id,
              email: 'author@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Author',
              isAssociate: false
            }
          });

          return Post.getPost(result.id)
          .then((post) => destroyAll([post]))
          .then(() => done())
          .catch(done);
        });
      });

      it('should return a 201 Created if the User is a Contributor', (done) => {
        const token = createToken({ sub: contributorInstance.id });

        return callServer(validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: result.id,
            title: 'My First Post',
            slug: 'my-first-post',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: contributorInstance.id,
              email: 'contributor@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Contributor',
              isAssociate: false
            }
          });

          return Post.getPost(result.id)
          .then((post) => destroyAll([post]))
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

      it('should return a 403 Forbidden if the User is not in the system', (done) => {
        return callServer(validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a Contributor wants to publish a post', (done) => {
        const token = createToken({ sub: contributorInstance.id });
        const invalidPayload = Object.assign({}, validPayload, {
          status: 'Published'
        });

        return callServer(invalidPayload, token, ({ result, statusCode, statusMessage }) => {
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

    it('should return a 500 Internal Server Error if an unhandled error occurs', (done) => {
      sinon.stub(Post, 'createPost').returns(Promise.reject('Error in POST /posts'));

      const token = createToken({ sub: administratorInstance.id });

      return callServer(validPayload, token, ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(500);
        expect(statusMessage).to.equal('Internal Server Error');
        expect(result).to.equal({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        });

        Post.createPost.restore();
        return done();
      });
    });
  });

  describe('GET /posts/{postId}', () => {
    let administratorPostInstance;
    let editorPostInstance;
    let authorPostInstance;
    let contributorPostInstance;
    let subscriberPostInstance;
    let privatePostInstance;
    let publicPostInstance;

    let userInstance;
    let administratorInstance;
    let editorInstance;
    let authorInstance;
    let contributorInstance;
    let subscriberInstance;

    const instances = [];

    function callServer(id, token, test) {
      return server.inject({
        method: 'GET',
        url: `/posts/${id}`,
        headers: {
          'Authorization': token
        }
      }, test);
    }

    before((done) => {
      Promise.props({
        user: User.createUser(sampleUser),
        administrator: User.createUser(sampleAdministrator),
        editor: User.createUser(sampleEditor),
        author: User.createUser(sampleAuthor),
        contributor: User.createUser(sampleContributor),
        subscriber: User.createUser(sampleSubscriber)
      })
      .then(({ user, administrator, editor, author, contributor, subscriber }) => {
        userInstance = user;
        administratorInstance = administrator;
        editorInstance = editor;
        authorInstance = author;
        contributorInstance = contributor;
        subscriberInstance = subscriber;
        instances.push(user, administrator, editor, author, contributor, subscriber);

        const samplePost = {
          title: 'My First Post',
          body: 'This is my first post.',
          status: 'Draft',
          authorId: user.id
        };
        const sampleAdministratorPost = Object.assign({}, samplePost, {
          slug: 'my-first-post-administrator',
          visibility: 'Administrator'
        });
        const sampleEditorPost = Object.assign({}, samplePost, {
          slug: 'my-first-post-editor',
          visibility: 'Editor'
        });
        const sampleAuthorPost = Object.assign({}, samplePost, {
          slug: 'my-first-post-author',
          visibility: 'Author'
        });
        const sampleContributorPost = Object.assign({}, samplePost, {
          slug: 'my-first-post-contributor',
          visibility: 'Contributor'
        });
        const sampleSubscriberPost = Object.assign({}, samplePost, {
          slug: 'my-first-post-subscriber',
          visibility: 'Subscriber'
        });
        const samplePrivatePost = Object.assign({}, samplePost, {
          slug: 'my-first-post-private',
          visibility: 'Private'
        });
        const samplePublicPost = Object.assign({}, samplePost, {
          slug: 'my-first-post-public',
          visibility: 'Public'
        });

        return Promise.props({
          administrator: Post.createPost(sampleAdministratorPost),
          editor: Post.createPost(sampleEditorPost),
          author: Post.createPost(sampleAuthorPost),
          contributor: Post.createPost(sampleContributorPost),
          subscriber: Post.createPost(sampleSubscriberPost),
          privatePost: Post.createPost(samplePrivatePost),
          publicPost: Post.createPost(samplePublicPost)
        });
      })
      .then(({ administrator, editor, author, contributor, subscriber, privatePost, publicPost }) => {
        administratorPostInstance = administrator;
        editorPostInstance = editor;
        authorPostInstance = author;
        contributorPostInstance = contributor;
        subscriberPostInstance = subscriber;
        privatePostInstance = privatePost;
        publicPostInstance = publicPost;
        instances.push(administrator, editor, author, contributor, subscriber, privatePost, publicPost);

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

      it('should return a Post when this endpoint is used correctly', (done) => {
        return callServer(publicPostInstance.id, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Private Post if the User created that Post', (done) => {
        const token = createToken({ sub: userInstance.id });

        return callServer(privatePostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: privatePostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-private',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Private',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return an Administrator Post if the User created that Post', (done) => {
        const token = createToken({ sub: userInstance.id });

        return callServer(administratorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: administratorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-administrator',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Administrator',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return an Editor Post if the User created that Post', (done) => {
        const token = createToken({ sub: userInstance.id });

        return callServer(editorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: editorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-editor',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Editor',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return an Author Post if the User created that Post', (done) => {
        const token = createToken({ sub: userInstance.id });

        return callServer(authorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: authorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-author',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Author',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Contributor Post if the User created that Post', (done) => {
        const token = createToken({ sub: userInstance.id });

        return callServer(contributorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: contributorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-contributor',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Contributor',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Subscriber Post if the User created that Post', (done) => {
        const token = createToken({ sub: userInstance.id });

        return callServer(subscriberPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: subscriberPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-subscriber',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Subscriber',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return an Administrator Post if the User is an Administrator', (done) => {
        const token = createToken({ sub: administratorInstance.id });

        return callServer(administratorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: administratorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-administrator',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Administrator',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return an Editor Post if the User is an Administrator', (done) => {
        const token = createToken({ sub: administratorInstance.id });

        return callServer(editorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: editorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-editor',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Editor',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return an Author Post if the User is an Administrator', (done) => {
        const token = createToken({ sub: administratorInstance.id });

        return callServer(authorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: authorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-author',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Author',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Contributor Post if the User is an Administrator', (done) => {
        const token = createToken({ sub: administratorInstance.id });

        return callServer(contributorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: contributorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-contributor',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Contributor',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Subscriber Post if the User is an Administrator', (done) => {
        const token = createToken({ sub: administratorInstance.id });

        return callServer(subscriberPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: subscriberPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-subscriber',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Subscriber',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Public Post if the User is an Administrator', (done) => {
        const token = createToken({ sub: administratorInstance.id });

        return callServer(publicPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return an Editor Post if the User is an Editor', (done) => {
        const token = createToken({ sub: editorInstance.id });

        return callServer(editorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: editorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-editor',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Editor',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return an Author Post if the User is an Editor', (done) => {
        const token = createToken({ sub: editorInstance.id });

        return callServer(authorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: authorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-author',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Author',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Contributor Post if the User is an Editor', (done) => {
        const token = createToken({ sub: editorInstance.id });

        return callServer(contributorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: contributorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-contributor',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Contributor',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Subscriber Post if the User is an Editor', (done) => {
        const token = createToken({ sub: editorInstance.id });

        return callServer(subscriberPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: subscriberPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-subscriber',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Subscriber',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Public Post if the User is an Editor', (done) => {
        const token = createToken({ sub: editorInstance.id });

        return callServer(publicPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return an Author Post if the User is an Author', (done) => {
        const token = createToken({ sub: authorInstance.id });

        return callServer(authorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: authorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-author',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Author',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Contributor Post if the User is an Author', (done) => {
        const token = createToken({ sub: authorInstance.id });

        return callServer(contributorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: contributorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-contributor',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Contributor',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Subscriber Post if the User is an Author', (done) => {
        const token = createToken({ sub: authorInstance.id });

        return callServer(subscriberPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: subscriberPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-subscriber',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Subscriber',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Public Post if the User is an Author', (done) => {
        const token = createToken({ sub: authorInstance.id });

        return callServer(publicPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Contributor Post if the User is a Contributor', (done) => {
        const token = createToken({ sub: contributorInstance.id });

        return callServer(contributorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: contributorPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-contributor',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Contributor',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Subscriber Post if the User is a Contributor', (done) => {
        const token = createToken({ sub: contributorInstance.id });

        return callServer(subscriberPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: subscriberPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-subscriber',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Subscriber',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Public Post if the User is a Contributor', (done) => {
        const token = createToken({ sub: contributorInstance.id });

        return callServer(publicPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Subscriber Post if the User is a Subscriber', (done) => {
        const token = createToken({ sub: subscriberInstance.id });

        return callServer(subscriberPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: subscriberPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-subscriber',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Subscriber',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Public Post if the User is a Subscriber', (done) => {
        const token = createToken({ sub: subscriberInstance.id });

        return callServer(publicPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a Public Post even if the User has not created that Post', (done) => {
        return callServer(publicPostInstance.id, null, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });
    });

    describe('user authorization', () => {

      it('should return a 200 OK if the User is an Administrator', (done) => {
        return callServer(publicPostInstance.id, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a 200 OK if the User is an Editor', (done) => {
        return callServer(publicPostInstance.id, validTokens['Editor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a 200 OK if the User is an Author', (done) => {
        return callServer(publicPostInstance.id, validTokens['Author'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a 200 OK if the User is an Contributor', (done) => {
        return callServer(publicPostInstance.id, validTokens['Contributor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a 200 OK if the User is an Subscriber', (done) => {
        return callServer(publicPostInstance.id, validTokens['Subscriber'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a 200 OK if the token is missing', (done) => {
        return callServer(publicPostInstance.id, null, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a 200 OK if the token is invalid', (done) => {
        return callServer(publicPostInstance.id, invalidToken(), ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(200);
          expect(statusMessage).to.equal('OK');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My First Post',
            slug: 'my-first-post-public',
            body: 'This is my first post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });

          return done();
        });
      });

      it('should return a 403 Forbidden if a User without a token tries to view an Administrator Post', (done) => {
        return callServer(administratorPostInstance.id, null, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a User without a token tries to view an Editor Post', (done) => {
        return callServer(editorPostInstance.id, null, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a User without a token tries to view an Author Post', (done) => {
        return callServer(authorPostInstance.id, null, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a User without a token tries to view an Contributor Post', (done) => {
        return callServer(contributorPostInstance.id, null, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a User without a token tries to view an Subscriber Post', (done) => {
        return callServer(subscriberPostInstance.id, null, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if an Editor tries to view an Administrator Post', (done) => {
        const token = createToken({ sub: editorInstance.id });

        return callServer(administratorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if an Author tries to view an Administrator Post', (done) => {
        const token = createToken({ sub: authorInstance.id });

        return callServer(administratorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if an Author tries to view an Editor Post', (done) => {
        const token = createToken({ sub: authorInstance.id });

        return callServer(editorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a Contributor tries to view an Administrator Post', (done) => {
        const token = createToken({ sub: contributorInstance.id });

        return callServer(administratorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a Contributor tries to view an Editor Post', (done) => {
        const token = createToken({ sub: contributorInstance.id });

        return callServer(editorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a Contributor tries to view an Author Post', (done) => {
        const token = createToken({ sub: contributorInstance.id });

        return callServer(authorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a Subscriber tries to view an Administrator Post', (done) => {
        const token = createToken({ sub: subscriberInstance.id });

        return callServer(administratorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a Subscriber tries to view an Editor Post', (done) => {
        const token = createToken({ sub: subscriberInstance.id });

        return callServer(editorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a Subscriber tries to view an Author Post', (done) => {
        const token = createToken({ sub: subscriberInstance.id });

        return callServer(authorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a Subscriber tries to view a Contributor Post', (done) => {
        const token = createToken({ sub: subscriberInstance.id });

        return callServer(contributorPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
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

    describe('bad request', () => {

      it('should return a 400 Bad Request if the ID provided is not a GUID', (done) => {
        return callServer('not.a.uuid', validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "Post ID" fails because ["Post ID" must be a valid GUID]',
            validation: {
              source: 'params',
              keys: ['postId']
            }
          });

          return done();
        });
      });
    });

    it('should return a 404 Not Found if the Post was not found', (done) => {
      return callServer('7f0d58a4-a2b4-427c-b8bf-dcbcbafaf152', validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(404);
        expect(statusMessage).to.equal('Not Found');
        expect(result).to.equal({
          statusCode: 404,
          error: 'Not Found',
          message: 'Post not found'
        });

        return done();
      });
    });

    it('should return a 500 Internal Server Error if an unhandled error occurs', (done) => {
      sinon.stub(Post, 'getPost').returns(Promise.reject('Error in GET /posts/{postId}'));

      const token = createToken({ sub: userInstance.id });

      return callServer(publicPostInstance.id, token, ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(500);
        expect(statusMessage).to.equal('Internal Server Error');
        expect(result).to.equal({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        });

        Post.getPost.restore();
        return done();
      });
    });
  });

  describe('PUT /posts/{postId}', () => {
    let administratorPostInstance;
    let editorPostInstance;
    let authorPostInstance;
    let contributorPostInstance;
    let subscriberPostInstance;
    let publicPostInstance;
    let publishedPostInstance;

    let userInstance;
    let administratorInstance;
    let editorInstance;
    let authorInstance;
    let contributorInstance;
    let subscriberInstance;

    const instances = [];
    const postInstances = [];

    const validPayload = {
      title: 'My Second Post',
      slug: 'my-second-post',
      body: 'This is my second post.',
      status: 'Draft',
      visibility: 'Public'
    };

    function callServer(id, payload, token, test) {
      return server.inject({
        method: 'PUT',
        url: `/posts/${id}`,
        payload,
        headers: {
          'Authorization': token
        }
      }, test);
    }

    before((done) => {
      Promise.props({
        user: User.createUser(sampleUser),
        administrator: User.createUser(sampleAdministrator),
        editor: User.createUser(sampleEditor),
        author: User.createUser(sampleAuthor),
        contributor: User.createUser(sampleContributor),
        subscriber: User.createUser(sampleSubscriber)
      })
      .then(({ user, administrator, editor, author, contributor, subscriber }) => {
        userInstance = user;
        administratorInstance = administrator;
        editorInstance = editor;
        authorInstance = author;
        contributorInstance = contributor;
        subscriberInstance = subscriber;
        instances.push(user, administrator, editor, author, contributor, subscriber);

        return done();
      })
      .catch(done);
    });

    beforeEach((done) => {
      const samplePost = {
        title: 'My First Post',
        body: 'This is my first post.',
        status: 'Draft',
        authorId: userInstance.id
      };
      const sampleAdministratorPost = Object.assign({}, samplePost, {
        slug: 'my-first-post-administrator',
        visibility: 'Administrator',
        authorId: administratorInstance.id
      });
      const sampleEditorPost = Object.assign({}, samplePost, {
        slug: 'my-first-post-editor',
        visibility: 'Editor',
        authorId: editorInstance.id
      });
      const sampleAuthorPost = Object.assign({}, samplePost, {
        slug: 'my-first-post-author',
        visibility: 'Author',
        authorId: authorInstance.id
      });
      const sampleContributorPost = Object.assign({}, samplePost, {
        slug: 'my-first-post-contributor',
        visibility: 'Contributor',
        authorId: contributorInstance.id
      });
      const sampleSubscriberPost = Object.assign({}, samplePost, {
        slug: 'my-first-post-subscriber',
        visibility: 'Subscriber',
        authorId: subscriberInstance.id
      });
      const samplePublicPost = Object.assign({}, samplePost, {
        slug: 'my-first-post-public',
        visibility: 'Public'
      });
      const samplePublishedPost = Object.assign({}, samplePost, {
        slug: 'my-first-post-published',
        status: 'Published'
      });

      Promise.props({
        administrator: Post.createPost(sampleAdministratorPost),
        editor: Post.createPost(sampleEditorPost),
        author: Post.createPost(sampleAuthorPost),
        contributor: Post.createPost(sampleContributorPost),
        subscriber: Post.createPost(sampleSubscriberPost),
        publicPost: Post.createPost(samplePublicPost),
        published: Post.createPost(samplePublishedPost)
      })
      .then(({ administrator, editor, author, contributor, subscriber, publicPost, published }) => {
        administratorPostInstance = administrator;
        editorPostInstance = editor;
        authorPostInstance = author;
        contributorPostInstance = contributor;
        subscriberPostInstance = subscriber;
        publicPostInstance = publicPost;
        publishedPostInstance = published;
        postInstances.push(administrator, editor, author, contributor, subscriber, publicPost, published);

        return done();
      })
      .catch(done);
    });

    afterEach((done) => {
      destroyAll(postInstances)
      .then(() => done())
      .catch(done);
    });

    after((done) => {
      destroyAll(instances)
      .then(() => done())
      .catch(done);
    });

    describe('success', () => {

      it('should return an updated Post when this endpoint is used correctly', (done) => {
        return callServer(publicPostInstance.id, validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should return an updated Post with only a different title and body if that is the only information provided in the payload', (done) => {
        const payload = {
          title: 'My Second Post',
          body: 'This is my second post.'
        };

        return callServer(publicPostInstance.id, payload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My Second Post',
            slug: 'my-first-post-public',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to publish a Post if the User is an Administrator', (done) => {
        const payload = Object.assign({}, validPayload, { status: 'Published' });

        return callServer(publicPostInstance.id, payload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Published',
            visibility: 'Public',
            publishedOn: moment().format(),
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to retract a Post if the User is an Administrator', (done) => {
        const payload = Object.assign({}, validPayload, { status: 'Draft' });

        return callServer(publishedPostInstance.id, payload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: publishedPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update an Administrator\'s Post if the User is an Administrator', (done) => {
        return callServer(administratorPostInstance.id, validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: administratorPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: administratorInstance.id,
              email: 'administrator@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update an Editor\'s Post if the User is an Administrator', (done) => {
        return callServer(editorPostInstance.id, validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: editorPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: editorInstance.id,
              email: 'editor@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Editor',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update an Author\'s Post if the User is an Administrator', (done) => {
        return callServer(authorPostInstance.id, validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: authorPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: authorInstance.id,
              email: 'author@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Author',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update an Contributor\'s Post if the User is an Administrator', (done) => {
        return callServer(contributorPostInstance.id, validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: contributorPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: contributorInstance.id,
              email: 'contributor@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Contributor',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update a Subscriber\'s Post if the User is an Administrator', (done) => {
        return callServer(subscriberPostInstance.id, validPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: subscriberPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: subscriberInstance.id,
              email: 'subscriber@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Subscriber',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update an Administrator\'s Post if the User is an Editor', (done) => {
        return callServer(administratorPostInstance.id, validPayload, validTokens['Editor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: administratorPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: administratorInstance.id,
              email: 'administrator@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update an Editor\'s Post if the User is an Editor', (done) => {
        return callServer(editorPostInstance.id, validPayload, validTokens['Editor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: editorPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: editorInstance.id,
              email: 'editor@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Editor',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update an Author\'s Post if the User is an Editor', (done) => {
        return callServer(authorPostInstance.id, validPayload, validTokens['Editor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: authorPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: authorInstance.id,
              email: 'author@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Author',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update an Contributor\'s Post if the User is an Editor', (done) => {
        return callServer(contributorPostInstance.id, validPayload, validTokens['Editor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: contributorPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: contributorInstance.id,
              email: 'contributor@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Contributor',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update a Subscriber\'s Post if the User is an Editor', (done) => {
        return callServer(subscriberPostInstance.id, validPayload, validTokens['Editor'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: subscriberPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: subscriberInstance.id,
              email: 'subscriber@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Subscriber',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update an their own Post if the User is an Author', (done) => {
        const token = createToken({ role: 'Author', sub: authorInstance.id });

        return callServer(authorPostInstance.id, validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: authorPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: authorInstance.id,
              email: 'author@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Author',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should allow to update an their own Post if the User is an Contributor', (done) => {
        const token = createToken({ role: 'Contributor', sub: contributorInstance.id });

        return callServer(contributorPostInstance.id, validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: contributorPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: contributorInstance.id,
              email: 'contributor@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Contributor',
              isAssociate: false
            }
          });
          return done();
        });
      });

      describe('with slugs', () => {
        let postInstance;

        before((done) => {
          const samplePost = {
            title: 'My Third Post',
            slug: 'my-third-post',
            body: 'This is my third post.',
            status: 'Draft',
            authorId: userInstance.id
          };

          Post.createPost(samplePost)
          .then((post) => {
            postInstance = post;
            return done();
          })
          .catch(done);
        });

        after((done) => {
          postInstance.destroy()
          .then(() => done())
          .catch(done);
        });

        it('should return an updated Post with the same slug if no slug was provided in the payload', (done) => {
          const payload = Object.assign({}, validPayload);
          delete payload.slug;

          return callServer(publicPostInstance.id, payload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(201);
            expect(statusMessage).to.equal('Created');
            expect(result).to.equal({
              id: publicPostInstance.id,
              title: 'My Second Post',
              slug: 'my-first-post-public',
              body: 'This is my second post.',
              status: 'Draft',
              visibility: 'Public',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            });
            return done();
          });
        });

        it('should return an updated Post with the provided slug if no other Post with the same slug was found in the system', (done) => {
          const payload = Object.assign({}, validPayload, { slug: 'my-second-post' });

          return callServer(publicPostInstance.id, payload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(201);
            expect(statusMessage).to.equal('Created');
            expect(result).to.equal({
              id: publicPostInstance.id,
              title: 'My Second Post',
              slug: 'my-second-post',
              body: 'This is my second post.',
              status: 'Draft',
              visibility: 'Public',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            });
            return done();
          });
        });

        it('should return an updated Post with a different slug than the one provided if other Posts with the same slug were found in the system', (done) => {
          const payload = Object.assign({}, validPayload, { slug: 'my-third-post' });

          return callServer(publicPostInstance.id, payload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
            expect(statusCode).to.equal(201);
            expect(statusMessage).to.equal('Created');
            expect(result).to.equal({
              id: publicPostInstance.id,
              title: 'My Second Post',
              slug: 'my-third-post-1',
              body: 'This is my second post.',
              status: 'Draft',
              visibility: 'Public',
              publishedOn: '',
              author: {
                id: userInstance.id,
                email: 'user@example.com',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'Administrator',
                isAssociate: false
              }
            });
            return done();
          });
        });
      });
    });

    describe('bad request', () => {

      it('should return a 400 Bad Request if the payload is missing', (done) => {
        return callServer(publicPostInstance.id, null, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: '"Post" must be an object',
            validation: {
              source: 'payload',
              keys: ['Post']
            }
          });
          return done();
        });
      });

      it('should return a 400 Bad Request if the title is missing from the payload', (done) => {
        const invalidPayload = Object.assign({}, validPayload);
        delete invalidPayload.title;

        return callServer(publicPostInstance.id, invalidPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "Title" fails because ["Title" is required]',
            validation: {
              source: 'payload',
              keys: ['title']
            }
          });
          return done();
        });
      });

      it('should return a 400 Bad Request if the body is missing from the payload', (done) => {
        const invalidPayload = Object.assign({}, validPayload);
        delete invalidPayload.body;

        return callServer(publicPostInstance.id, invalidPayload, validTokens['Administrator'], ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(400);
          expect(statusMessage).to.equal('Bad Request');
          expect(result).to.equal({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "Body" fails because ["Body" is required]',
            validation: {
              source: 'payload',
              keys: ['body']
            }
          });
          return done();
        });
      });
    });

    describe('user authorization', () => {

      it('should return a 201 Created if the User is an Administrator', (done) => {
        const token = createToken({ sub: administratorInstance.id });

        return callServer(publicPostInstance.id, validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should return a 201 Created if the User is a Editor', (done) => {
        const token = createToken({ sub: editorInstance.id });

        return callServer(publicPostInstance.id, validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should return a 201 Created if the User is a Author', (done) => {
        const token = createToken({ sub: authorInstance.id });

        return callServer(publicPostInstance.id, validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should return a 201 Created if the User is a Contributor', (done) => {
        const token = createToken({ sub: contributorInstance.id });

        return callServer(publicPostInstance.id, validPayload, token, ({ result, statusCode, statusMessage }) => {
          expect(statusCode).to.equal(201);
          expect(statusMessage).to.equal('Created');
          expect(result).to.equal({
            id: publicPostInstance.id,
            title: 'My Second Post',
            slug: 'my-second-post',
            body: 'This is my second post.',
            status: 'Draft',
            visibility: 'Public',
            publishedOn: '',
            author: {
              id: userInstance.id,
              email: 'user@example.com',
              firstName: '',
              lastName: '',
              avatar: '',
              role: 'Administrator',
              isAssociate: false
            }
          });
          return done();
        });
      });

      it('should return a 401 Unauthorized if the token is missing', (done) => {
        return callServer(publicPostInstance.id, validPayload, null, ({ result, statusCode, statusMessage }) => {
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
        return callServer(publicPostInstance.id, validPayload, invalidToken(), ({ result, statusCode, statusMessage }) => {
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
        return callServer(publicPostInstance.id, validPayload, validTokens['Subscriber'], ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if an Author tries to edit another\'s Post', (done) => {
        return callServer(publicPostInstance.id, validPayload, validTokens['Author'], ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if an Contributor tries to edit another\'s Post', (done) => {
        return callServer(publicPostInstance.id, validPayload, validTokens['Contributor'], ({ result, statusCode, statusMessage }) => {
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

      it('should return a 403 Forbidden if a Contributor wants to publish their own post', (done) => {
        const token = createToken({ role: 'Contributor', sub: contributorInstance.id });
        const invalidPayload = Object.assign({}, validPayload, {
          status: 'Published'
        });

        return callServer(contributorPostInstance.id, invalidPayload, token, ({ result, statusCode, statusMessage }) => {
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

    it('should return a 404 Not Found if the Post was not found', (done) => {
      const token = createToken({ sub: userInstance.id });

      return callServer('08b4ba8e-1403-48f2-a09e-e5207aa98a3c', validPayload, token, ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(404);
        expect(statusMessage).to.equal('Not Found');
        expect(result).to.equal({
          statusCode: 404,
          error: 'Not Found',
          message: 'Post not found'
        });

        return done();
      });
    });

    it('should return a 500 Internal Server Error if an unhandled error occurs', (done) => {
      sinon.stub(Post, 'getPost').returns(Promise.reject('Error in PUT /posts/{postId}'));

      const token = createToken({ sub: userInstance.id });

      return callServer(publicPostInstance.id, validPayload, token, ({ result, statusCode, statusMessage }) => {
        expect(statusCode).to.equal(500);
        expect(statusMessage).to.equal('Internal Server Error');
        expect(result).to.equal({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        });

        Post.getPost.restore();
        return done();
      });
    });
  });
});
