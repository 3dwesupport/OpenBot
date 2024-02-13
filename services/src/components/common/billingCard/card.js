import React from "react";
import style from "./card.module.css";

export function BillingCard(props) {
    const {cardDetails} = props;

    return (
        <div className={style.choosePlanDiv}
             style={{backgroundColor: cardDetails.backgroundColor, color: cardDetails.color}}>
            <div className={style.cardChildDiv}>
                <div className={style.descriptionDiv}>
                    <div className={style.planTitle}>{cardDetails.title}</div>
                    <div className={style.planCostDiv}>
                        <span style={{fontSize: "40px", fontWeight: "bold"}}>{cardDetails.cost}</span>
                        <span>/month</span>
                    </div>
                    <div>{cardDetails.description}</div>
                </div>
                <div className={style.planServices}>
                    {cardDetails.services.map((item, key) =>
                        <div key={key} style={{display: "flex", gap: "10px"}}>
                            <img src={cardDetails.checkSign} width={"20px"} alt={"check"}/>
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