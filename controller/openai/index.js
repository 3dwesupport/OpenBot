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

// Track connected WebSocket clients with their clientId
const clients = new Map();

// Event handler for conversation updates
client.on('conversation.updated', (event) => {
    const { item } = event;

    // Extract transcript if available
    if (item?.formatted?.transcript) {
        const transcript = item.formatted.transcript;
        console.log('Received transcript:', transcript);

        // Broadcast the transcript to the correct WebSocket client based on clientId
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

    // Expect the client to send its unique clientId as part of the connection process
    let clientId = null;

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

        // Set the clientId if not already set
        if (message.clientId && !clientId) {
            clientId = message.clientId;
            console.log(`Client connected with clientId: ${clientId}`);
            // Store the WebSocket connection and associated clientId
            clients.set(ws, { clientId });
        }

        // Ensure the message contains clientId and matches the stored clientId
        if (message.clientId !== clientId) {
            return ws.send(JSON.stringify({ error: 'Invalid clientId' }));
        }

        // Log the clientId with the message
        console.log(`Message from clientId ${clientId}: ${message.text || '[no text provided]'}`);

        // Forward the message to the OpenAI Realtime API
        if (message.text) {
            try {
                client.sendUserMessageContent([{ type: 'input_text', text: message.text }]);
                ws.send(JSON.stringify({ success: true, message: 'Message sent to AI' }));
            } catch (error) {
                console.error(`Error sending message from clientId ${clientId}:`, error);
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
