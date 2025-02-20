import React, { useState, useEffect } from 'react';
import './espmodal.module.css';
import styles from "../navBar/navbar.module.css";

/**
 * Flash Firmware Navigation Button
 * Navigates to the Serial Communication page when clicked.
 */
export const FlashFirmwareButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Check if the Web Serial API is supported
        setIsSupported(!!navigator.serial);
    }, []);

    return (
        <div>
            <button
                onClick={() => setIsOpen(true)}
                className={styles.flashButton}
            >
                Flash Firmware
            </button>

            {isOpen && (
                <div>
                    <div >
                        <button
                            onClick={() => setIsOpen(false)}
                        >
                            ✖
                        </button>
                        <h1>ESP Web Tools</h1>
                        {isSupported ? (
                            <>
                                <script
                                    type="module"
                                    src="https://unpkg.com/esp-web-tools@7.3.1/dist/web/install-button.js?module"
                                ></script>
                                <esp-web-install-button
                                    id="installButton"
                                    manifest="webflash/manifest.json"
                                ></esp-web-install-button>
                                <p>NOTE: Make sure to close anything using your device's COM port (e.g., Serial Monitor).</p>
                            </>
                        ) : (
                            <p>Your browser does not support the Web Serial API. Try using Chrome.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
