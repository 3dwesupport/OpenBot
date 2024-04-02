import React, {useContext, useEffect, useState} from "react";
import style from "./billing.module.css";
import {Constants, errorToast, localStorageKeys, Themes, userPlan} from "../../utils/constants";
import {BillingCard} from "../../components/common/billingCard/card";
import {ThemeContext} from "../../App";
import {handleCheckout} from "../../stripeAPI";
import {getDocDetails} from "../../database/APIs/subscription";

/**
 * function to display plans and subscriptions
 * @returns {Element}
 * @constructor
 */
export function Billing() {
    const {theme} = useContext(ThemeContext);

    const checkout = (e) => {
        if (localStorage.getItem(localStorageKeys.isSignIn) === "true") {
            handleCheckout(e).then();
        } else {
            errorToast(Constants.signInText);
        }
    }

    const [isActivePlan, setIsActivePlan] = useState("standard");
    let uid = localStorage.getItem(localStorageKeys.UID);

    let startDate, newStartDate,endDate,newEndDate;
    useEffect(() => {
        let userDetails;
        getDocDetails(uid).then(doc => {
            userDetails = doc;
            setIsActivePlan(userDetails.data.sub_type); // either free/standard/premium fetch from firebase
            startDate = userDetails.data.sub_start_date * 1000;
            endDate = userDetails.data.sub_end_date * 1000;
            newStartDate = new Date(startDate);
            newEndDate = new Date(endDate);
        })
            .catch(error => {
                console.error("UserDetails not found");
            })
    }, [uid]);


    return (
        <div style={{backgroundColor: theme === Themes.dark ? "#202020" : "#FFFFFF"}}>
            <div className={style.billingParentDiv}
                 style={{backgroundColor: theme === Themes.dark ? "#202020" : "#FFFFFF",height:"100vh"}}>
                <div className={style.billingChildDiv}>
                    <div className={style.billingTitle}
                         style={{color: theme === Themes.dark ? "#FFFFFF" : "black"}}>{Constants.billingTitle}</div>
                    <div className={style.billingPlanDiv}>
                        {userPlan.map((item, key) =>
                            <BillingCard cardDetails={item} key={key} theme={theme} paymentCheckout={checkout}
                                         isActivePlan={item.type === isActivePlan} startDate={newStartDate} endDate={newEndDate}/>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}