import React from "react";
import styles from "./serialButton.module.css";

/**
 * Serial Communication Button Component
 * This component renders a button for initiating serial communication
 * @returns {JSX.Element}
 * @constructor
 */
export function SerialCommunicationButton() {
    // Function to handle serial communication
    const startSerialCommunication = async () => {
        if (!navigator.serial) {
            console.error("Web Serial API is not supported in this browser.");
            return;
        }

        try {
            const port = await navigator.serial.requestPort();
            await port.open({baudRate: 115200});

            console.log("Serial Port Connected Successfully!");
        } catch (error) {
            console.error("Failed to connect to the serial port:", error);
        }
    };

    return (
        <button className={styles.serialButton} onClick={startSerialCommunication}>
            Connect Serial Port
        </button>
    );
}
