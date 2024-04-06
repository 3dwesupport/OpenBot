import React, {useContext, useEffect, useState} from "react";
import style from "./billing.module.css";
import {Constants, errorToast, localStorageKeys, Themes, userPlan} from "../../utils/constants";
import {BillingCard} from "../../components/common/billingCard/card";
import {ThemeContext} from "../../App";
import {handleCheckout, renewSubscriptionPlans, switchSubscriptionPlans} from "../../stripeAPI";
import {getDocDetails} from "../../database/APIs/subscription";
import {AnalyticsLoader} from "../../components/common/loader/loader";

/**
 * function to display plans and subscriptions
 * @returns {Element}
 * @constructor
 */
export function Billing() {
    const {theme} = useContext(ThemeContext);
    const [isAnalysisLoader, setIsAnalysisLoader] = useState(false);
    const [planStatus, setPlanStatus] = useState({
        type: Constants.free,
        status: Constants.active
    })
    let uid = localStorage.getItem(localStorageKeys.UID);

    useEffect(() => {
        setIsAnalysisLoader(true);
        getDocDetails(uid).then(doc => {
            const updatedStatus = (new Date(doc.data.sub_end_date.seconds * 1000 + doc.data.sub_end_date.nanoseconds / 1e6) <= new Date()) ? Constants.active : Constants.expired;
            setPlanStatus({
                type: doc.data.sub_type,
                status: updatedStatus
            })
            setIsAnalysisLoader(false);
        })
            .catch(error => {
                setIsAnalysisLoader(false);
                console.error("Error during fetching data:")
            })
    }, [uid]);

    /**
     * function to handle Checkout, Switch and Renew Plans
     * @param e
     */
    function handlePaymentButton(e) {
        switch (e) {
            case 'STANDARD PLAN' :
                if (planStatus.type === "free") {   // first time checkout to standard
                    handleCheckout(e).then();
                } else if (planStatus.type === "standard" && planStatus.status === Constants.expired) { // renew Standard Plans
                    renewSubscriptionPlans(e).then();
                } else if (planStatus.type === "premium" && planStatus.status === Constants.expired) { // switch Standard plans
                    switchSubscriptionPlans(e).then();
                }
                return;

            case 'PREMIUM PLAN':
                if (planStatus.type === "free") { // first time checkout to premium
                    handleCheckout(e).then();
                } else if (planStatus.type === "standard") { // if first time standard plan checkout either Active or expired then switch to premium
                    switchSubscriptionPlans(e).then();
                } else if (planStatus.type === "premium" && planStatus.status === Constants.expired) { // renew Premium plans API
                    renewSubscriptionPlans(e).then();
                }
                return;

            default:
                return;
        }
    }

    const checkout = (e) => {
        if (localStorage.getItem(localStorageKeys.isSignIn) === "true") {
            handlePaymentButton(e);
        } else {
            errorToast(Constants.signInText);
        }
    }

    return (
        <div style={{backgroundColor: theme === Themes.dark ? "#202020" : "#FFFFFF", height: "100vh"}}>
            {isAnalysisLoader && <AnalyticsLoader/>}
            <div className={style.billingParentDiv}
                 style={{backgroundColor: theme === Themes.dark ? "#202020" : "#FFFFFF"}}>
                <div className={style.billingChildDiv}>
                    <div className={style.billingTitle}
                         style={{color: theme === Themes.dark ? "#FFFFFF" : "black"}}>{Constants.billingTitle}</div>
                    <div className={style.billingPlanDiv}>
                        {userPlan.map((item, key) =>
                            <BillingCard cardDetails={item} key={key} theme={theme} paymentCheckout={checkout}
                                         isActivePlan={planStatus}/>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}