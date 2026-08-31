import {auth} from "../database/authentication";
import {getCustomerId, getSubscriptionId} from "../database/APIs/subscription";
import {localStorageKeys} from "../utils/constants";

/**
 * function to handle checkout on clicking subscription plans
 * @param planType
 * @returns {Promise<void>}
 */
export const handleCheckout = async (planType) => {
    if (planType !== "FREE PLAN") {
        try {
            let customerID = await getCustomerId();
            console.log("handle Checkout plan is select and his customer id is :::",customerID);
            fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/session/create-checkout-session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    planType: planType,
                    email: auth?.currentUser?.email,
                    uid: auth?.currentUser?.uid,
                    customerID: customerID
                })
            }).then(res => res.json())
                .then(({url}) => {
                    window.location = url
                })
        } catch (e) {
            console.log(e);
        }
    }
}

/**
 * function to download invoice
 * @param invoiceID
 */
export const downloadInvoice = (invoiceID) => {
    try {
        return fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/transaction/download-invoice?invoiceId=${invoiceID}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
        }).then(res => res.text())
            .then((res) => {
                return res;
            })
    } catch (e) {
        console.log(e);
    }

}

/**
 * function to create customer
 * @param name
 * @param email
 * @param planType
 */
export const createCustomer = (name, email, planType) => {
    fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/customer/create-customer`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({name: name, email: email})
    }).then(res => res.json())
        .then((res) => {
            console.log("res::", res);
        })
}

/**
 * function to get session verify
 * @param sessionID
 */
export const verifySession = (sessionID) => {
    try {
        return fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/session/get-session?sessionID=${sessionID}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
        }).then(res => res.json())
            .then((res) => {
                return res;
            })
    } catch (e) {
        console.log(e);
    }
}

/**
 * function to switch Subscriptions plans
 * @param planType
 * @returns {Promise<void>}
 */
export const switchSubscriptionPlans = async (planType) => {
    try {
        let uid = localStorage.getItem(localStorageKeys.UID);
        let customerID = await getCustomerId();
        let subscriptionId = await getSubscriptionId();
        console.log("UID::", uid, "Customer ID::", customerID, "Subscription ID::", subscriptionId);
        return fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/subscription/upgrade-subscription?uid=${uid}&customerId=${customerID}&subscriptionId=${subscriptionId}`, {
            method: "POST",
            headers: {
                "content-type": "application/JSON",
            }
        }).then(res => res.json())
            .then(({url}) => {
                console.log(url);
                window.location = url
            })
    } catch (e) {
        console.log(e);
    }
}

// /**
//  * function to renew Plans
//  * @param planType
//  * @returns {Promise<void>}
//  */
// export const renewSubscriptionPlans = async (planType) => {
//     try {
//         let subscriptionId = await getSubscriptionId();
//         console.log("Subscription ID::", subscriptionId);
//         const response = await fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/subscription/renew-subscription?subscriptionId=${subscriptionId}`, {
//             method: "GET",
//             headers: {
//                 "Content-Type": "application/json"
//             }
//         });
//         console.log("Response ::", response.url);
//         window.location.href = response.url;
//     } catch (e) {
//         console.error(e);
//     }
// }

/**
 * function to create customer portal for customers
 * @param customerId
 * @returns {Promise<void>}
 */
export const createCustomerPortal = async (customerId) => {
    try {
        console.log("Customer ID aa gyi:::",customerId);
        await fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/subscription/create-customer-portal?customerId=${customerId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).then(res => res.json())
            .then(({url}) => {
                window.location = url;
            })
    } catch (e) {
        console.log(e);
    }
}