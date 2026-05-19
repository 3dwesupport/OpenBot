'use strict';

const { WebSocket } = require('ws');
const logger = require('../utils/logger');

/*
 * Validates JSON from the controller app.
 * Expected types: "audio" (base64 PCM) and "commit" (end of utterance).
 */
function parseClientMessage(raw) {
    let msg;
    try {
        msg = JSON.parse(raw);
    } catch {
        return { ok: false, reason: 'invalid_json' };
    }

    if (!msg || typeof msg.type !== 'string') {
        return { ok: false, reason: 'missing_type' };
    }

    if (msg.type === 'audio') {
        if (typeof msg.data !== 'string' || !msg.data.length) {
            return { ok: false, reason: 'invalid_audio' };
        }
    }

    return { ok: true, msg };
}

/*
 * Routes client messages to OpenAI Realtime.
 * audio  → input_audio_buffer.append (buffered until upstream is ready)
 * commit → input_audio_buffer.commit + response.create
 */
function forwardClientMessage(msg, ctx) {
    const { openaiWs, openaiReady, pendingAudio, sendToClient, config } = ctx;

    if (msg.type === 'audio') {
        const openaiMsg = JSON.stringify({ type: 'input_audio_buffer.append', audio: msg.data });
        const chunkBytes = Buffer.byteLength(openaiMsg, 'utf8');

        if (openaiReady && openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(openaiMsg);
            return;
        }

        // OpenAI still connecting — queue chunks with per-session limits
        const totalBytes = pendingAudio.reduce((n, m) => n + Buffer.byteLength(m, 'utf8'), 0) + chunkBytes;
        if (pendingAudio.length >= config.openai.maxPendingAudioChunks
            || totalBytes > config.openai.maxPendingAudioBytes) {
            logger.warn('Pending audio buffer full', {
                clientId: ctx.clientId,
                chunks: pendingAudio.length,
                totalBytes,
            });
            sendToClient({ type: 'error', code: 'AUDIO_BUFFER_FULL', message: 'Audio buffer full' });
            return;
        }

        pendingAudio.push(openaiMsg);
        return;
    }

    if (msg.type === 'clear') {
        if (openaiReady && openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
        }
        return;
    }

    if (msg.type === 'commit') {
        if (!openaiReady || openaiWs.readyState !== WebSocket.OPEN) {
            sendToClient({
                type: 'error',
                code: 'OPENAI_NOT_READY',
                message: 'OpenAI connection not ready',
            });
            return;
        }
        // Tell OpenAI to process buffered audio and start a model response
        openaiWs.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        openaiWs.send(JSON.stringify({ type: 'response.create' }));
    }
}

module.exports = { parseClientMessage, forwardClientMessage };
