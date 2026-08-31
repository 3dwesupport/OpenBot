var firestore = require("../index")

/**
 * function to add current subscription details in firebase
 * @param userId
 * @param subscriptionDetails
 * @param customerId
 */
function updateSubscriptionDetails(userId, subscriptionDetails, customerId) {
    const subscriptionRef = firestore.db.collection("subscription");
    let subscriptionType;
    if (subscriptionDetails.plan.id === process.env.SUBSCRIPTION_STANDARD_ID) {
        subscriptionType = "standard"
    } else if (subscriptionDetails.plan.id === process.env.SUBSCRIPTION_PREMIUM_ID) {
        subscriptionType = "premium"
    }
    const subInstance = {
        sub_plan_id: subscriptionDetails.id,
        customer_id: customerId,
        sub_start_date: new Date(subscriptionDetails.current_period_start * 1000),
        sub_end_date: new Date(subscriptionDetails.current_period_end * 1000),
        sub_type: subscriptionType,
        sub_status: subscriptionDetails.status,
        uid: userId
    }

    subscriptionRef.where('uid', '==', userId).get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('No documents found for uid.');
                subscriptionRef.add(subInstance)
                    .then(docRef => {
                        console.log(`New document created with ID: ${docRef.id}`);
                    })
                    .catch(error => {
                        console.error('Error creating document:', error);
                    });
                return;
            }
            snapshot.forEach(doc => {
                subscriptionRef.doc(doc.id).update({
                    ...subInstance
                })
                    .then(() => {
                        console.log(`Document with ID ${doc.id} successfully updated.`);
                    })
                    .catch(error => {
                        console.error(`Error updating document with ID ${doc.id}:`, error);
                    });
            });
        })
        .catch(error => {
            console.error('Error getting documents:', error);
        });
}

/**
 * function to add subscription history into firebase firestore
 * @param subscriptionDetails
 * @param amountPaid
 * @param customerAddress
 * @param customerEmail
 * @param customerName
 * @returns {Promise<void>}
 */
async function addSubscriptionHistory(subscriptionDetails, amountPaid, customerAddress, customerEmail, customerName) {
    const subHistory = {
        sub_id: subscriptionDetails.id,
        uid: subscriptionDetails.metadata.uid,
        invoice_id: subscriptionDetails.latest_invoice,
        plan_details: {
            plan_id: subscriptionDetails.plan.id,
            plan_amount_paid: amountPaid,
            plan_start_date: new Date(subscriptionDetails.current_period_start * 1000),
            plan_end_date: new Date(subscriptionDetails.current_period_end * 1000),
        },
        customer_details: {
            customer_id: subscriptionDetails.customer,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_address: customerAddress,
        }
    }

    try {
        const subscriptionRef = firestore.db.collection("subscriptionHistory");
        const docRef = await subscriptionRef.add(subHistory);
        console.log('Transaction document added with ID:', docRef.id);
    } catch (e) {
        console.log("error in add subscription history--->", e);
    }
}

module.exports = {updateSubscriptionDetails, addSubscriptionHistory};