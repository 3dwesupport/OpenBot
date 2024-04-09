import React from "react";
import style from "./card.module.css";
import {Constants, Themes, userPlan} from "../../../utils/constants";
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
            case Constants.free :
                return {
                    status: isActivePlan.status === Constants.active && isActivePlan.type === cardDetails.type,
                    color: {
                        active: theme === Themes.dark ? userPlan[0].darkBackgroundColor : userPlan[0].lightBackgroundColor,
                        expired: theme === Themes.dark ? userPlan[0].darkBackgroundColor : userPlan[0].lightBackgroundColor
                    },
                    activeButton: Constants.false,
                };

            case Constants.standard:
                if (isActivePlan.type === Constants.premium) {
                    return {
                        status: isActivePlan.status === Constants.active,
                        color: {
                            active: theme === Themes.dark ? userPlan[0].darkBackgroundColor : userPlan[0].darkBackgroundColor,
                            expired: theme === Themes.dark ? userPlan[1].lightBackgroundColor : userPlan[1].lightBackgroundColor
                        },
                        activeButton: Constants.true,
                    };
                }

                if (isActivePlan.type === Constants.free) {
                    return {
                        status: isActivePlan.status === Constants.active,
                        color: {
                            active: theme === Themes.dark ? userPlan[1].lightBackgroundColor : userPlan[1].lightBackgroundColor,
                            expired: theme === Themes.dark ? userPlan[1].lightBackgroundColor : userPlan[0].darkBackgroundColor,
                        },
                        activeButton: Constants.false
                    }
                }

                return {
                    status: isActivePlan.status === Constants.active && isActivePlan.type === cardDetails.type,
                    color: {
                        active: theme === Themes.dark ? userPlan[0].darkBackgroundColor : userPlan[0].darkBackgroundColor,
                        expired: theme === Themes.dark ? userPlan[1].lightBackgroundColor : userPlan[0].darkBackgroundColor,
                    },
                    activeButton: Constants.true,
                };
            case Constants.premium :

                if (isActivePlan.type === Constants.standard) {
                    return {
                        status: isActivePlan.status === Constants.active && isActivePlan.type === cardDetails.type,
                        color: {
                            active: theme === Themes.dark ? userPlan[0].darkBackgroundColor : userPlan[0].darkBackgroundColor,
                            expired: theme === Themes.dark ? userPlan[2].lightBackgroundColor : userPlan[2].lightBackgroundColor
                        },
                        activeButton: Constants.false,
                    }
                }
                if (isActivePlan.type === Constants.free) {
                    return {
                        status: isActivePlan.status === Constants.active && isActivePlan.type === cardDetails.type,
                        color: {
                            active: theme === Themes.dark ? userPlan[0].darkBackgroundColor : userPlan[0].darkBackgroundColor,
                            expired: theme === Themes.dark ? userPlan[2].lightBackgroundColor : userPlan[2].lightBackgroundColor
                        },
                        activeButton: Constants.false,
                    }
                }
                return {
                    status: isActivePlan.status === Constants.active && isActivePlan.type === cardDetails.type,
                    color: {
                        active: theme === Themes.dark ? userPlan[0].darkBackgroundColor : userPlan[0].darkBackgroundColor,
                        expired: theme === Themes.dark ? userPlan[2].lightBackgroundColor : userPlan[2].lightBackgroundColor
                    },
                    activeButton: Constants.true,
                };
            default:
                return;
        }
    }

    return (
        <div className={style.choosePlanDiv}
             style={{
                 backgroundColor: handlePlanActivity().status ? handlePlanActivity().color.active : handlePlanActivity().color.expired,
                 color: theme === Themes.dark ? userPlan[0].lightBackgroundColor : cardDetails.color,
             }}>

            <div className={style.cardChildDiv}>
                <div className={style.descriptionDiv}>

                    <div className={style.planTitle}>{cardDetails.title}
                        <div className={style.innerDiv}></div>
                        <div
                            className={isActivePlan.type === cardDetails.type ? (isActivePlan.status === Constants.active ? style.activeDot : style.inActiveDot) : ''}></div>
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


                {(cardDetails.type !== Constants.free && (handlePlanActivity().activeButton === Constants.false || isActivePlan.status === Constants.expired)) &&
                    <div className={`${style.planButton}`}
                         onClick={() => {
                             console.log("button clicked::::");
                             sendClick(cardDetails.title)
                         }}
                         style={{
                             backgroundColor: cardDetails.buttonBackgroundColor,
                             color: cardDetails.buttonColor, fontWeight: "bold", height: "40px", borderRadius: "10px",
                             marginTop:cardDetails.type===Constants.premium&&"-15px"
                         }}>{cardDetails.planType}</div>}
                {(cardDetails.type === Constants.free && isActivePlan.status === Constants.expired) && ("Note: Your free trial has ended. Please upgrade to continue.")}
            </div>

        </div>
    )
}