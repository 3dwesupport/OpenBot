import React, {useEffect, useState} from "react";
import {Constants, localStorageKeys, PathName} from "../../../utils/constants";
import {useLocation, useNavigate} from "react-router-dom";
import {PaymentInfo} from "../../../components/common/paymentInfo/payment";
import {Images} from "../../../utils/images";
import {addSubscription} from "../../../database/APIs/subscription";
import Cookies from "js-cookie";

/**
 * function to display success page
 * @returns {Element}
 * @constructor
 */
export function PaymentSuccess() {
    const navigate = useNavigate();
    const [newAmount, setNewAmount] = useState("10");
    const location = useLocation();

    useEffect(() => {
        const modifiedUrl = `${window.location.href}`;
        const modifiedSearchParams = new URLSearchParams(modifiedUrl.split('?')[1]);
        const amount = modifiedSearchParams.get('amount');
        if (amount) {
            setNewAmount(amount);
            const newSearchParams = new URLSearchParams(window.location.search);
            newSearchParams.delete('amount');
            window.history.replaceState({}, '', `${location.pathname}${newSearchParams.toString()}`);
            // const cookieOptions = {
            //     // domain: '.openbot.org',
            //     domain: 'localhost',
            //     // domain: ".itinker.io",
            //     secure: true,
            //     expires: new Date(new Date().getTime() + (60 * 60 * 1000)),
            // };
            // addSubscription(localStorage.getItem(localStorageKeys.UID), Constants.standard).then(async (res) => {
            //     Cookies.set(localStorageKeys.planDetails, JSON.stringify(res), cookieOptions);
            // });
        }
    })

    function sendDashboard() {
        navigate(PathName.billing);
    }

    return <>
        <PaymentInfo images={Images.successImgIcon}
                     infoText={Constants.successText}
                     text={`Your payment of ${newAmount}$ was Successfully Completed`}
                     color={"#0071c5"} click={() => {
            sendDashboard()
        }} buttonText={Constants.buttonSuccessText}/>
    </>
}