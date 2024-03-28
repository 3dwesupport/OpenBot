const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
    try {
        const {planType, email, uid, customerID} = req.body;
        let customerParam = {};
        if (customerID) {
            customerParam.customer = customerID;
        } else {
            customerParam.customer_email = email;
        }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: 'subscription',
            line_items: [
                {
                    price: planType === "STANDARD PLAN" ? process.env.SUBSCRIPTION_STANDARD_ID : process.env.SUBSCRIPTION_PREMIUM_ID,
                    quantity: 1,
                },
            ],
            metadata: {
                uid: uid
            },
            ...customerParam,
            success_url: `${process.env.CLIENT_ADDRESS}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_ADDRESS}/payment/failure?session_id={CHECKOUT_SESSION_ID}`,
        });
        res.send({url: session.url});
        console.log("session ::", session.url);
    } catch (e) {
        res.sendStatus(500);
        console.log(e);
    }
});

router.get("/get-session", async (req, res) => {
    try {
        const {sessionID} = req.query;
        const session = await stripe.checkout.sessions.retrieve(sessionID);
        if (session.id) {
            res.send(true);
        } else {
            res.send(false);
        }
    } catch (e) {
        res.send(false);
        res.sendStatus(404);
        console.log(e);
    }

})

module.exports = router;