'use strict';

const http = require('http');

const config  = require('./config');
const logger  = require('./utils/logger');
const { createApp }             = require('./app');
const { setupWebSocketServer } = require('./websocket/wsServer');

const app = createApp();
const httpServer = http.createServer(app);
// Realtime voice: /ws/realtime (see websocket/wsServer.js)
setupWebSocketServer(httpServer);

httpServer.once('error', (err) => {
    logger.error('Server startup failed', { message: err.message, stack: err.stack });
    process.exit(1);
});

httpServer.listen(config.server.port, config.server.host, () => {
    logger.info('Server listening', {
        url: `http://${config.server.host}:${config.server.port}`,
        ws:  `ws://${config.server.host}:${config.server.port}/ws/realtime`,
        env: config.env,
    });
});

process.on('unhandledRejection', (reason) =>
    logger.error('Unhandled rejection', { reason: String(reason) })
);
process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { message: err.message, stack: err.stack });
    process.exit(1);
});