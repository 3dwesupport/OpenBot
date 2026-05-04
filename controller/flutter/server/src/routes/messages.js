'use strict';

const router   = require('express').Router();
const Joi      = require('joi');
const { validate }  = require('../middleware/validate');
const registry      = require('../services/clientRegistry');

const broadcastSchema = Joi.object({
    room: Joi.string().max(128).required(),
    data: Joi.any().required(),
});

// POST /api/messages/broadcast
router.post('/broadcast', validate(broadcastSchema), (req, res) => {
    const { room, data } = req.body;
    const count = registry.broadcastToRoom(room, { type: 'server:broadcast', room, data });
    res.json({ status: 'ok', recipients: count });
});

// GET /api/messages/rooms
router.get('/rooms', (_req, res) => {
    res.json({ status: 'ok', data: registry.stats().roomList });
});

module.exports = router;