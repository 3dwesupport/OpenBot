const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const router = express.Router();

router.post("/create-customer", async (req, res) => {
    try {
        const {name, email} = req.body;
        const customer = await stripe.customers.create({
            name: name,
            email: email,
        });

        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{
                price: 'price_1OvvYFSFuZKtXoUBwAS2GVUl',  // Replace with the ID of your $0 plan
            }],
        });
        console.log("customer::", customer)
        console.log("subscription::", subscription)

    } catch (e) {
        console.log(e);
    }
})

module.exports = router;