import React from "react";
import Header from "../../navbar/header";
import {DashboardComponent} from "../../home/dashboard/dashboardComponent";

/**
 * function to display home page
 * @returns {Element}
 * @constructor
 */
export const Home = () => {

    return (
        <div style={{height: "100vh"}}>
            <Header/>
            <DashboardComponent/>
        </div>
    );
}