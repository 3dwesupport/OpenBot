var firestore = require("../index")

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
    }

    subscriptionRef.where('uid', '==', userId).get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('No documents found for uid.');
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

module.exports = {updateSubscriptionDetails};