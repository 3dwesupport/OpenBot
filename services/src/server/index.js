const express = require('express');
const admin = require("firebase-admin");
const serviceAccount = require("../../opencode-openbot-firebase-adminsdk-ros9l-b06ecc9b78.json");
const cors = require('cors');
const app = express();
const port = process.env.SERVER_PORT || 9000;

admin.initializeApp({
    //TODO add in readme to download account file
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://opencode-openbot-default-rtdb.asia-southeast1.firebasedatabase.app"
});
app.use(cors());

/**
 * function to generate token from admin service account
 * @param UID
 * @returns {Promise<string>}
 */
async function generateToken(UID) {
    return admin.auth().createCustomToken(UID)
        .then((customToken) => {
            console.log(customToken);
            return customToken;
        })
        .catch((error) => {
            console.error('Error creating custom token:', error);
            return null;
        });
}

/**
 * function to get custom token of specific uid and send in response
 */
app.get('/getToken', async (req, res) => {
    try {
        const UID = req.query.uid;
        await generateToken(UID).then(
            (token) => {
                if (token != null) {
                    console.log(token);
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

app.listen(port, () => {
    console.log("listening on port 9000");
})

