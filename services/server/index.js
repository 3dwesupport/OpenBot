require('dotenv').config()
const express = require('express');
const cors = require('cors');
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const serviceAccount = require("./opencode-openbot-firebase-adminsdk-ros9l-b06ecc9b78.json");
const app = express();
const session = require("./stripe/checkoutSession");
const customer = require("./stripe/customer");
const webhook = require("./stripe/webhooks");
const transaction = require("./stripe/transactionInfo");
const subscription = require("./stripe/handleSubscription");

const port = process.env.SERVER_PORT || 9000;

admin.initializeApp({
    //TODO add in readme to download account file
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://opencode-openbot-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.firestore();

app.use(cors());
app.use(webhook);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use("/session", session);
app.use("/customer", customer);
app.use("/transaction", transaction);
app.use("/subscription", subscription);

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
    console.log("listening on port 9000", port);
}).on('error', (err) => {
    console.error('Server startup error:', err.message);
});

module.exports.db = db;
