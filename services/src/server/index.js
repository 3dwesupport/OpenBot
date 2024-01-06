const express = require('express');
const admin = require("firebase-admin");
const serviceAccount = require("../../opencode-openbot-firebase-adminsdk-ros9l-b06ecc9b78.json");
const cors = require('cors');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://opencode-openbot-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const app = express();
const port = process.env.SERVER_PORT || 9000;
app.listen(port, () => {
    console.log("listening on port 9000");
})
app.use(cors());

async function generateToken(UID) {
    return admin.auth().createCustomToken(UID)
        .then((customToken) => {
            console.log("Custom token: ", customToken)
            return customToken;
        })
        .catch((error) => {
            console.error('Error creating custom token:', error);
            return null;
        });

}

app.get('/getToken', async (req, res) => {
    try {
        const UID = req.query.uid;
        await generateToken(UID).then(
            (token) => {
                if (token != null) {
                    res.json({token});
                    res.status(200).json();
                } else {
                    res.status(500).json({error: 'Internal Server Error'});
                }
            }
        );
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({error: 'Internal Server Error'});
    }
});
