'use strict';

// Liveness / readiness for deploy (Render, etc.) — no auth
const router = require('express').Router();

router.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        name: 'production-ws-server',
        version: '1.0.0',
        uptime: process.uptime(),
        endpoints: {
            health: 'GET /health',
            ready: 'GET /ready',
        },
    });
});

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

router.get('/ready', (_req, res) => {
    res.json({ status: 'ready' });
});

module.exports = router;
