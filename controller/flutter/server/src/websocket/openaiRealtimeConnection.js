'use strict';

const { WebSocket } = require('ws');
const logger = require('../utils/logger');
const { SESSION_CONFIG } = require('../config/sessionConfig');

/**
 * Handling OpenAI realtime connection through websocket
 */
function attachOpenaiRealtime(openaiWs, ctx) {
    const { clientId, clientWs, pendingAudio, sendToClient } = ctx;
    // Parallel tool calls keyed by call_id (e.g. drive + indicator at once)
    const pendingCalls = {};

    openaiWs.on('open', () => {
        ctx.openaiReady = true;
        logger.info('OpenAI upstream connected', { clientId });
        openaiWs.send(JSON.stringify(SESSION_CONFIG));
        // Flush audio recorded before upstream finished connecting
        for (const msg of pendingAudio) openaiWs.send(msg);
        pendingAudio.length = 0;
    });

    openaiWs.on('message', (raw) => {
        let event;
        try {
            event = JSON.parse(raw);
        } catch {
            return;
        }

        const type = event.type || '';
        logger.debug('OpenAI event', { clientId, type });

        switch (type) {
            // Tool call started — register by call_id
            case 'response.output_item.added':
                if (event.item?.type === 'function_call') {
                    const callId = event.item.call_id || '';
                    if (callId) pendingCalls[callId] = { name: event.item.name || '', args: '' };
                }
                break;

            // Streamed JSON arguments for the tool
            case 'response.function_call_arguments.delta': {
                const callId = event.call_id || '';
                if (pendingCalls[callId]) pendingCalls[callId].args += event.delta || '';
                break;
            }

            // Full tool args ready — send robot_command to app, ack OpenAI
            case 'response.function_call_arguments.done': {
                const callId = event.call_id || '';
                const call = pendingCalls[callId];
                if (!call) break;

                let args = {};
                if (call.args) {
                    try {
                        args = JSON.parse(call.args);
                    } catch (err) {
                        logger.warn('Failed to parse tool arguments', {
                            clientId,
                            fn: call.name,
                            error: err.message,
                            raw: call.args.slice(0, 200),
                        });
                    }
                }

                logger.info('Robot command', { clientId, fn: call.name, args });
                sendToClient({ type: 'robot_command', action: call.name, ...args });

                // Required so OpenAI can accept the next tool call in the session
                openaiWs.send(JSON.stringify({
                    type: 'conversation.item.create',
                    item: { type: 'function_call_output', call_id: callId, output: 'ok' },
                }));
                delete pendingCalls[callId];
                break;
            }

            // Model finished — app returns mic to listening state
            case 'response.done':
                sendToClient({ type: 'response_done' });
                break;

            case 'error':
                logger.error('OpenAI error event', { clientId, error: event.error });
                break;

            default:
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
}

module.exports = { attachOpenaiRealtime };
