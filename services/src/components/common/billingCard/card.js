import React from "react";
import style from "./card.module.css";
import {Themes} from "../../../utils/constants";
import {Images} from "../../../utils/images";
import {useMediaQuery, useTheme} from "@mui/material";

export function BillingCard(props) {
    const {cardDetails, theme} = props;
    const themes = useTheme();
    const isMobile = useMediaQuery(themes.breakpoints.down('sm'));

    return (
        <div className={style.choosePlanDiv}
             style={{
                 backgroundColor: theme === Themes.dark ? cardDetails.darkBackgroundColor : cardDetails.lightBackgroundColor,
                 color: theme === Themes.dark ? "#FFFFFF" : cardDetails.color,
             }}>
            <div className={style.cardChildDiv}>
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
                <div className={style.planButton} style={{
                    backgroundColor: cardDetails.buttonBackgroundColor,
                    color: cardDetails.buttonColor, fontWeight: "bold", height: "40px", borderRadius: "10px"
                }}>{cardDetails.planType}</div>
            </div>
        </div>
    )
}