const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const router = express.Router();

router.get("/renew-subscription", async (req, res) => {
        try {
            const {subscriptionId} = req.query;
            await stripe.invoices.list({
                subscription: subscriptionId,
            }, async function (err, invoices) {
                if (err) {
                    console.error(err);
                    // Handle error
                } else {
                    // Extract the upcoming invoice ID
                    if (invoices.data.length > 0) {
                        console.log("hello");
                        const upcomingInvoiceId = invoices.data[0];
                        const invoice = await stripe.invoices.retrieve(upcomingInvoiceId);
                        console.log("hosted url:::", invoice.hosted_invoice_url);
                        res.send(invoice.hosted_invoice_url);
                    } else {
                        res.send("No renewal invoices");
                    }
                }
            });
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
                    customer_update: {
                        enabled: true,
                        allowed_updates: ["address", "email", "name", "phone", "shipping"]
                    },
                    subscription_cancel: {
                        enabled: true,
                        mode: "at_period_end"
                    },
                    subscription_update: {
                        default_allowed_updates: ["price"],
                        enabled: true,
                        products: [{
                            product: process.env.SUBSCRIPTION_STANDARD_PRODUCT_ID,
                            prices: [process.env.SUBSCRIPTION_STANDARD_ID]
                        }, {
                            product: process.env.SUBSCRIPTION_PREMIUM_PRODUCT_ID,
                            prices: [process.env.SUBSCRIPTION_PREMIUM_ID]
                        }
                        ],
                        proration_behavior: "always_invoice",
                    },
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
                        return_url: `${process.env.CLIENT_ADDRESS}/billing?subscriptionUpdate=true`,
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

router.post("/create-customer-portal", async (req, res) => {
    try {
        const {customerId} = req.query;
        const portal = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.CLIENT_ADDRESS}/billing`,
        });
        res.send({url: portal.url});
        console.log("customer portal url::", portal.url);
    } catch (e) {
        console.log(e);
    }
})

module.exports = router;