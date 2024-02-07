import Card from "@mui/material/Card";
import React, {useContext} from "react";
import './usageAnalysisCard.css'
import {Themes, UserAnalysisCardData} from "../../utils/constants";
import {rgba} from "@react-spring/shared";
import {ThemeContext} from "../../App";

/**
 * function to display cards on the usageAnalysis Page
 * @returns {Element}
 * @constructor
 */
export function UsageAnalysisCardComponent(props) {
    const {theme} =useContext(ThemeContext);
    return (
        <>
            <div className={"analysisCardContainer"} style={{ backgroundColor: theme === Themes.dark ? '#303030' : '#FFFFFF' }}>
                {UserAnalysisCardData.map((card, index) => (
                    <Card sx={{borderRadius: 2, boxShadow: 5 , backgroundColor: theme === Themes.dark ? '#292929' : '#FFFFFF'}} key={index}>
                        <span className={"analysisCardText"} style={{color: theme === Themes.dark ? '#FFFFFF' : '#000000'}}> {card.text} </span>
                        <div className={"cardData"} style={{color: theme === Themes.dark ? '#FFFFFF' : '#000000'}} >
                            {index === 0 ? props.usageDetails.projects : index === 1 ? props.usageDetails.models : index === 2 ? 0 : index === 3 ? props.usageDetails.server : 0}
                        </div>
                    </Card>
                ))}
            </div>
        </>
    )
}