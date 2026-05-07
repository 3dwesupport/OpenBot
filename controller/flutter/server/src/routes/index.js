'use strict';

const router = require('express').Router();

const healthRouter = require('./health');
const messagesRouter = require('./messages');

router.use('/', healthRouter);
router.use('/api/messages', messagesRouter);

module.exports = router;
