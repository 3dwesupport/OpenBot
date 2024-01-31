import Card from "@mui/material/Card";
import React from "react";
import './usageAnalysisCard.css'
import {UserAnalysisCardData} from "../../utils/constants";

/**
 * function to display cards on the usageAnalysis Page
 * @returns {Element}
 * @constructor
 */
export function UsageAnalysisCardComponent() {

    return (
        <>
            <div className={"analysisCardContainer"}>
                {UserAnalysisCardData.map((card, index) => (
                    <Card  sx={{borderRadius: 2}} key={index}>
                        <span className={"analysisCardText"}> {card.text}</span>
                    </Card>
                ))}
            </div>
        </>
    )
}