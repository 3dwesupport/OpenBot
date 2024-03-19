export const handleCheckout = () => {
    fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/payment/create-checkout-session`, {
        method: "POST",
    }).then(res => res.json())
        .then(({url}) => {
            window.location = url
        })
}

export const createCustomer = (name, email) => {
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
