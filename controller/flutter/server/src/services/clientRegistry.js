'use strict';

const logger = require('../utils/logger');

class ClientRegistry {
    constructor() {
        this._clients = new Map();
        this._rooms   = new Map();
    }

    add(clientId, ws, userId = null) {
        const record = {
            id: clientId, ws, userId,
            rooms: new Set(),
            connectedAt: new Date(),
            lastPing: Date.now(),
        };
        this._clients.set(clientId, record);
        logger.info('Client connected', { clientId, userId, total: this._clients.size });
        return record;
    }

    remove(clientId) {
        const record = this._clients.get(clientId);
        if (!record) return;
        record.rooms.forEach((room) => this._leaveRoom(clientId, room));
        this._clients.delete(clientId);
        logger.info('Client disconnected', { clientId, total: this._clients.size });
    }

    get(clientId)         { return this._clients.get(clientId) || null; }
    updatePing(clientId)  { const r = this._clients.get(clientId); if (r) r.lastPing = Date.now(); }
    setUserId(clientId, userId) { const r = this._clients.get(clientId); if (r) r.userId = userId; }

    joinRoom(clientId, room) {
        const record = this._clients.get(clientId);
        if (!record) return false;
        if (!this._rooms.has(room)) this._rooms.set(room, new Set());
        this._rooms.get(room).add(clientId);
        record.rooms.add(room);
        logger.debug('Client joined room', { clientId, room });
        return true;
    }

    leaveRoom(clientId, room) { return this._leaveRoom(clientId, room); }

    _leaveRoom(clientId, room) {
        const roomSet = this._rooms.get(room);
        if (roomSet) {
            roomSet.delete(clientId);
            if (roomSet.size === 0) this._rooms.delete(room);
        }
        const record = this._clients.get(clientId);
        if (record) record.rooms.delete(room);
        return true;
    }

    broadcastToRoom(room, message, excludeClientId = null) {
        const roomSet = this._rooms.get(room);
        if (!roomSet) return 0;
        let sent = 0;
        const payload = JSON.stringify(message);
        roomSet.forEach((clientId) => {
            if (clientId === excludeClientId) return;
            const record = this._clients.get(clientId);
            if (record && record.ws.readyState === 1) { record.ws.send(payload); sent++; }
        });
        return sent;
    }

    broadcastAll(message, excludeClientId = null) {
        const payload = JSON.stringify(message);
        let sent = 0;
        this._clients.forEach((record, clientId) => {
            if (clientId === excludeClientId) return;
            if (record.ws.readyState === 1) { record.ws.send(payload); sent++; }
        });
        return sent;
    }

    stats() {
        return {
            clients: this._clients.size,
            rooms:   this._rooms.size,
            roomList: [...this._rooms.entries()].map(([name, set]) => ({ name, members: set.size })),
        };
    }
}

module.exports = new ClientRegistry();