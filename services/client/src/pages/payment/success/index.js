import React from "react";
import {Constants, PathName} from "../../../utils/constants";
import {useNavigate} from "react-router-dom";
import {PaymentInfo} from "../../../components/common/paymentInfo/payment";
import {Images} from "../../../utils/images";

/**
 * function to display success page
 * @returns {Element}
 * @constructor
 */
export function PaymentSuccess() {
    const navigate = useNavigate();

    //
    function sendDashboard() {
        navigate(PathName.billing);
    }

    return <>
        <PaymentInfo images={Images.successImgIcon} infoText={Constants.successText} text={Constants.success} color={"#0071c5"} click={() => {
            sendDashboard()
        }} buttonText={Constants.buttonSuccessText}/>
    </>
}