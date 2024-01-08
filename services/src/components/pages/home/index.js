import React from "react";
import Header from "../../homeComponents/navbar/header";
import {OpenBotServiceComponent} from "../../homeComponents/openbotServices/servicesSection/openbotServiceComponent";

export const Home = () => {

    return (
        <div style={{height: "100vh"}}>
            <Header/>
            <OpenBotServiceComponent/>
        </div>
    );
}