import React, {useCallback, useContext} from "react";
import {PaymentInfo} from "../../../components/common/paymentInfo/payment";
import {ThemeContext} from "../../../App";
// import './failureIndex.css';
import {Images} from "../../../utils/images";
import {Constants, PathName} from "../../../utils/constants";
import {useNavigate} from "react-router-dom";

/**
 * Function to display failure page
 * @returns {Element}
 * @constructor
 */
export function PaymentFail() {
    const {theme} = useContext(ThemeContext);
    const navigate = useNavigate();

    function sendDashboard() {
        navigate(PathName.billing);
    }

    return <>
        <PaymentInfo images={Images.failureImgIcon} infoText={Constants.failureText} text={Constants.failure}
                     click={() => {
                         sendDashboard()
                     }} color={"#DA4B5D"} buttonText={Constants.buttonFailureText}/>
    </>
}