'use strict';

require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',

    server: {
        port: parseInt(process.env.PORT, 10) || 8080,
        host: process.env.HOST || '0.0.0.0',
    },

    security: {
        corsOrigins: process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
            : ['http://localhost:3000'],
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000,
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    },

    websocket: {
        heartbeatIntervalMs: parseInt(process.env.WS_HEARTBEAT_INTERVAL_MS, 10) || 30_000,
        maxPayloadBytes: parseInt(process.env.WS_MAX_PAYLOAD_BYTES, 10) || 65_536,
        authTimeoutMs: parseInt(process.env.WS_AUTH_TIMEOUT_MS, 10) || 5_000,
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        dir: process.env.LOG_DIR || './logs',
    },
};

module.exports = config;