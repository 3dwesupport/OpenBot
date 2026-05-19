'use strict';

const router = require('express').Router();
const healthRouter = require('./health');

// HTTP only; realtime voice uses WebSocket /ws/realtime

router.use('/', healthRouter);

module.exports = router;
