import React, {useContext} from "react";
import style from "./billing.module.css";
import {Constants, Themes, userPlan} from "../../utils/constants";
import {BillingCard} from "../../components/common/billingCard/card";
import {ThemeContext} from "../../App";

export function Billing() {
    const {theme} = useContext(ThemeContext);

    return (
        <div style={{height: "100vh", backgroundColor: theme === Themes.dark ? "#202020" : "#FFFFFF"}}>
            <div className={style.billingParentDiv}>
                <div className={style.billingChildDiv}>
                    <div className={style.billingTitle}
                         style={{color: theme === Themes.dark ? "#FFFFFF" : "black"}}>{Constants.billingTitle}</div>
                    <div className={style.billingPlanDiv}>
                        {userPlan.map((item, key) =>
                            <BillingCard cardDetails={item} key={key} theme={theme}/>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}