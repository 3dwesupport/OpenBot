'use strict';

const router    = require('express').Router();
const registry  = require('../services/clientRegistry');
const startedAt = new Date();

router.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        name: 'production-ws-server',
        version: '1.0.0',
        uptime: process.uptime(),
        endpoints: {
            health:    'GET /health',
            ready:     'GET /ready',
        },
    });
});

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

router.get('/ready', (_req, res) => {
    res.json({ status: 'ready' });
});

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

module.exports = router;