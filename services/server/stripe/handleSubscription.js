const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const router = express.Router();

router.post("/renew-subscription", async (req, res) => {
        try {
            const {subscriptionId, customerId} = req.query;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            console.log("subscriptions::::", subscription);

            if (subscription.status === 'active') {
                // Update the subscription (renew it for another billing cycle)
                let update = await stripe.subscriptions.update(subscriptionId, {
                    billing_cycle_anchor: 'now', // Renew the subscription immediately
                });
                res.send(update);
                console.log("update:::", update);
            }
            res.send(subscription);
            res.sendStatus(20);
        } catch (e) {
            res.send(e);
            console.log(e);
        }
    }
)

router.post("/upgrade-subscription", async (req, res) => {
    try {
        const {subscriptionId, customerId, uid} = req.query;
        const configuration = await stripe.billingPortal.configurations.create({
                business_profile: {
                    privacy_policy_url: 'https://example.com/privacy',
                    terms_of_service_url: 'https://example.com/terms',
                },
                features: {
                    payment_method_update: {enabled: true},
                    invoice_history: {enabled: true},
                    subscription_update: {
                        default_allowed_updates: ["price"],
                        enabled: true,
                        products: [{
                            product: process.env.SUBSCRIPTION_STANDARD_PRODUCT_ID,
                            prices: [process.env.SUBSCRIPTION_STANDARD_ID]
                        }, {
                            product: process.env.SUBSCRIPTION_PREMIUM_PRODUCT_ID,
                            prices: [process.env.SUBSCRIPTION_PREMIUM_ID]
                        }],
                        proration_behavior: "always_invoice"
                    }
                },
                metadata: {uid: uid}
            }
        );

        const portal = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.CLIENT_ADDRESS}/billing`,
            configuration: configuration.id,
            flow_data: {
                type: 'subscription_update',
                subscription_update: {
                    subscription: subscriptionId,
                },
                after_completion: {
                    type: "redirect",
                    redirect: {
                        return_url: `${process.env.CLIENT_ADDRESS}/`,
                    }
                },
            },
        });
        res.send({url: portal.url});
        console.log("customer portal url::", portal.url);
    } catch
        (e) {
        res.send(e);
        console.log(e);
    }
})

module.exports = router;