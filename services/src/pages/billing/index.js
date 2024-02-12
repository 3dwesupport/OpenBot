import React from "react";
import style from "./billing.module.css";
import {Constants, userPlan} from "../../utils/constants";
import {BillingCard} from "../../components/common/billingCard/card";

export function Billing() {

    return (
        <div className={style.billingParentDiv}>
            <div className={style.billingChildDiv}>
                <div className={style.billingTitle}>{Constants.billingTitle}</div>
                <div className={style.billingPlanDiv}>
                    {userPlan.map((item, key) =>
                        <BillingCard cardDetails={item} key={key}/>
                    )}
                </div>
            </div>
        </div>
    );
}