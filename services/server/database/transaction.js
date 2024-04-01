const firestore = require("../index");

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

async function fetchData(){
    const uid=localStorage.getItem(localStorageKeys.UID);
    let custId;
    getDocDetails(doc=>{
        custId=doc.customer_id;
    })
}
module.exports = {addTransactionHistory};