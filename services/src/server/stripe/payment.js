const stripe = require('stripe')("sk_test_51OvXtISFuZKtXoUB9PaHYxWYJSGKYZ65whFeCLavo2JSJKcf8AheHKGq0mC0x59egpMKJlxEuVY4Cpf9dHNUhzzK00FP7YkWek");
const express = require("express");
const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
    try {
        const {priceId} = req.query
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [
                {
                    price: "price_1Ovdf6SFuZKtXoUByPQMIQZa",
                    quantity: 1
                },
            ],
            success_url: `http://localhost:3000/billing`,
            cancel_url: `http://localhost:3000/billing`,
        });
        res.send({url: session.url});
        console.log("session ::", session.url);
    } catch (e) {
        console.log(e);
    }
});

module.exports = router;