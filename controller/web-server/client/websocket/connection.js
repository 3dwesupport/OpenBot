/*
 * Developed for the OpenBot project (https://openbot.org) by:
 *
 * Ivo Zivkov
 * izivkov@gmail.com
 *
 * Date: Mon Nov 29 2021
 */

import { ErrorDisplay } from '../utils/error-display.js';

/**
 * function to connect websocket to remote server
 * @constructor
 */
export function Connection() {
    const connectToServer = async () => {
        const ws = new WebSocket(`ws://${window.location.hostname}:8080/ws`);
        // const ws = new WebSocket(`ws://verdant-imported-peanut.glitch.me`);
        return new Promise((resolve, reject) => {
            const timer = setInterval(() => {
                if (ws.readyState === 1) {
                    clearInterval(timer);
                    resolve(ws);
                }
            }, 10);
        });
    };

    const sendToBot = (message) => {
        this.send(message);
    };

    let recorder;
    let audioChunks = [];

    // Start recording when the mic button is pressed
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (event) => audioChunks.push(event.data);
            recorder.start();
            console.log('Recording started');
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    // Stop recording and send audio to server
    const stopRecording = () => {
        if (recorder) {
            recorder.stop();
            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const arrayBuffer = await audioBlob.arrayBuffer();
                const base64Audio = btoa(
                    String.fromCharCode(...new Uint8Array(arrayBuffer))
                ); // Convert to Base64

                // Send audio data to the server
                this.send(JSON.stringify({ type: 'audio', audio: base64Audio }));
                console.log('Audio sent to server');

                audioChunks = []; // Clear audio chunks for next recording
            };
        }
    };

    this.start = async (onData) => {
        let ws = await connectToServer();
        this.send = (data) => {
            if (ws) {
                console.log('Sending to server:', data);
                ws.send(data);
            }
        };
        const errDisplay = new ErrorDisplay();
        let idSent = false;

        ws.onmessage = (webSocketMessage) => {
            const msg = JSON.parse(webSocketMessage.data);
            if (Object.keys(msg)[0] === 'roomId' && !idSent) {
                idSent = true;
            } else {
                console.log(webSocketMessage.data);
                console.log('Data Displayed');
                onData(webSocketMessage.data);
            }
        };

        ws.onclose = () => {
            errDisplay.set('Disconnected from the server. To reconnect, reload this page.');
            idSent = false;
        };

        ws.onopen = () => {
            errDisplay.reset();
            idSent = false;
        };

        this.stop = () => {
            if (ws != null) {
                ws.close();
                ws = null;
            }
        };
    };

    // Attach event listeners for the microphone button
    const micButton = document.getElementById('microphone');
    if (micButton) {
        micButton.addEventListener('mousedown', startRecording);
        micButton.addEventListener('mouseup', stopRecording);
    }
}
