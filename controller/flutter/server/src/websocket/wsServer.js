'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const config = require('../config');
const { parseClientMessage, forwardClientMessage } = require('./clientRealtimeConnection');
const { attachOpenaiRealtime } = require('./openaiRealtimeConnection');

/**
 * Creates the websocket server.
 */
function createWebSocketServer(httpServer) {
    const wss = new WebSocketServer({
        server: httpServer,
        path: '/ws/realtime',
        maxPayload: config.websocket.maxPayloadBytes,
    });

    wss.on('connection', (clientWs, req) => {
        const clientId = uuidv4();
        logger.info('Realtime client connected', { clientId, ip: req.socket.remoteAddress });

        if (!config.openai.apiKey) {
            logger.error('OPENAI_API_KEY not set — closing client', { clientId });
            clientWs.close(1011, 'Server not configured');
            return;
        }

        const pendingAudio = [];

        const ctx = {
            clientId,
            clientWs,
            openaiReady: false,
            pendingAudio,
            sendToClient(obj) {
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify(obj));
                }
            },
            config,
        };

        const openaiWs = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-realtime-mini", {
            headers: { Authorization: `Bearer ${config.openai.apiKey}` },
        });

        // Fail the session if OpenAI never connects (see OPENAI_CONNECT_TIMEOUT_MS)
        const connectTimeout = setTimeout(() => {
            if (!ctx.openaiReady) {
                logger.error('OpenAI connect timeout', { clientId });
                ctx.sendToClient({
                    type: 'error',
                    code: 'OPENAI_CONNECT_TIMEOUT',
                    message: 'OpenAI connection timed out',
                });
                openaiWs.terminate();
                if (clientWs.readyState === WebSocket.OPEN) clientWs.close(1011, 'Upstream timeout');
            }
        }, config.openai.connectTimeoutMs);
        connectTimeout.unref();

        attachOpenaiRealtime(openaiWs, ctx);

        openaiWs.on('open', () => clearTimeout(connectTimeout));

        clientWs.on('message', (raw) => {
            const parsed = parseClientMessage(raw);
            if (!parsed.ok) {
                logger.debug('Ignored invalid client message', { clientId, reason: parsed.reason });
                return;
            }
            forwardClientMessage(parsed.msg, { ...ctx, openaiWs });
        });

        clientWs.on('close', (code) => {
            logger.info('Realtime client disconnected', { clientId, code });
            clearTimeout(connectTimeout);
            if (openaiWs.readyState !== WebSocket.CLOSED) openaiWs.terminate();
        });

        clientWs.on('error', (err) => {
            logger.error('Realtime client WS error', { clientId, message: err.message });
            clearTimeout(connectTimeout);
            if (openaiWs.readyState !== WebSocket.CLOSED) openaiWs.terminate();
        });
    });

    logger.info('WebSocket server listening on /ws/realtime');
    return wss;
}

/**
 * Attaches WebSocket server and registers graceful shutdown (SIGTERM / SIGINT).
 */
function setupWebSocketServer(httpServer) {
    const wss = createWebSocketServer(httpServer);

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
    process.on('SIGINT', () => shutdown('SIGINT'));

    return wss;
}

module.exports = { createWebSocketServer, setupWebSocketServer };
