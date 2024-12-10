import { RealtimeClient } from '@openai/realtime-api-beta';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import {Buffer}  from 'buffer';


dotenv.config();

const port = process.env.PORT || 8081;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
    console.error('OPENAI_API_KEY is not set in the environment variables.');
    process.exit(1);
}

// Initialize RealtimeClient
const client = new RealtimeClient({ apiKey: openaiApiKey });

// Update session configuration
client.updateSession({
    instructions: "You are a great, upbeat friend.",
    modalities: ["audio"], // Allow audio and text input
    voice: "alloy",
    turn_detection: { type: "none" },
    input_audio_transcription: { model: "whisper-1" },
    input_audio_format: "pcm", // OpenAI expects PCM format for audio
    output_audio_format: "mp3",
});

// Map to track connected WebSocket clients
const clients = new Map();

// Event handler for conversation updates
client.on('conversation.updated', (event) => {
    const { item } = event;
    console.log("Received message", item);

    // Extract transcript and broadcast it to the appropriate WebSocket client
    if (item?.formatted?.transcript) {
        const transcript = item.formatted.transcript;
        console.log('Received transcript:', transcript);

        clients.forEach((clientData, ws) => {
            if (ws.readyState === ws.OPEN && clientData.clientId === item.clientId) {
                ws.send(JSON.stringify({ type: 'transcript', transcript }));
            }
        });
    }
});

// Connect to the Realtime API
(async () => {
    try {
        await client.connect();
        console.log('Connected to OpenAI Realtime API');
    } catch (error) {
        console.error('Failed to connect to Realtime API:', error);
    }
})();

// Create a WebSocket server
const wss = new WebSocketServer({ port });

console.log(`WebSocket server is running on port ${port}`);

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    // Client's unique ID for routing messages
    let clientId = null;

    // Handle incoming messages from the WebSocket client
    ws.on('message', async (data) => {
        console.log('Received:', data);

        let message;
        try {
            message = JSON.parse(data);
        } catch (error) {
            console.error('Invalid JSON:', error);
            return ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
        }

        if (message.clientId && !clientId) {
            clientId = message.clientId;
            console.log(`Client connected with clientId: ${clientId}`);
            clients.set(ws, { clientId });
        }

        if (message.clientId !== clientId) {
            return ws.send(JSON.stringify({ error: 'Invalid clientId' }));
        }

        if (message.audio) {
            try {
                console.log("message audio::",message.audio);
                const audioBuffer = Buffer.from(message.audio, 'base64');
                console.log(`Audio received from clientId ${audioBuffer}`);

                client.sendUserMessageContent([
                    {
                        type: 'input_audio',
                        data: audioBuffer,
                    },
                ]);
                ws.send(JSON.stringify({ success: true, message: 'Audio sent to AI' }));
            } catch (error) {
                console.error(`Error sending audio from clientId ${clientId}:`, error);
                ws.send(JSON.stringify({ error: 'Failed to send audio to AI' }));
            }
        }
        else {
            ws.send(JSON.stringify({ error: 'Either text or audio is required' }));
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
        clients.delete(ws);
    });
});
