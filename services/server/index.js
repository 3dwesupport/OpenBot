const express = require('express');
const admin = require("firebase-admin");
const serviceAccount = require("./opencode-openbot-firebase-adminsdk-ros9l-b06ecc9b78.json");
require('dotenv').config()
const cors = require('cors');
const app = express();
const port = process.env.SERVER_PORT || 9000;
const payment = require("./stripe/payment");
const customer = require("./stripe/customer");
const webhook = require("./stripe/webhooks");
const bodyParser = require("body-parser");

admin.initializeApp({
    //TODO add in readme to download account file
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://opencode-openbot-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.firestore();

app.use(cors());
app.use(webhook);
app.use(bodyParser.json());

app.use(payment);
app.use(customer);

/**
 * function to generate token from admin service account
 * @param UID
 * @returns {Promise<string>}
 */
async function generateToken(UID) {
    return admin.auth().createCustomToken(UID)
        .then((customToken) => {
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

module.exports.db = db;
