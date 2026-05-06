'use strict';

const http = require('http');

const config  = require('./config');
const logger  = require('./utils/logger');
const { createApp }             = require('./app');
const { createWebSocketServer } = require('./websocket/wsServer');

async function bootstrap() {
    const app        = createApp();
    const httpServer = http.createServer(app);
    const wss        = createWebSocketServer(httpServer);

    await new Promise((resolve, reject) => {
        httpServer.listen(config.server.port, config.server.host, resolve);
        httpServer.once('error', reject);
    });

    logger.info('Server listening', {
        url: `http://${config.server.host}:${config.server.port}`,
        ws:  `ws://${config.server.host}:${config.server.port}/ws/realtime`,
        env: config.env,
    });

    const shutdown = (signal) => {
        logger.info(`${signal} received – shutting down gracefully`);
        httpServer.close(() => logger.info('HTTP server closed'));
        if (wss.clients) wss.clients.forEach((ws) => ws.terminate());
        wss.close(() => {
            logger.info('WebSocket server closed');
            process.exit(0);
        });
        setTimeout(() => { logger.error('Forced exit'); process.exit(1); }, 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) =>
        logger.error('Unhandled rejection', { reason: String(reason) })
    );
    process.on('uncaughtException', (err) => {
        logger.error('Uncaught exception', { message: err.message, stack: err.stack });
        process.exit(1);
    });
}

bootstrap().catch((err) => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
});