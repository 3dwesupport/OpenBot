'use strict';

require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',

    server: {
        port: parseInt(process.env.PORT, 10) || 8000,
        host: process.env.HOST || '0.0.0.0',
    },

    security: {
        corsOrigins: process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
            : ['http://localhost:8000'],
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

    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        connectTimeoutMs: parseInt(process.env.OPENAI_CONNECT_TIMEOUT_MS, 10) || 15_000,
        maxPendingAudioChunks: parseInt(process.env.MAX_PENDING_AUDIO_CHUNKS, 10) || 200,
        maxPendingAudioBytes: parseInt(process.env.MAX_PENDING_AUDIO_BYTES, 10) || 2_000_000,
    },
};

module.exports = config;
