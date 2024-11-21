import { RealtimeClient } from '@openai/realtime-api-beta';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';

dotenv.config();

const port = process.env.PORT || 8081;
const openaiApiKey = process.env.OPENAI_API_KEY;

const client = new RealtimeClient({ apiKey: openaiApiKey });

// Configure the RealtimeClient session
client.updateSession({
    instructions: 'You are a great, upbeat friend.',
    voice: 'alloy',
    turn_detection: { type: 'none' },
    input_audio_transcription: { model: 'whisper-1' },
});

// Track connected WebSocket clients
const clients = new Set();

// Event handler for conversation updates
client.on('conversation.updated', (event) => {
    const { item } = event;

    console.log('Conversation updated:', item);

    // Extract transcript if available
    if (item?.formatted?.transcript) {
        const transcript = item.formatted.transcript;
        console.log('Received transcript:', transcript);

        // Broadcast the transcript to all connected WebSocket clients
        clients.forEach((ws) => {
            if (ws.readyState === ws.OPEN) {
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
    clients.add(ws);

    // Handle incoming messages from the WebSocket client
    ws.on('message', async (data) => {
        console.log('Received:', data);

        // Parse incoming data
        let message;
        try {
            message = JSON.parse(data);
        } catch (error) {
            console.error('Invalid JSON:', error);
            return ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
        }

        // Forward the message to the OpenAI Realtime API
        if (message.text) {
            try {
                client.sendUserMessageContent([{type: 'input_text', text: message.text}]);
                ws.send(JSON.stringify({ success: true, message: 'Message sent to AI' }));
            } catch (error) {
                console.error('Error sending message:', error);
                ws.send(JSON.stringify({ error: 'Failed to send message to AI' }));
            }
        } else {
            ws.send(JSON.stringify({ error: 'Message text is required' }));
        }
    });

    // Handle WebSocket close
    ws.on('close', () => {
        console.log('WebSocket connection closed');
        clients.delete(ws);
    });
});
