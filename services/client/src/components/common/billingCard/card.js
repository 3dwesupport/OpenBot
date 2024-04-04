import React from "react";
import style from "./card.module.css";
import {Themes, userPlan} from "../../../utils/constants";
import {Images} from "../../../utils/images";
import {useMediaQuery, useTheme} from "@mui/material";

export function BillingCard(props) {
    const {cardDetails, theme, paymentCheckout, isActivePlan, plantype} = props;
    const themes = useTheme();
    const isMobile = useMediaQuery(themes.breakpoints.down('sm'));

    function sendClick(e) {
        paymentCheckout(e);
    }


    function handlePlanActivity() {

        switch (cardDetails.type) {
            case "free" :
                return {
                    status: isActivePlan.status === "ACTIVE" && cardDetails.type === isActivePlan.type,
                    color: {
                        active: theme === Themes.dark ? "#303030" : "#FFFFFF",
                        expired: theme === Themes.dark ? "#303030" : "#FFFFFF"
                    }
                };
            case "standard":
                if (isActivePlan.type === "premium") {
                    return {
                        status: isActivePlan.status === "ACTIVE",
                        color: {
                            active: theme === Themes.dark ? "#303030" : "#303030",
                            expired: theme === Themes.dark ? "#0071C5" : "#0071C5"
                        }
                    };
                }
                return {
                    status: isActivePlan.status === "ACTIVE" && isActivePlan.type === cardDetails.type,
                    color: {
                        active: theme === Themes.dark ? "#303030" : "#0071C5",
                        expired: theme === Themes.dark ? "#0071C5" : "#303030"
                    }
                };
            case "premium" :

                return {
                    status: isActivePlan.status === "ACTIVE" && isActivePlan.type === cardDetails.type,
                    color: {
                        active: theme === Themes.dark ? "#303030" : "#303030",
                        expired: theme === Themes.dark ? "#0071C5" : "#0071C5"
                    }
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
                {isActivePlan.type === cardDetails.type && isActivePlan.status}
                {/*{isActivePlan.status === 'premium'}*/}
                {/*{handlePlanActivity() ? isActivePlan.status:''}*/}
                {/*{isActivePlan &&*/}
                {/*}*/}
                {/*{(isActivePlan.status === "ACTIVE" && isActivePlan.type === cardDetails.type) ?*/}
                {/*    (<p style={{justifyContent: 'center', color: '#959595'}}>{isActivePlan.status}</p>) :*/}
                {/*    (isActivePlan.status === "EXPIRED" && isActivePlan.type === cardDetails.type) && (*/}
                {/*        <p>{isActivePlan.status}</p>)}*/}

                <div className={style.descriptionDiv}>
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


                {cardDetails.type !== "free" &&
                    <div className={`${style.planButton}`}
                         onClick={() => sendClick(cardDetails.title)} style={{
                        // background: handlePlanExpiration() && "red",
                        backgroundColor: handlePlanActivity() ? "#f0f0f0" : cardDetails.buttonBackgroundColor,
                        color: cardDetails.buttonColor, fontWeight: "bold", height: "40px", borderRadius: "10px",
                        disabled: handlePlanActivity()
                    }}>{cardDetails.planType}</div>}

            </div>
        </div>
    )
}