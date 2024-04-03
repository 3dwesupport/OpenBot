const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const {updateSubscriptionDetails} = require("../database/subscription");
const {addTransactionHistory} = require("../database/transaction");
const router = express.Router();


//stripe webhook
router.post('/webhook', express.raw({type: 'application/json'}), async function (req, res) {
    const sig = req.headers['stripe-signature'];
    const body = req.body;
    const endpointSecret = process.env.WEBHOOK_ENDPOINT_SECRET_KEY;
    let event = null;

    try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
        console.log("err::", err);
        res.status(400).end();
        return;
    }

    let data = event.data.object
    let eventType = event.type

    console.log("event type::", eventType);
    switch (eventType) {
        case "checkout.session.completed":
            let sub = await stripe.subscriptions.update(data.subscription, {
                collection_method: "send_invoice",
                days_until_due: 7,
                payment_settings: {
                    payment_method_types: ["card"],
                    save_default_payment_method: "on_subscription",
                }
            })
            await stripe.customers.retrieve(data.customer).then(async (customer) => {
                    console.log("hello in checkout.session");
                    if (data.payment_status === "paid") {
                        const subscription = await stripe.subscriptions.retrieve(
                            data.subscription
                        );
                        updateSubscriptionDetails(data.metadata.uid, subscription, customer.id);
                    }
                }
            )
            break;
        case "payment_intent.payment_failed":
            await addTransactionHistory(data.id, data.invoice, data.created, data.amount, data.status, data.customer);
            console.log("Payment failed::", data);
            break;
        case "payment_intent.succeeded":
            await addTransactionHistory(data.id, data.invoice, data.created, data.amount, data.status, data.customer);
            console.log("Payment succeeded");
            break;
        case "customer.subscription.created":
            console.log("data:::", data);
            break;
        case "customer.subscription.updated":
            console.log("data::", data);
            break;
        case "payment_method.attached":
            console.log("data::", data);
            break;
        case "payment_method.detached":
            console.log("data::", data);
            break;
        case "invoice.paid":
            console.log("data::", data);
            break;
        case "charge.succeeded":
            console.log("data::", data);
            break;
        default:
            break;
    }
    res.sendStatus(200);
});


module.exports = router;