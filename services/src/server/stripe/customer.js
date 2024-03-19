const stripe = require('stripe')("sk_test_51OvXtISFuZKtXoUB9PaHYxWYJSGKYZ65whFeCLavo2JSJKcf8AheHKGq0mC0x59egpMKJlxEuVY4Cpf9dHNUhzzK00FP7YkWek");
const express = require("express");
const router = express.Router();

router.post("/create-customer", async (req, res) => {
    try {
        console.log("body::", req.body)
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