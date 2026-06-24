'use strict';

const { INSTRUCTIONS } = require('./instructions');

/* Sent to OpenAI on upstream connect — tools map to robot_command on the app */
const SESSION_CONFIG = {
    type: 'session.update',
    session: {
        type: 'realtime',
        instructions: INSTRUCTIONS,       // robot control prompt loaded from instructions.js
        output_modalities: ['text'],
        audio: {
            input: {
                format: { type: 'audio/pcm', rate: 24000 },
                transcription: { model: 'whisper-1' },
                turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 600,
                },
            },
        },
        tool_choice: 'required',          // model must always call a tool, never reply with text
        tools: [
            {
                type: 'function',
                name: 'drive',
                description: 'Move the OpenBot rover. r = right motor, l = left motor.',
                parameters: {
                    type: 'object',
                    properties: {
                        r:       { type: 'number', description: 'Right motor -1.0 to 1.0' },
                        l:       { type: 'number', description: 'Left motor -1.0 to 1.0' },
                        seconds: { type: 'number', description: 'Auto-stop after N seconds. Omit for continuous.' },
                        multiplier: {
                            type: 'string',
                            enum: ['S', 'M', 'F'],
                            description: 'Speed tier only: S=slow(128), M=medium(192), F=fast(255). Required every drive(). Use M when user does not mention speed.',
                        },
                    },
                    required: ['r', 'l', 'multiplier'],
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
                        side:    { type: 'string', enum: ['left', 'right', 'stop'] },
                        seconds: { type: 'number', description: 'Auto-stop indicator after N seconds. Omit for continuous.' },
                    },
                    required: ['side'],
                },
            },
            {
                type: 'function',
                name: 'lights',
                description: 'Control vehicle headlights (front/back LED brightness).',
                parameters: {
                    type: 'object',
                    properties: {
                        percent: {
                            type: 'number',
                            description: 'Brightness 0–100. Use 0 to turn off. Default 50 when user says on without a level.',
                        },
                        seconds: {
                            type: 'number',
                            description: 'Auto turn off after N seconds. Omit to leave on until changed.',
                        },
                    },
                    required: ['percent'],
                },
            },
            {
                type: 'function',
                name: 'camera',
                description: 'Switch between front and rear camera.',
                parameters: { type: 'object', properties: {} },
            },
            {
                type: 'function',
                name: 'perform',
                description: 'Whitelist-only: random*, zigzag, Mercedes G-turn (tank spin), draw letter L/I/T/O/P. NOT for plain turn/forward — use drive().',
                parameters: {
                    type: 'object',
                    properties: {
                        preset: {
                            type: 'string',
                            enum: ['movement', 'lights', 'indicators', 'movement_indicators', 'all', 'zigzag', 'g_turn', 'letter_L', 'letter_I', 'letter_T', 'letter_O', 'letter_P'],
                            description: 'g_turn=Mercedes tank spin in place (speech must say G turn); movement requires "random".',
                        },
                        duration: {
                            type: 'number',
                            description: 'Total seconds. Default 8 if user did not specify.',
                        },
                        multiplier: {
                            type: 'string',
                            enum: ['S', 'M', 'F'],
                            description: 'Speed for drive steps. Default M.',
                        },
                    },
                    required: ['preset'],
                },
            },
            {
                type: 'function',
                name: 'routine',
                description: 'Execute a multi-step timed sequence of robot commands.',
                parameters: {
                    type: 'object',
                    properties: {
                        steps: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    action:  { type: 'string', enum: ['drive', 'stop', 'indicator', 'lights'] },
                                    r:       { type: 'number', description: 'Right motor -1.0 to 1.0' },
                                    l:       { type: 'number', description: 'Left motor -1.0 to 1.0' },
                                    multiplier: { type: 'string', enum: ['S', 'M', 'F'] },
                                    side:    { type: 'string', enum: ['left', 'right', 'stop'] },
                                    percent: { type: 'number', description: 'Headlight brightness 0–100' },
                                    seconds: { type: 'number' },
                                },
                                required: ['action'],
                            },
                        },
                    },
                    required: ['steps'],
                },
            },
        ],
    },
};

module.exports = { SESSION_CONFIG };
