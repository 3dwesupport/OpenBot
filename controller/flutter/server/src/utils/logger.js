'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const { combine, timestamp, errors, json, colorize, printf } = format;

fs.mkdirSync(config.logging.dir, { recursive: true });

const devFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}] ${stack || message}${metaStr}`;
    })
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const logger = createLogger({
    level: config.logging.level,
    format: config.isProduction ? prodFormat : devFormat,
    defaultMeta: { service: 'ws-server', env: config.env },
    transports: [
        new transports.Console(),
        new transports.File({
            filename: path.join(config.logging.dir, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5,
        }),
        new transports.File({
            filename: path.join(config.logging.dir, 'combined.log'),
            maxsize: 20 * 1024 * 1024,
            maxFiles: 10,
        }),
    ],
    exitOnError: false,
});

module.exports = logger;