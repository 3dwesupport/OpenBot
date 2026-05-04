'use strict';

const registry = require('../services/clientRegistry');
const logger   = require('../utils/logger');

async function handleMessage(clientId, message) {
    const { type, payload, requestId } = message;

    switch (type) {
        case 'room:join': {
            const { room } = payload || {};
            if (!room) return sendError(clientId, 'room:join requires { room }', requestId);
            registry.joinRoom(clientId, room);
            send(clientId, { type: 'room:joined', room, requestId });
            registry.broadcastToRoom(room, { type: 'room:member_joined', room, clientId }, clientId);
            break;
        }
        case 'room:leave': {
            const { room } = payload || {};
            if (!room) return sendError(clientId, 'room:leave requires { room }', requestId);
            registry.leaveRoom(clientId, room);
            send(clientId, { type: 'room:left', room, requestId });
            registry.broadcastToRoom(room, { type: 'room:member_left', room, clientId }, clientId);
            break;
        }
        case 'room:message': {
            const { room, data } = payload || {};
            if (!room) return sendError(clientId, 'room:message requires { room, data }', requestId);
            const count = registry.broadcastToRoom(room, { type: 'room:message', room, data, from: clientId }, clientId);
            send(clientId, { type: 'room:message:sent', room, recipients: count, requestId });
            break;
        }
        case 'ping':
            send(clientId, { type: 'pong', ts: Date.now(), requestId });
            break;
        case 'echo':
            send(clientId, { type: 'echo:reply', payload, requestId });
            break;
        case 'stats':
            send(clientId, { type: 'stats:reply', data: registry.stats(), requestId });
            break;
        default:
            logger.warn('Unknown WS message type', { clientId, type });
            sendError(clientId, `Unknown message type: ${type}`, requestId, 'UNKNOWN_TYPE');
    }
}

function send(clientId, data) {
    const record = registry.get(clientId);
    if (record && record.ws.readyState === 1) record.ws.send(JSON.stringify(data));
}

function sendError(clientId, message, requestId, code = 'BAD_REQUEST') {
    send(clientId, { type: 'error', code, message, requestId });
}

module.exports = { handleMessage };