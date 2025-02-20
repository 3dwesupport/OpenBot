from fastapi import FastAPI, HTTPException
import subprocess
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI()

BUILD_DIR = "build_output"
PROJECT_DIR = "/Users/ishachaudhary/Desktop/esp32code"
  # Path to the Arduino project folder
BOARD_NAME = "esp32dev"  # Change this to match your PlatformIO environment

@app.post("/compile")
def compile_ino():
    try:
        logging.info("Starting compilation process...")

        # Ensure build directory exists
        os.makedirs(BUILD_DIR, exist_ok=True)
        logging.info(f"Ensured build directory exists: {BUILD_DIR}")

        # Run PlatformIO build command
        logging.info(f"Running PlatformIO build in {PROJECT_DIR}...")
        result = subprocess.run(["platformio", "run"], cwd=PROJECT_DIR, capture_output=True, text=True)
        
        logging.info(f"PlatformIO stdout:\n{result.stdout}")
        logging.info(f"PlatformIO stderr:\n{result.stderr}")

        if result.returncode != 0:
            logging.error("Compilation failed!")
            raise HTTPException(status_code=500, detail=f"Compilation failed: {result.stderr}")

        # Locate the compiled files
        firmware_bin = os.path.join(PROJECT_DIR, f".pio/build/{BOARD_NAME}/firmware.bin")
        bootloader_bin = os.path.join(PROJECT_DIR, f".pio/build/{BOARD_NAME}/bootloader.bin")
        partitions_bin = os.path.join(PROJECT_DIR, f".pio/build/{BOARD_NAME}/partitions.bin")

        
        logging.info(f"Checking output files...")

        if not os.path.exists(firmware_bin):
            logging.error("Firmware binary not found!")
            raise HTTPException(status_code=500, detail="Firmware binary not found.")

        logging.info("Compilation successful!")
        return {
            "status": "success",
            "files": {
                "firmware_bin": firmware_bin,
                "bootloader_bin": bootloader_bin if os.path.exists(bootloader_bin) else "Not found",
                "partitions_bin": partitions_bin if os.path.exists(partitions_bin) else "Not found",
            }
        }

    except Exception as e:
        logging.error(f"Error during compilation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
