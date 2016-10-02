'use strict';

const server = require('./lib/server');

return server.start()
.then(() => {
  server.server.logger.info('Server up and running at: ' + server.info.uri);
})
.catch((err) => {
  server.server.logger.error(err.stack);
});
