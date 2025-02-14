import React, { useState } from "react";
import styles from "./serialButton.module.css";

export function SerialCommunicationButton() {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile && selectedFile.name.endsWith(".uf2")) {
            setFile(selectedFile);
            setStatus(`Selected file: ${selectedFile.name}`);
        } else {
            alert("Only .uf2 files are allowed!");
            setFile(null);
            setStatus("Please select a valid .uf2 file.");
        }
    };

    const flashFirmware = async () => {
        if (!file) {
            setStatus("Please select a .uf2 file first.");
            return;
        }

        try {
            if (!window.showDirectoryPicker) {
                throw new Error("Directory Picker API is not supported in this browser.");
            }

            const dirHandle = await window.showDirectoryPicker();
            setStatus("Pico storage detected. Uploading...");
            setLoading(true);

            const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
            const writable = await fileHandle.createWritable();
            const fileData = await file.arrayBuffer();
            await writable.write(fileData);
            await writable.close();

            setLoading(false);
            setStatus("✅ Firmware uploaded successfully!");
        } catch (error) {
            setLoading(false);
            setStatus(`❌ Flashing failed: ${error.message}`);
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Raspberry Pi Pico Firmware Uploader</h1>
            <p className={styles.description}>
                Drag and drop your .uf2 file below to upload it to your Raspberry Pi Pico.
            </p>

            <label className={styles.fileDropArea}>
                <span>📂 Drag & drop a .uf2 file or click to select</span>
                <input type="file" accept=".uf2" onChange={handleFileChange} className={styles.hiddenInput} />
            </label>

            {file && (
                <div className={styles.fileInfo}>
                    <span>{file.name}</span>
                </div>
            )}

            <button className={styles.flashButton} onClick={flashFirmware} disabled={!file || loading}>
                {loading ? "Uploading..." : "Upload to Pico"}
            </button>

            <p className={`${styles.status} ${status.includes("✅") ? styles.success : styles.error}`}>
                {status}
            </p>
        </div>
    );
}