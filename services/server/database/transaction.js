const firestore = require("../index");

/**
 * function to add transaction details into firestore
 * @param transactionID
 * @param invoiceID
 * @param createdTime
 * @param amount
 * @param status
 * @param customerID
 * @returns {Promise<void>}
 */
async function addTransactionHistory(transactionID, invoiceID, createdTime, amount, status, customerID) {
    const transactionDetails = {
        transaction_id: transactionID,
        customer_id: customerID,
        invoice_id: invoiceID,
        transaction_time: new Date(createdTime * 1000),
        transaction_amount: amount / 100,
        transaction_status: status
    }
    try {
        const transactionRef = firestore.db.collection('transaction');
        const docRef = await transactionRef.add(transactionDetails);
        console.log('Transaction document added with ID:', docRef.id);
    } catch (e) {
        console.log(e);
    }
}

module.exports = {addTransactionHistory};