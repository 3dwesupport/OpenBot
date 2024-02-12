import React from "react";
import style from "./card.module.css";

export function BillingCard(props) {
    const {cardDetails} = props;

    return (
        <div className={style.choosePlanDiv}
             style={{backgroundColor: cardDetails.backgroundColor, color: cardDetails.color}}>
            <div className={style.cardChildDiv}>
                <div className={style.descriptionDiv}>
                    <div>{cardDetails.title}</div>
                    <div>{cardDetails.cost}<span>/month</span></div>
                    <div>{cardDetails.description}</div>
                </div>
                <div>
                    {cardDetails.services.map((item, key) =>
                        <div key={key}>{item}</div>
                    )}
                </div>
                <button>{cardDetails.planType}</button>
            </div>
        </div>
    )
}