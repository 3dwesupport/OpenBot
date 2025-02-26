import React from "react";
import style from "./card.module.css";
import { Constants, Themes, Colors, upgradePlans} from "../../../utils/constants";
import { Images } from "../../../utils/images";
import { useMediaQuery, useTheme } from "@mui/material";

export function BillingCard(props) {
    const { cardDetails, theme, paymentCheckout, isActivePlan } = props;
    const themes = useTheme();
    const isMobile = useMediaQuery(themes.breakpoints.down('sm'));

    function sendClick(e) {
        paymentCheckout(e);
    }

    function handlePlanActivity() {
        switch (cardDetails.type) {
            case Constants.free:
                return {
                    status: isActivePlan.status === Constants.active && isActivePlan.type === cardDetails.type,
                    color: {
                        active: theme === Themes.dark ? Colors.darkBackgroundColor : Colors.lightBackgroundColor,
                        expired: theme === Themes.dark ? Colors.darkBackgroundColor : Colors.lightBackgroundColor
                    },
                    activeButton: Constants.false,
                };

            case Constants.standard:
                if (isActivePlan.type === Constants.premium) {
                    return {
                        status: isActivePlan.status === Constants.active,
                        color: {
                            active: theme === Themes.dark ? Colors.darkBackgroundColor : Colors.lightBackgroundColor,
                            expired: Colors.activeColor
                        },
                        activeButton: Constants.true,
                    };
                }

                if (isActivePlan.type === Constants.free) {
                    return {
                        status: isActivePlan.status === Constants.active,
                        color: {
                            active: Colors.activeColor,
                            expired: Colors.activeColor
                        },
                        activeButton: Constants.false
                    }
                }

                return {
                    status: isActivePlan.status === Constants.active && isActivePlan.type === cardDetails.type,
                    color: {
                        active: theme === Themes.dark ? Colors.darkBackgroundColor : Colors.lightBackgroundColor,
                        expired: Colors.activeColor
                    },
                    activeButton: Constants.true,
                };
            case Constants.premium:
                if (isActivePlan.type === Constants.standard) {
                    return {
                        status: isActivePlan.status === Constants.active && isActivePlan.type === cardDetails.type,
                        color: {
                            active: theme === Themes.dark ? Colors.darkBackgroundColor : Colors.lightBackgroundColor,
                            expired: Colors.activeColor
                        },
                        activeButton: Constants.false,
                    }
                }
                if (isActivePlan.type === Constants.free) {
                    return {
                        status: isActivePlan.status === Constants.active && isActivePlan.type === cardDetails.type,
                        color: {
                            active: Colors.darkBackgroundColor,
                            expired: Colors.activeColor
                        },
                        activeButton: Constants.false,
                    }
                }
                return {
                    status: isActivePlan.status === Constants.active && isActivePlan.type === cardDetails.type,
                    color: {
                        active: theme === Themes.dark ? Colors.darkBackgroundColor : Colors.lightBackgroundColor,
                        expired: Colors.activeColor
                    },
                    activeButton: Constants.true,
                };
            default:
                return;
        }
    }

    const planActivity = handlePlanActivity();
    const backgroundColor = planActivity.status ? planActivity.color.active : planActivity.color.expired;
    const checkMarkImage = backgroundColor === Colors.whiteColor ? Images.blackCheckMark:Images.whiteCheckMark ;

    return (
        <div className={style.choosePlanDiv}
             style={{
                 backgroundColor: backgroundColor,
                 color: theme === Themes.dark ? Colors.whiteColor : (cardDetails.type !== Constants.free && (planActivity.activeButton === Constants.false || isActivePlan.status === Constants.expired)) ?
                     Colors.whiteColor : Colors.blackColor,
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
                            style={{ fontSize: isMobile ? "30px" : "40px", fontWeight: "bold" }}>{cardDetails.cost}</span>
                        <span>/month</span>
                    </div>
                    <div>{cardDetails.description}</div>
                </div>
                <div className={style.planServices}>
                    {cardDetails.services.map((item, key) =>
                        <div key={key} style={{ display: "flex", gap: "10px" }}>
                            <img src={themes===Themes.dark ? Images.whiteCheckMark:checkMarkImage} width={"20px"} height={"20px"} alt={"check"} />
                            {item}
                        </div>
                    )}
                </div>

                {(cardDetails.type !== Constants.free && (planActivity.activeButton === Constants.false || isActivePlan.status === Constants.expired)) &&
                    <div className={`${style.planButton}`}
                         onClick={() => {
                             console.log("button clicked::::");
                             sendClick(cardDetails.title)
                         }}
                         style={{
                             backgroundColor: Colors.buttonBackgroundColor,
                             color: Colors.buttonColor, fontWeight: "bold", height: "40px", borderRadius: "10px",
                             marginTop: cardDetails.type === Constants.premium && "-15px"
                         }}>{isActivePlan.type === cardDetails.type ? (isActivePlan.status === Constants.expired && upgradePlans.planType) : upgradePlans.planType}</div>}
                {(cardDetails.type === Constants.free && isActivePlan.status === Constants.expired) && (
                    <p style={{ fontWeight: "bold", fontSize: "18px" }}>Note: Your free trial has ended. Please upgrade to
                        continue.</p>)}
            </div>
        </div>
    );
}
