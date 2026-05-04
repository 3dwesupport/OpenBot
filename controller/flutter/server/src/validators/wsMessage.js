'use strict';

const Joi = require('joi');

const wsMessageSchema = Joi.object({
    type: Joi.string().max(64).required(),
    payload: Joi.any().default(null),
    requestId: Joi.string().uuid().optional(),
});

const wsAuthSchema = Joi.object({
    type: Joi.string().valid('auth').required(),
    token: Joi.string().min(1).max(512).required(),
});

function validateWsMessage(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { error: 'Invalid JSON' };
    }
    return wsMessageSchema.validate(parsed, { abortEarly: false, stripUnknown: true });
}

function validateWsAuth(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { error: 'Invalid JSON' };
    }
    return wsAuthSchema.validate(parsed, { abortEarly: false });
}

module.exports = { validateWsMessage, validateWsAuth };