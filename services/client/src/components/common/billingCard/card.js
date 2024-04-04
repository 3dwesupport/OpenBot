import React from "react";
import style from "./card.module.css";
import {Themes, userPlan} from "../../../utils/constants";
import {Images} from "../../../utils/images";
import {useMediaQuery, useTheme} from "@mui/material";

export function BillingCard(props) {
    const {cardDetails, theme, paymentCheckout, isActivePlan} = props;
    const themes = useTheme();
    const isMobile = useMediaQuery(themes.breakpoints.down('sm'));

    function sendClick(e) {
        paymentCheckout(e);
    }

    function handlePlanActivity() {
        switch (cardDetails.type) {
            case "free" :
                return {
                    status: isActivePlan.status === "ACTIVE" && isActivePlan.type === cardDetails.type,
                    color: {
                        active: theme === Themes.dark ? "#303030" : "#FFFFFF",
                        expired: theme === Themes.dark ? "#303030" : "#FFFFFF"
                    },
                    activeButton: "false",
                };

            case "standard":
                if (isActivePlan.type === "premium") {
                    return {
                        status: isActivePlan.status === "ACTIVE",
                        color: {
                            active: theme === Themes.dark ? "#303030" : "#303030",
                            expired: theme === Themes.dark ? "#0071C5" : "#0071C5"
                        },
                        activeButton: "true",
                    };
                }

                if (isActivePlan.type === 'free') {
                    return {
                        status: isActivePlan.status === 'ACTIVE',
                        color: {
                            active: theme === Themes.dark ? "#0071C5" : "#0071C5",
                            expired: theme === Themes.dark ? "#0071C5" : "#303030",
                        },
                        activeButton: "false"
                    }
                }

                return {
                    status: isActivePlan.status === "ACTIVE" && isActivePlan.type === cardDetails.type,
                    color: {
                        active: theme === Themes.dark ? "#303030" : "#303030",
                        expired: theme === Themes.dark ? "#0071C5" : "#303030",
                    },
                    activeButton: "true",
                };
            case "premium" :

                if (isActivePlan.type === 'standard') {
                    return {
                        status: isActivePlan.status === "ACTIVE" && isActivePlan.type === cardDetails.type,
                        color: {
                            active: theme === Themes.dark ? "#303030" : "#303030",
                            expired: theme === Themes.dark ? "#0071C5" : "#0071C5"
                        },
                        activeButton: "false",
                    }
                }
                if (isActivePlan.type === 'free') {
                    return {
                        status: isActivePlan.status === "ACTIVE" && isActivePlan.type === cardDetails.type,
                        color: {
                            active: theme === Themes.dark ? "#303030" : "#303030",
                            expired: theme === Themes.dark ? "#0071C5" : "#0071C5"
                        },
                        activeButton: "false",
                    }
                }
                return {
                    status: isActivePlan.status === "ACTIVE" && isActivePlan.type === cardDetails.type,
                    color: {
                        active: theme === Themes.dark ? "#303030" : "#303030",
                        expired: theme === Themes.dark ? "#0071C5" : "#0071C5"
                    },
                    activeButton: "true",

                };

            default:
                return;
        }
    }

    return (
        <div className={style.choosePlanDiv}
             style={{
                 backgroundColor: handlePlanActivity().status ? handlePlanActivity().color.active : handlePlanActivity().color.expired,
                 color: theme === Themes.dark ? "#FFFFFF" : cardDetails.color,
             }}>

            <div className={style.cardChildDiv}>
                <div className={style.descriptionDiv}>

                    <div className={style.planTitle}>{cardDetails.title}
                        <div className={style.innerDiv}></div>
                        <div
                            className={isActivePlan.type === cardDetails.type && (isActivePlan.status ==='ACTIVE' ? style.activeDot : style.inActiveDot)}></div>
                        <p>{isActivePlan.type === cardDetails.type && isActivePlan.status}</p>
                    </div>

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


                {(cardDetails.type !== "free" && (handlePlanActivity().activeButton === "false" || isActivePlan.status ==='EXPIRED')) &&
                    <div className={`${style.planButton}`}
                         onClick={handlePlanActivity().status ? null : () => {
                             if (!handlePlanActivity().status) {
                                 sendClick(cardDetails.title)
                             }
                         }}
                         style={{
                             backgroundColor: cardDetails.buttonBackgroundColor,
                             color: cardDetails.buttonColor, fontWeight: "bold", height: "40px", borderRadius: "10px",
                         }}>{cardDetails.planType}</div>}

            </div>
        </div>
    )
}