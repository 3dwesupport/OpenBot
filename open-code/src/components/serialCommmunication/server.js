const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

// ✅ Add CORS Middleware Here
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");  
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.use(express.json());

const { spawn } = require("child_process");

app.post("/flash", upload.single("firmware"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const firmwarePath = path.resolve(req.file.path);
    const port = "/dev/cu.usbserial-10";  

    console.log(`Flashing firmware: ${firmwarePath}`);

    const platformio = spawn("platformio", [
        "run",
        "--target", "upload",
        "--upload-port", port
    ], {
        cwd: "/Users/ishachaudhary/Desktop/no_phone_feature/OpenBot/open-code/esp32dev"
    });

    platformio.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
    });

    platformio.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
    });

    platformio.on("close", (code) => {
        fs.unlinkSync(firmwarePath);  

        if (code === 0) {
            console.log("Flash successful");
            res.json({ message: "Flashing complete!" });
        } else {
            console.error("Flash failed with code:", code);
            res.status(500).json({ error: "Flashing failed" });
        }
    });
});

app.listen(8000, () => console.log("🚀 Server running on port 8000"));
