const stripe = require('stripe')("sk_test_51OvXtISFuZKtXoUB9PaHYxWYJSGKYZ65whFeCLavo2JSJKcf8AheHKGq0mC0x59egpMKJlxEuVY4Cpf9dHNUhzzK00FP7YkWek");
const express = require("express");
const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
    try {
        const {priceId, email} = req.body

        console.log("req.body::", req.body);

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            customer_email: email,
            // customer_email: email,
            success_url: `http://localhost:3000/billing`,
            cancel_url: `http://localhost:3000/billing`,
        });
        res.send({url: session.url});
        console.log("session ::", session.url);
    } catch (e) {
        console.log(e);
    }
});

//stripe webhook
router.post(
    '/webhook',
    express.raw({type: 'application/json'}),
    (request, response) => {
        let event = request.body;
        const endpointSecret = "whsec_552f383c246f887ac782f1ab430381e2ee39a2efefa6da0cbe23bbbc5543bd38";
        if (endpointSecret) {
            // Get the signature sent by Stripe
            const signature = request.headers['stripe-signature'];
            try {
                event = stripe.webhooks.constructEvent(
                    request.body,
                    signature,
                    endpointSecret
                );
            } catch (err) {
                console.log(`⚠️  Webhook signature verification failed.`, err.message);
                return response.sendStatus(400);
            }
        }
        let subscription;
        let status;
        // Handle the event
        switch (event.type) {
            case 'customer.subscription.trial_will_end':
                subscription = event.data.object;
                status = subscription.status;
                console.log(`Subscription status is ${status}.`);
                // Then define and call a method to handle the subscription trial ending.
                // handleSubscriptionTrialEnding(subscription);
                break;
            case 'customer.subscription.deleted':
                subscription = event.data.object;
                status = subscription.status;
                console.log(`Subscription status is ${status}.`);
                // Then define and call a method to handle the subscription deleted.
                // handleSubscriptionDeleted(subscriptionDeleted);
                break;
            case 'customer.subscription.created':
                subscription = event.data.object;
                status = subscription.status;
                console.log(`Subscription status is ${status}.`);
                // Then define and call a method to handle the subscription created.
                // handleSubscriptionCreated(subscription);
                break;
            case 'customer.subscription.updated':
                subscription = event.data.object;
                status = subscription.status;
                console.log(`Subscription status is ${status}.`);
                // Then define and call a method to handle the subscription update.
                // handleSubscriptionUpdated(subscription);
                break;
            default:
                // Unexpected event type
                console.log(`Unhandled event type ${event.type}.`);
        }
        // Return a 200 response to acknowledge receipt of the event
        response.send();
    }
);

module.exports = router;