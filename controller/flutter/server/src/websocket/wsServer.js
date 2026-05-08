'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const config = require('../config');
const { SESSION_CONFIG } = require('../config/sessionConfig');

const OPENAI_WS_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview';

function createWebSocketServer(httpServer) {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws/realtime' });

    wss.on('connection', (clientWs, req) => {
        const clientId = uuidv4();
        logger.info('Flutter client connected', { clientId, ip: req.socket.remoteAddress });
        console.log(`[WS] Client connected: ${clientId} (${req.socket.remoteAddress})`);

        if (!config.openai.apiKey) {
            logger.error('OPENAI_API_KEY not set — closing client');
            clientWs.close(1011, 'Server not configured');
            return;
        }

        const openaiWs = new WebSocket(OPENAI_WS_URL, {
            headers: {
                'Authorization': `Bearer ${config.openai.apiKey}`,
                'OpenAI-Beta': 'realtime=v1',
            },
        });

        let openaiReady = false;
        const pendingAudio = [];

        // Tracks all active tool calls by call_id so parallel calls (e.g. drive + indicator)
        // are handled independently without overwriting each other.
        // Structure: { [call_id]: { name: string, args: string } }
        const pendingCalls = {};

        function sendToFlutter(obj) {
            if (clientWs.readyState === WebSocket.OPEN)
                clientWs.send(JSON.stringify(obj));
        }

        // Flutter → Server: receives audio chunks and commit signals
        clientWs.on('message', (raw) => {
            console.log(`[WS] Data from client ${clientId}: ${raw.toString().slice(0, 300)}`);
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }

            if (msg.type === 'audio') {
                const openaiMsg = JSON.stringify({ type: 'input_audio_buffer.append', audio: msg.data });
                if (openaiReady) openaiWs.send(openaiMsg);
                else pendingAudio.push(openaiMsg);  // buffer until OpenAI connection is ready
            } else if (msg.type === 'commit') {
                openaiWs.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
                openaiWs.send(JSON.stringify({ type: 'response.create' }));
            }
        });

        // Server → OpenAI: send session config once connected, flush any buffered audio
        openaiWs.on('open', () => {
            openaiReady = true;
            logger.info('OpenAI upstream connected', { clientId });
            console.log(`[WS] OpenAI upstream connected for client: ${clientId}`);
            openaiWs.send(JSON.stringify(SESSION_CONFIG));
            for (const msg of pendingAudio) openaiWs.send(msg);
            pendingAudio.length = 0;
        });

        // OpenAI → Server: process tool call events, forward robot commands to Flutter
        openaiWs.on('message', (raw) => {
            let event;
            try { event = JSON.parse(raw); } catch { return; }
            const type = event.type || '';
            console.log(`[OpenAI →] ${type}`, JSON.stringify(event).slice(0, 300));

            switch (type) {
                // Step 1 — OpenAI starts a new tool call, register it by call_id
                case 'response.output_item.added':
                    if (event.item?.type === 'function_call') {
                        const callId = event.item.call_id || '';
                        if (callId) pendingCalls[callId] = { name: event.item.name || '', args: '' };
                    }
                    break;

                // Step 2 — arguments arrive as a stream of deltas, accumulate them
                case 'response.function_call_arguments.delta': {
                    const callId = event.call_id || '';
                    if (pendingCalls[callId]) pendingCalls[callId].args += event.delta || '';
                    break;
                }

                // Step 3 — all arguments received, parse and dispatch to Flutter
                case 'response.function_call_arguments.done': {
                    const callId = event.call_id || '';
                    const call = pendingCalls[callId];
                    if (call) {
                        let args = {};
                        try { args = call.args ? JSON.parse(call.args) : {}; } catch {}
                        logger.info('Robot command', { clientId, fn: call.name, args });
                        sendToFlutter({ type: 'robot_command', action: call.name, ...args });
                        // Acknowledge tool execution so OpenAI is ready for the next command
                        openaiWs.send(JSON.stringify({
                            type: 'conversation.item.create',
                            item: { type: 'function_call_output', call_id: callId, output: 'ok' },
                        }));
                        delete pendingCalls[callId];
                    }
                    break;
                }

                // OpenAI finished its full response → tell Flutter to return to listening
                case 'response.done':
                    sendToFlutter({ type: 'response_done' });
                    break;

                case 'error':
                    logger.error('OpenAI error event', { clientId, error: event.error });
                    break;
            }
        });

        openaiWs.on('error', (err) => {
            logger.error('OpenAI WS error', { clientId, message: err.message });
            if (clientWs.readyState === WebSocket.OPEN) clientWs.close(1011, 'Upstream error');
        });

        openaiWs.on('close', (code) => {
            logger.info('OpenAI upstream closed', { clientId, code });
            console.log(`[WS] OpenAI upstream disconnected for client ${clientId}. code=${code}`);
            if (clientWs.readyState === WebSocket.OPEN) clientWs.close(code);
        });

        clientWs.on('close', (code) => {
            logger.info('Flutter client disconnected', { clientId, code });
            console.log(`[WS] Client disconnected: ${clientId}. code=${code}`);
            if (openaiWs.readyState !== WebSocket.CLOSED) openaiWs.terminate();
        });

        clientWs.on('error', (err) => {
            logger.error('Flutter client WS error', { clientId, message: err.message });
            if (openaiWs.readyState !== WebSocket.CLOSED) openaiWs.terminate();
        });
    });

    logger.info('WebSocket server listening on /ws/realtime');
    return wss;
}

function setupWebSocketServer(httpServer) {
    const wss = createWebSocketServer(httpServer);

    const shutdown = (signal) => {
        logger.info(`${signal} received – shutting down gracefully`);
        httpServer.close(() => logger.info('HTTP server closed'));
        if (wss.clients) wss.clients.forEach((ws) => ws.terminate());
        wss.close(() => {
            logger.info('WebSocket server closed');
            process.exit(0);
        });
        setTimeout(() => { logger.error('Forced exit'); process.exit(1); }, 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    return wss;
}

module.exports = { createWebSocketServer, setupWebSocketServer };
