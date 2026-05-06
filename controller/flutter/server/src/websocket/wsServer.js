'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const config = require('../config');

const OPENAI_WS_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';

const SESSION_CONFIG = {
    type: 'session.update',
    session: {
        modalities: ['text'],
        input_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 600,
        },
        tool_choice: 'required',
        tools: [
            {
                type: 'function',
                name: 'drive',
                description: 'Move the OpenBot rover. r = right motor, l = left motor.',
                parameters: {
                    type: 'object',
                    properties: {
                        r: { type: 'number', description: 'Right motor -1.0 to 1.0' },
                        l: { type: 'number', description: 'Left motor -1.0 to 1.0' },
                        seconds: { type: 'number', description: 'Auto-stop after N seconds. Omit for continuous.' },
                    },
                    required: ['r', 'l'],
                },
            },
            {
                type: 'function',
                name: 'stop',
                description: 'Stop the robot immediately.',
                parameters: { type: 'object', properties: {} },
            },
            {
                type: 'function',
                name: 'indicator',
                description: 'Control turn signal indicators.',
                parameters: {
                    type: 'object',
                    properties: {
                        side: { type: 'string', enum: ['left', 'right', 'stop'] },
                    },
                    required: ['side'],
                },
            },
            {
                type: 'function',
                name: 'camera',
                description: 'Switch between front and rear camera.',
                parameters: { type: 'object', properties: {} },
            },
        ],
    },
};

function createWebSocketServer(httpServer) {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws/realtime' });

    wss.on('connection', (clientWs, req) => {
        const clientId = uuidv4();
        logger.info('Flutter client connected', { clientId, ip: req.socket.remoteAddress });

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
        let pendingFnName = '';
        let pendingFnArgs = '';

        function sendToFlutter(obj) {
            if (clientWs.readyState === WebSocket.OPEN)
                clientWs.send(JSON.stringify(obj));
        }

        // Flutter → OpenAI: translate clean Flutter protocol to OpenAI format
        clientWs.on('message', (raw) => {
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }

            if (msg.type === 'audio') {
                const openaiMsg = JSON.stringify({ type: 'input_audio_buffer.append', audio: msg.data });
                if (openaiReady) openaiWs.send(openaiMsg);
                else pendingAudio.push(openaiMsg);
            } else if (msg.type === 'commit') {
                openaiWs.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
                openaiWs.send(JSON.stringify({ type: 'response.create' }));
            }
        });

        // OpenAI → process on backend, send only what Flutter needs
        openaiWs.on('open', () => {
            openaiReady = true;
            logger.info('OpenAI upstream connected', { clientId });
            openaiWs.send(JSON.stringify(SESSION_CONFIG));
            for (const msg of pendingAudio) openaiWs.send(msg);
            pendingAudio.length = 0;
        });

        openaiWs.on('message', (raw) => {
            let event;
            try { event = JSON.parse(raw); } catch { return; }
            const type = event.type || '';

            switch (type) {
                case 'response.output_item.added':
                    if (event.item?.type === 'function_call') {
                        pendingFnName = event.item.name || '';
                        pendingFnArgs = '';
                    }
                    break;

                case 'response.function_call_arguments.delta':
                    pendingFnArgs += event.delta || '';
                    break;

                case 'response.function_call_arguments.done':
                    if (pendingFnName) {
                        let args = {};
                        try { args = pendingFnArgs ? JSON.parse(pendingFnArgs) : {}; } catch {}
                        logger.info('Robot command', { clientId, fn: pendingFnName, args });
                        // Send a clean robot_command — no OpenAI internals exposed
                        sendToFlutter({ type: 'robot_command', action: pendingFnName, ...args });
                        pendingFnName = '';
                        pendingFnArgs = '';
                    }
                    break;

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
            if (clientWs.readyState === WebSocket.OPEN) clientWs.close(code);
        });

        clientWs.on('close', (code) => {
            logger.info('Flutter client disconnected', { clientId, code });
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

module.exports = { createWebSocketServer };
