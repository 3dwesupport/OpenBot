import {auth} from "../database/authentication";

export const handleCheckout = (planType) => {
    if (planType !== "FREE PLAN") {
        try {
            fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/payment/create-checkout-session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    priceId: planType === "STANDARD PLAN" ? "price_1Ovdf6SFuZKtXoUByPQMIQZa" : "price_1Ovuz4SFuZKtXoUB1wGPVvTL",
                    email: auth?.currentUser?.email
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
