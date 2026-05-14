'use strict';

const { INSTRUCTIONS } = require('./instructions');

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
                name: 'camera',
                description: 'Switch between front and rear camera.',
                parameters: { type: 'object', properties: {} },
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
                                    action:  { type: 'string', enum: ['drive', 'stop', 'indicator'] },
                                    r:       { type: 'number', description: 'Right motor -1.0 to 1.0' },
                                    l:       { type: 'number', description: 'Left motor -1.0 to 1.0' },
                                    multiplier: { type: 'string', enum: ['S', 'M', 'F'] },
                                    side:    { type: 'string', enum: ['left', 'right', 'stop'] },
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
