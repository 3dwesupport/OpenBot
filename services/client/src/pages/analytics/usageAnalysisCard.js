import Card from "@mui/material/Card";
import React, {useContext} from "react";
import './usageAnalysisCard.css'
import {Themes, timeUnits} from "../../utils/constants";
import {ThemeContext} from "../../App";

/**
 * function to display cards on the usageAnalysis Page
 * @returns {Element}
 * @constructor
 */
export function UsageAnalysisCardComponent(props) {
    const {usageDetails} = props;
    const {theme} = useContext(ThemeContext);


    /**
     * function to display time units
     * @param value
     * @returns {{timesValue: number, unitsValue: string}}
     */
    function formatTime(value) {
        if (value >= 365 * 24 * 60 * 60) {
            return {timesValue:Math.floor(value / (365 * 24 * 60 * 60)) , unitsValue:timeUnits.years};
        } else if (value >= 30 * 24 * 60 * 60) {
            return {timesValue:Math.floor(value / (30 * 24 * 60 * 60)), unitsValue:timeUnits.month};
        } else if (value >= 24 * 60 * 60) {
            return {timesValue:Math.floor(value / (24 * 60 * 60)), unitsValue:timeUnits.days};
        } else if (value >= 60 * 60) {
            return {timesValue:Math.floor(value / (60 * 60)), unitsValue:timeUnits.hours};
        } else if (value >= 60) {
            return {timesValue:Math.floor(value / (60)), unitsValue:timeUnits.minutes};
        } else {
            return {timesValue:Math.floor(value), unitsValue:timeUnits.seconds};
        }
    }

    return (
        <>
            <div className={"analysisCardContainer"}
                 style={{backgroundColor: theme === Themes.dark ? '#202020' : '#FFFFFF'}}>
                {usageDetails.map((card, index) => (
                    <Card sx={{
                        borderRadius: 2,
                        boxShadow: 5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        backgroundColor: theme === Themes.dark ? '#292929' : '#FFFFFF'
                    }} key={index}>
                        <span className={"analysisCardText"}
                              style={{color: theme === Themes.dark ? '#FFFFFF' : '#000000'}}> {card.text} </span>
                        {card.value === 0 ?
                            <div className={"emptyMessage"}
                                 style={{color: theme === Themes.dark ? '#FFFFFF' : '#000000'}}>
                                {card.emptyMessage}
                            </div> :
                            <div className={"cardData"} style={{color: theme === Themes.dark ? '#FFFFFF' : '#000000'}}>
                                {index === 3 ? (
                                    // calculate time units
                                    <div>
                                        <span style={{fontSize: "40px"}}>{formatTime(Math.floor(card.value)).timesValue}</span>
                                        <span style={{fontSize: "20px"}}> {formatTime(Math.floor(card.value)).unitsValue}</span>
                                    </div>
                                ) : (
                                    <span>{Math.floor(card.value)}</span>
                                )}
                            </div>
                        }
                    </Card>
                ))}
            </div>
        </>
    )
}