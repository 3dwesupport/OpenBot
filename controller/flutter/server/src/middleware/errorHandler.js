'use strict';

const logger = require('../utils/logger');
const config = require('../config');

function notFoundHandler(req, res) {
    res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    const status = err.status || err.statusCode || 500;
    const isOperational = err.isOperational === true;

    logger.error('HTTP error', {
        status,
        method: req.method,
        url: req.originalUrl,
        message: err.message,
        stack: config.isProduction ? undefined : err.stack,
    });

    const message =
        config.isProduction && !isOperational ? 'Internal server error' : err.message;

    res.status(status).json({
        status: 'error',
        code: err.code || 'INTERNAL_ERROR',
        message,
        ...(config.isProduction ? {} : { stack: err.stack }),
    });
}

class AppError extends Error {
    constructor(message, statusCode = 500, code = 'APP_ERROR') {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = { notFoundHandler, errorHandler, AppError };