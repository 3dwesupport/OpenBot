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
    const startSerialCommunication = () => {
        console.log("Serial Communication Started");
        // Implement the Web Serial API logic here
    };

    return (
        <button className={styles.serialButton} onClick={startSerialCommunication}>
            Start Serial Communication
        </button>
    );
}
