import WebSocket from 'ws';
import { Buffer } from 'buffer';
import { RealtimeClient } from '@openai/realtime-api-beta';

// Initialize the Realtime API client
const realtimeClient = new RealtimeClient({ apiKey: process.env.OPENAI_API_KEY });

await realtimeClient.connect();

// Configure session settings
realtimeClient.updateSession({
    instructions: 'You are an engaging conversational AI.',
    voice: 'alloy',
    turn_detection: { type: 'server_vad' },
    input_audio_transcription: { model: 'whisper-1' },
});
