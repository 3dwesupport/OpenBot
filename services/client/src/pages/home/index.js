import React from "react";
import {DashboardComponent} from "../../components/dashboard/dashboardComponent";
import {SubscriptionCookie} from "../../components/common/cookie/subscriptionCookie";
import {Constants, localStorageKeys} from "../../utils/constants";
import Cookies from "js-cookie";

/**
 * function to display home page
 * @returns {Element}
 * @constructor
 */
export const Home = () => {
    const plan = Cookies.get(localStorageKeys.planDetails);
    const type = plan ? JSON.parse(plan) : ""

    return (
        <div style={{height: "100vh"}}>
            {type?.planType === Constants.free && <SubscriptionCookie/>}
            <DashboardComponent/>
        </div>
    );
}