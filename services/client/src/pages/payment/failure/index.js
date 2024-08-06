import React, {useEffect, useState} from "react";
import {PaymentInfo} from "../../../components/common/paymentInfo/payment";
import {Images} from "../../../utils/images";
import {Constants, PathName} from "../../../utils/constants";
import {useNavigate} from "react-router-dom";

/**
 * Function to display failure page
 * @returns {Element}
 * @constructor
 */
export function PaymentFail() {
    const navigate = useNavigate();
    const [newAmount, setNewAmount] = useState("10");

    useEffect(() => {
        const modifiedUrl = `${window.location.href}`;
        const modifiedSearchParams = new URLSearchParams(modifiedUrl.split('?')[1]);
        const amount = modifiedSearchParams.get('amount');
        if (amount) {
            setNewAmount(amount);
            modifiedSearchParams.delete('amount');
            window.history.replaceState({}, '', `${window.location.pathname}${modifiedSearchParams.toString()}`);
        }
    })

    function sendDashboard() {
        navigate(PathName.billing);
    }

    return <>
        <PaymentInfo images={Images.failureImgIcon} infoText={Constants.failureText}
                     text={`Your payment of ${newAmount}$ was not Successful`}
                     click={() => {
                         sendDashboard()
                     }} color={"#DA4B5D"} buttonText={Constants.buttonFailureText}/>
    </>
}