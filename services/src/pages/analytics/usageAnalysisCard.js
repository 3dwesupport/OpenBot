import Card from "@mui/material/Card";
import React from "react";
import './usageAnalysisCard.css'
import {UserAnalysisCardData} from "../../utils/constants";
import {rgba} from "@react-spring/shared";

/**
 * function to display cards on the usageAnalysis Page
 * @returns {Element}
 * @constructor
 */
export function UsageAnalysisCardComponent(props) {
    return (
        <>
            <div className={"analysisCardContainer"}>
                {UserAnalysisCardData.map((card, index) => (
                    <Card sx={{borderRadius: 2, boxShadow: 5}} key={index}>
                        <span className={"analysisCardText"}> {card.text}</span>
                        <div className={"cardData"}>
                            {index === 0 ? props.usageDetails.projects : index === 1 ? props.usageDetails.models : index === 2 ? 0 : index === 3 ? props.usageDetails.server : 0}
                        </div>
                    </Card>
                ))}
            </div>
        </>
    )
}