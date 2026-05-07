'use strict';

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');

const config          = require('./config');
const requestLogger   = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

function createApp() {
    const app = express();

    app.set('trust proxy', 1);

    app.use(helmet());

    // app.use(cors({
    //     origin:         config.security.corsOrigins,
    //     methods:        ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    //     allowedHeaders: ['Content-Type', 'Authorization'],
    //     credentials:    true,
    // }));

    app.use(compression());
    app.use(express.json({ limit: '512kb' }));
    app.use(express.urlencoded({ extended: true, limit: '512kb' }));
    app.use(requestLogger);

    app.use(rateLimit({
        windowMs:       config.security.rateLimitWindowMs,
        max:            config.security.rateLimitMax,
        standardHeaders: true,
        legacyHeaders:  false,
        message: { status: 'error', code: 'RATE_LIMITED', message: 'Too many requests' },
    }));

    app.use(routes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}

module.exports = { createApp };