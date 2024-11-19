// client.js

let recorder;
let audioChunks = [];

// Connect to the WebSocket server
const socket = new WebSocket('ws://localhost:8082');

socket.onopen = () => {
    console.log('Connected to WebSocket server');
};

// Listen for conversation updates from the server
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.event === 'conversation.updated') {
        console.log('Conversation updated:', data.items);
        // Update the UI with new conversation items, e.g., display them in a chat window
    }
};

// Event listeners for the microphone button
const micButton = document.getElementById('microphone');
micButton.addEventListener('mousedown', startRecording);
micButton.addEventListener('mouseup', stopRecording);

// Start recording when the button is pressed
async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => audioChunks.push(event.data);
    recorder.start();
    console.log('Recording started');
}

// Stop recording and send audio to the server when the button is released
function stopRecording() {
    recorder.stop();
    recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = btoa(
            String.fromCharCode(...new Uint8Array(arrayBuffer))
        ); // Convert to Base64

        // Send audio data to the WebSocket server
        socket.send(JSON.stringify({ type: 'audio', audio: base64Audio }));
        console.log('Audio sent to server');

        audioChunks = []; // Clear chunks for the next recording
    };
}

// Handle any errors
socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};
socket.onclose = () => {
    console.log('Disconnected from WebSocket server');
};
