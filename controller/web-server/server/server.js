import { RealtimeClient } from "@openai/realtime-api-beta";
import WebSocket from 'ws';
import dotenv from 'dotenv';
dotenv.config();

// Set up WebSocket server
const wss = new WebSocket.Server({ port: 8080 }, () => {
    console.log("Signaling server is now listening on port 8080");
});

let rooms = new Map();

// Initialize OpenAI Realtime API Client
const realtimeClient = new RealtimeClient({ apiKey: process.env.OPENAI_API_KEY });
console.log("Realtime client initialized");

// This stores the conversation history per user
let conversationHistory = {};

(async () => {
    await realtimeClient.connect();
    realtimeClient.updateSession({
        instructions: 'You are a helpful assistant.',
        voice: 'alloy',
        turn_detection: { type:'server_vad' },
        input_audio_transcription: { model: 'whisper-1' },
    });

    console.log("Connected to OpenAI Realtime API");
})();

wss.on('connection', (ws) => {
    console.log(`Client connected. Total connected clients: ${wss.clients.size}`);
    askIdOfClient(ws);

    ws.on('message', async (data, isBinary) => {
        const message = isBinary ? data : data.toString();
        let msg;

        try {
            msg = JSON.parse(message);
        } catch (err) {
            console.error("Failed to parse message:", err);
            return;
        }

        if (msg.type === 'audio') {
            // Handle incoming audio
            const audioBuffer = Buffer.from(msg.audio, 'base64');
            try {
                // Store conversation history for the user (per roomId or per session)
                const roomId = msg.roomId || 'defaultRoom'; // Assign default room if none exists
                if (!conversationHistory[roomId]) {
                    conversationHistory[roomId] = [];  // Initialize history if not exists
                }

                // Add the user's audio input to the conversation history
                conversationHistory[roomId].push({ role: 'user', content: audioBuffer });

                // Send audio to OpenAI Realtime API
                realtimeClient.sendUserMessageContent([{ type: 'input_audio', audio: audioBuffer }]);

                // Listen for API responses
                realtimeClient.on('conversation.updated', (event) => {
                    console.log('Received event:', event); // Log the entire event object

                    if (event.item && event.item.formatted && event.item.formatted.transcript) {
                        const transcript = event.item.formatted.transcript;
                        console.log('Transcript from OpenAI:', transcript);

                        // Add the assistant's response to the conversation history
                        conversationHistory[roomId].push({ role: 'assistant', content: transcript });

                        // Send response back to the client
                        ws.send(JSON.stringify({ type: 'response', text: transcript }));
                    } else {
                        console.error("Event does not have valid transcript data:", event);
                        ws.send(JSON.stringify({ type: 'response', text: "No valid response from OpenAI." }));
                    }
                });
            } catch (error) {
                console.error("Error processing audio message:", error);
            }
            return;
        }

        if (msg.roomId === undefined) {
            sendToBot(ws, message);
            return;
        }

    });

    ws.onclose = () => {
        console.log(`Client disconnected. Total connected clients: ${wss.clients.size}`);
        let room = rooms.get(ws.id);
        if (room === undefined) {
            return;
        }
        room.clients[0]?.close();
        room.clients[1]?.close();
        rooms.delete(ws.id);
        console.log(rooms);
    };
});

// Function to ask for client's roomId
const askIdOfClient = (ws) => {
    let request = { roomId: "request-roomId" };
    ws.send(JSON.stringify(request));
};

const createOrJoinRoom = (roomId, ws) => {
    if (!rooms.has(roomId) || rooms.get(roomId).clients[1] !== null) {
        let room = { clients: [ws, null] };
        rooms.set(roomId, room);
    } else {
        let room = rooms.get(roomId);
        room.clients[1] = ws;
        rooms.set(roomId, room);
    }
};

const broadcastToRoom = (room, message) => {
    room.clients.forEach((client) => {
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

const sendToBot = (ws, message) => {
    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};
