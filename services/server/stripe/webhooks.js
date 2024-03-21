const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const router = express.Router();

//stripe webhook
router.post('/webhook', express.raw({type: 'application/json'}), function (request, response) {
    const sig = request.headers['stripe-signature'];
    const body = request.body;
    console.log("body:::", body);
    const endpointSecret = process.env.WEBHOOK_ENDPOINT_SECRET_KEY;
    let event = null;

    try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
        console.log("err::", err);
        response.status(400).end();
        return;
    }

    let intent = null;
    console.log("event type call ")
    switch (event['type']) {
        case 'payment_intent.succeeded':
            intent = event.data.object;
            console.log("Succeeded:", intent.id);
            break;
        case 'payment_intent.payment_failed':
            intent = event.data.object;
            const message = intent.last_payment_error && intent.last_payment_error.message;
            console.log('Failed:', intent.id, message);
            break;
        case "customer.created":
            intent = event.data.object;
            console.log("customer:::", intent);
            break;
        case "customer.subscription.created":
            const subscription = event.data.object;
            const customerId = subscription.customer;
            const subscriptionId = subscription.id;
            console.log("customer id:::", customerId);
            console.log("subscriptionID:::", subscriptionId);
            // Handle customer subscription created event
            // Associate subscription with customer in your database
            break;
    }
    response.sendStatus(200);
});

module.exports = router;