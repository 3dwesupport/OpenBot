import React, { useState } from "react";
import styles from "./serialButton.module.css";

/**
 * Serial Communication Button Component
 * Allows the user to upload a firmware file (.ino, .cpp, or .bin) and flash it to the ESP32.
 * @returns {JSX.Element}
 */
export function SerialCommunicationButton() {
    const [file, setFile] = useState(null);
    const [port, setPort] = useState(null);
    const [status, setStatus] = useState("");

    // Handle file selection
    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile && (selectedFile.name.endsWith(".ino") || selectedFile.name.endsWith(".cpp") || selectedFile.name.endsWith(".bin"))) {
            setFile(selectedFile);
        } else {
            alert("Only .ino, .cpp, and .bin files are allowed!");
        }
    };

    // Connect to the serial port
    const connectToSerial = async () => {
        if (!navigator.serial) {
            console.error("Web Serial API is not supported in this browser.");
            setStatus("Web Serial API not supported");
            return;
        }

        try {
            const serialPort = await navigator.serial.requestPort();
            await serialPort.open({ baudRate: 115200 });
            setPort(serialPort);
            setStatus("Connected to ESP32");
        } catch (error) {
            console.error("Failed to connect to the serial port:", error);
            setStatus("Connection failed!");
        }
    };

    const flashFirmware = async () => {
        if (!file) {
            setStatus("Please select a file");
            return;
        }

        if (port) {
            try {
                await port.close();
                setPort(null);
                console.log("Serial port closed to allow flashing.");
            } catch (error) {
                console.error("Failed to close the serial port:", error);
            }
        }

        const formData = new FormData();
        formData.append("firmware", file);

        setStatus("Flashing...");

        try {
            const response = await fetch("http://localhost:8000/flash", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            setStatus(data.error ? `Error: ${data.error}` : "Flashing Complete! 🎉");
        } catch (error) {
            console.error("Flashing failed:", error);
            setStatus("Flashing failed!");
        }
    };

    return (
        <div className={styles.container}>
            <input type="file" accept=".ino,.cpp,.bin" onChange={handleFileChange} className={styles.fileInput} />
            <button className={styles.serialButton} onClick={connectToSerial}>
                Connect to ESP32
            </button>
            <button className={styles.flashButton} onClick={flashFirmware} disabled={!file}>
                Flash Firmware
            </button>
            <p className={styles.status}>{status}</p>
        </div>
    );
}
