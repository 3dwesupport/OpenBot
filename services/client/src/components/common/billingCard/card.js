import React from "react";
import style from "./card.module.css";
import {Themes} from "../../../utils/constants";
import {Images} from "../../../utils/images";
import {useMediaQuery, useTheme} from "@mui/material";

export function BillingCard(props) {
    const {cardDetails, theme, paymentCheckout, isActivePlan, startDate, endDate} = props;
    const themes = useTheme();
    const isMobile = useMediaQuery(themes.breakpoints.down('sm'));

    function sendClick(e) {
        paymentCheckout(e);
    }

    // function handlePlanExpiration() {
    //     switch (cardDetails.type) {
    //         case "standard" :
    //             return planObject.planType === cardDetails.type && planObject.planStatus === "active"
    //     }
    // }

    return (
        <div className={style.choosePlanDiv}
             style={{
                 backgroundColor: theme === Themes.dark ? cardDetails.darkBackgroundColor : cardDetails.lightBackgroundColor,
                 color: theme === Themes.dark ? "#FFFFFF" : cardDetails.color,
             }}>
            <div className={style.cardChildDiv}>
                <div className={style.descriptionDiv}>
                    {isActivePlan &&
                        <p style={{paddingBottom: '5px', justifyContent: 'center', color:'#959595'}}>ACTIVE
                            PLAN</p>}
                    <div className={style.planTitle}>{cardDetails.title}</div>
                    <div className={style.planCostDiv}>
                        <span
                            style={{fontSize: isMobile ? "30px" : "40px", fontWeight: "bold"}}>{cardDetails.cost}</span>
                        <span>/month</span>
                    </div>
                    <div>{cardDetails.description}</div>
                </div>
                <div className={style.planServices}>
                    {cardDetails.services.map((item, key) =>
                        <div key={key} style={{display: "flex", gap: "10px"}}>
                            <img src={theme === Themes.dark ? Images.whiteCheckMark : cardDetails.checkSign}
                                 width={"20px"} height={"20px"} alt={"check"}/>
                            {item}
                        </div>
                    )}
                </div>
                {cardDetails.type!='free' && <div className={`${style.planButton}`} onClick={() => sendClick(cardDetails.title)} style={{
                    // background: handlePlanExpiration() && "red",
                    backgroundColor: cardDetails.buttonBackgroundColor,
                    color: cardDetails.buttonColor, fontWeight: "bold", height: "40px", borderRadius: "10px"
                }}>{cardDetails.planType}</div>}
            </div>
        </div>
    )
}