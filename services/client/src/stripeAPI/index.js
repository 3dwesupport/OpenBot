import {auth} from "../database/authentication";
import {getCustomerId} from "../database/APIs/subscription";

/**
 * function to handle checkout on clicking subscription plans
 * @param planType
 * @returns {Promise<void>}
 */
export const handleCheckout = async (planType) => {
    if (planType !== "FREE PLAN") {
        try {
            let customerID = await getCustomerId();
            fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/create-checkout-session`, {
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
        fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/download-invoice?invoiceId=${invoiceID}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
        }).then(res => res.json())
            .then((res) => {
                console.log("res::", res);
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
    fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/create-customer`, {
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
