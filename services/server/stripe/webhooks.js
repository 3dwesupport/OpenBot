const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const {updateSubscriptionDetails, addSubscriptionHistory} = require("../database/subscription");
const {addTransactionHistory} = require("../database/transaction");
const router = express.Router();

/**
 * stripe webhooks
 */
router.post('/webhook', express.raw({type: 'application/json'}), async function (req, res) {
    try {
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
            case "payment_intent.succeeded":
                console.log("Payment succeeded");
                break;
            case "payment_intent.payment_failed":
                console.log("data:::", data);
                await addTransactionHistory(data.id, data.invoice, data.created, data.amount, data.status, data.customer);
                break;
            case "customer.subscription.created":
                console.log("data:::", data);
                break;
            case "customer.subscription.updated":
                console.log("data::", data);
                break;
            case "customer.subscription.deleted":
                updateSubscriptionDetails(data.metadata.uid, data, data.customer);
                console.log("data::", data);
                break;
            case "payment_method.attached":
                console.log("data::", data);
                break;
            case "payment_method.detached":
                console.log("data::", data);
                break;
            case "invoice.paid":
                await addTransactionHistory(data.payment_intent, data.id, data.created, data.amount_paid, data.status, data.customer);
                console.log("invoice data:::", data);
                if (data.status === "paid") {
                    const subscription = await stripe.subscriptions.retrieve(
                        data.subscription
                    );
                    updateSubscriptionDetails(subscription.metadata.uid, subscription, subscription.customer);
                    if (data.billing_reason === "subscription_cycle" || "subscription_create") {
                        await addSubscriptionHistory(subscription, data.amount_paid, data.customer_address, data.customer_email, data.customer_name);
                    }
                }
                break;
            case "invoice.payment_action_required":
                await addTransactionHistory(data.payment_intent, data.id, data.created, data.amount_paid, data.status, data.customer);
                console.log("data::", data);
                break;
            case "invoice.payment_failed":
                await addTransactionHistory(data.payment_intent, data.id, data.created, data.amount_paid, data.status, data.customer);
                console.log("data::", data);
                break;
            case "charge.succeeded":
                console.log("data::", data);
                break;
            default:
                break;
        }
        res.sendStatus(200);
    } catch (e) {
        console.log(e);
    }
});


module.exports = router;