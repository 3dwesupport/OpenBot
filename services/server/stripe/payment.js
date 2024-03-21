const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
    try {
        const {planType, email} = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: 'subscription',
            line_items: [
                {
                    price: planType === "STANDARD PLAN" ? process.env.SUBSCRIPTION_STANDARD_ID : process.env.SUBSCRIPTION_PREMIUM_ID,
                    quantity: 1,
                },
            ],
            customer_email: email,
            success_url: `${process.env.CLIENT_ADDRESS}/payment/success`,
            cancel_url: `${process.env.CLIENT_ADDRESS}/payment/failure`,
        });
        res.send({url: session.url});
        console.log("session ::", session.url);
    } catch (e) {
        console.log(e);
    }
});

module.exports = router;