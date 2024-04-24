import React, {useContext, useEffect, useState} from "react";
import style from "./billing.module.css";
import {Constants, errorToast, localStorageKeys, Themes, userPlan} from "../../utils/constants";
import {BillingCard} from "../../components/common/billingCard/card";
import {ThemeContext} from "../../App";
import {handleCheckout, renewSubscriptionPlans, switchSubscriptionPlans} from "../../stripeAPI";
import {addSubscription, getDocDetails} from "../../database/APIs/subscription";
import {AnalyticsLoader} from "../../components/common/loader/loader";
import {useLocation} from "react-router-dom";
import Cookies from "js-cookie";

/**
 * function to display plans and subscriptions
 * @returns {Element}
 * @constructor
 */
export function Billing() {
    const {theme} = useContext(ThemeContext);
    const [isAnalysisLoader, setIsAnalysisLoader] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [planStatus, setPlanStatus] = useState({
        type: Constants.free,
        status: Constants.active
    })
    const location = useLocation();
    let uid = localStorage.getItem(localStorageKeys.UID);

    useEffect(() => {
        setIsAnalysisLoader(true);
        getDocDetails(uid).then(doc => {
            const updatedStatus = (new Date(doc.data.sub_end_date.seconds * 1000 + doc.data.sub_end_date.nanoseconds / 1e6) >= new Date()) ? Constants.active : Constants.expired;
            setPlanStatus({
                type: doc.data.sub_type,
                status: updatedStatus
            })
            setIsAnalysisLoader(false);
        })
            .catch(error => {
                setIsAnalysisLoader(false);
                console.error("Error during fetching data:");
            })
    }, [uid]);

    useEffect(() => {
        const newSearchParams = new URLSearchParams(location.search);
        const isUpdate = newSearchParams.get('subscriptionUpdate');
        if (isUpdate && uid) {
            newSearchParams.delete("subscriptionUpdate");
            window.history.replaceState({}, '', `${location.pathname}${newSearchParams.toString()}`);
            const cookieOptions = {
                // domain: '.openbot.org',
                domain: 'localhost',
                // domain: ".itinker.io",
                secure: true,
                expires: new Date(new Date().getTime() + (60 * 60 * 1000)),
            };
            console.log("updating susbcription");
            addSubscription(localStorage.getItem(localStorageKeys.UID), Constants.premium).then(async (res) => {
                Cookies.set(localStorageKeys.planDetails, JSON.stringify(res), cookieOptions);
            });
        }
    })

    /**
     * function to handle Checkout, Switch and Renew Plans
     * @param e
     */
    function handlePaymentButton(e) {
        switch (e) {
            case 'STANDARD PLAN' :
                if (planStatus.sub_status === 'canceled' && (new Date(e.data.sub_end_date.seconds * 1000 + e.data.sub_end_date.nanoseconds / 1e6) >= new Date())) {
                    return handleCheckout(e);  // if the plan is canceled then goto checkout
                } if (planStatus.type === "free") {   // first time checkout to standard
                    return handleCheckout(e);
                } else if (planStatus.type === "standard" && planStatus.status === Constants.expired) { // renew Standard Plans
                    return renewSubscriptionPlans(e);
                } else if (planStatus.type === "premium" && planStatus.status === Constants.expired) { // switch Premium plans
                    return switchSubscriptionPlans(e);
                }
                return;

            case 'PREMIUM PLAN':
                if ((planStatus.sub_status === 'canceled') && (new Date(e.data.sub_end_date.seconds * 1000 + e.data.sub_end_date.nanoseconds / 1e6) <= new Date())) {
                    return handleCheckout(e); // if the plan is canceled then goto checkout
                } if (planStatus.type === "free") { // first time checkout to premium
                    return handleCheckout(e);
                } else if (planStatus.type === "standard") { // if first time standard plan checkout either Active or expired then switch to premium
                    return switchSubscriptionPlans(e);
                } else if (planStatus.type === "premium" && planStatus.status === Constants.expired) { // renew Premium plans API
                    return renewSubscriptionPlans(e);
                }

            default:
                return Promise.resolve();
        }
    }

    const checkout = (e) => {
        if (localStorage.getItem(localStorageKeys.isSignIn) === "true") {
            if (!fetching) {
                setFetching(true);
                handlePaymentButton(e).finally(() => {
                    setFetching(false);
                })
            }

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