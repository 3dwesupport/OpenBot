const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const router = express.Router();

router.get('/download-invoice', async (req, res) => {
    const {invoiceId} = req.query;
    try {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        console.log("invoices::", invoice.invoice_pdf);
        res.send(invoice.invoice_pdf);
    } catch (error) {
        console.error('Error retrieving or downloading invoice:', error);
        res.status(500).send('Error downloading invoice');
    }
});

module.exports = router;