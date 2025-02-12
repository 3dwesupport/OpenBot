const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.use(express.json());

app.post("/flash", upload.single("firmware"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.resolve(req.file.path);
    const fileExt = path.extname(req.file.originalname);
    const projectPath = "/Users/ishachaudhary/Desktop/no_phone_feature/OpenBot/open-code/esp32dev";
    const port = "/dev/cu.usbserial-10";  

    if (fileExt === ".ino" || fileExt === ".cpp") {
        console.log(`Compiling ${req.file.originalname}...`);

        const srcDir = path.join(projectPath, "src");
        const newFileName = fileExt === ".ino" ? "main.ino" : "main.cpp";
        const fileDestination = path.join(srcDir, newFileName);

        // Move the uploaded file to the src folder
        fs.renameSync(filePath, fileDestination);

        // Run PlatformIO compile command
        const compileProcess = spawn("platformio", ["run"], { cwd: projectPath });

        compileProcess.stdout.on("data", (data) => console.log(`stdout: ${data}`));
        compileProcess.stderr.on("data", (data) => console.error(`stderr: ${data}`));

        compileProcess.on("close", (code) => {
            if (code !== 0) {
                console.error("Compilation failed!");
                return res.status(500).json({ error: "Compilation failed!" });
            }

            // Locate the compiled firmware
            const compiledFirmware = path.join(projectPath, ".pio/build/esp32dev/firmware.bin");
            if (!fs.existsSync(compiledFirmware)) {
                return res.status(500).json({ error: "Compiled firmware not found!" });
            }

            console.log("Compilation successful! Flashing firmware...");
            flashFirmware(compiledFirmware, res);
        });
    } else if (fileExt === ".bin") {
        console.log("Flashing binary firmware...");
        flashFirmware(filePath, res);
    } else {
        return res.status(400).json({ error: "Unsupported file type. Only .ino, .cpp, and .bin allowed." });
    }
});

function flashFirmware(firmwarePath, res) {
    const port = "/dev/cu.usbserial-10";  
    const projectPath = "/Users/ishachaudhary/Desktop/no_phone_feature/OpenBot/open-code/esp32dev";

    const flashProcess = spawn("platformio", ["run", "--target", "upload", "--upload-port", port], {
        cwd: projectPath,
    });

    flashProcess.stdout.on("data", (data) => console.log(`stdout: ${data}`));
    flashProcess.stderr.on("data", (data) => console.error(`stderr: ${data}`));

    flashProcess.on("close", (code) => {
        fs.unlinkSync(firmwarePath);  

        if (code === 0) {
            console.log("Flash successful");
            res.json({ message: "Flashing complete!" });
        } else {
            console.error("Flash failed with code:", code);
            res.status(500).json({ error: "Flashing failed" });
        }
    });
}

app.listen(8000, () => console.log("🚀 Server running on port 8000"));
