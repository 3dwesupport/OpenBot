import React from "react";
import Header from "../../homeComponents/navbar/header";
import {HomeServices} from "../../homeComponents/serviceComponents/playground";

export const Home = () => {

    return (
        <div style={{height: "100vh"}}>
            <Header/>
            <HomeServices/>
        </div>
    );
}