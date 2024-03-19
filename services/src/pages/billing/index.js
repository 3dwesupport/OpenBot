import React, {useContext} from "react";
import style from "./billing.module.css";
import {Constants, Themes, userPlan} from "../../utils/constants";
import {BillingCard} from "../../components/common/billingCard/card";
import {ThemeContext} from "../../App";
import {handleCheckout} from "../../stripeAPI";

/**
 * function to display plans and subscriptions
 * @returns {Element}
 * @constructor
 */
export function Billing() {
    const {theme} = useContext(ThemeContext);

    const checkout = (e) => {
        console.log(e);
        switch (e) {
            case "STANDARD PLAN" :
                handleCheckout();
        }
    }

    return (
        <div style={{height: "100vh", backgroundColor: theme === Themes.dark ? "#202020" : "#FFFFFF"}}>
            <div className={style.billingParentDiv}
                 style={{backgroundColor: theme === Themes.dark ? "#202020" : "#FFFFFF"}}>
                <div className={style.billingChildDiv}>
                    <div className={style.billingTitle}
                         style={{color: theme === Themes.dark ? "#FFFFFF" : "black"}}>{Constants.billingTitle}</div>
                    <div className={style.billingPlanDiv}>
                        {userPlan.map((item, key) =>
                            <BillingCard cardDetails={item} key={key} theme={theme} paymentCheckout={checkout}/>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}