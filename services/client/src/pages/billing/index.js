import React, {useContext, useEffect, useState} from "react";
import style from "./billing.module.css";
import {Constants, errorToast, localStorageKeys, Themes, userPlan} from "../../utils/constants";
import {BillingCard} from "../../components/common/billingCard/card";
import {ThemeContext} from "../../App";
import {handleCheckout} from "../../stripeAPI";
import {getDocDetails} from "../../database/APIs/subscription";
import {AnalyticsLoader} from "../../components/common/loader/loader";
/**
 * function to display plans and subscriptions
 * @returns {Element}
 * @constructor
 */
export function Billing() {
    const {theme} = useContext(ThemeContext);
    const [isAnalysisLoader,setIsAnalysisLoader]=useState(false);
    const [planStatus, setPlanStatus] = useState({
        type: "free",
        status: "ACTIVE"
    })
    let uid = localStorage.getItem(localStorageKeys.UID);

    useEffect(() => {
        setIsAnalysisLoader(true);
        getDocDetails(uid).then(doc => {
            const updatedStatus = (new Date(doc.data.sub_end_date.seconds * 1000 + doc.data.sub_end_date.nanoseconds / 1e6) >= new Date()) ? "ACTIVE" : "EXPIRED";
            setPlanStatus({
                type: doc.data.sub_type,
                status: updatedStatus
            })
            setIsAnalysisLoader(false);
        })
            .catch(error => {
                setIsAnalysisLoader(false);
            })
    }, [uid]);


    const checkout = (e) => {
        if (localStorage.getItem(localStorageKeys.isSignIn) === "true") {
            handleCheckout(e).then();
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