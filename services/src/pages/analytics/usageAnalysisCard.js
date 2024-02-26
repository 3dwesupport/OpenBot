import Card from "@mui/material/Card";
import React, {useContext} from "react";
import './usageAnalysisCard.css'
import {Themes, UserAnalysisCardData} from "../../utils/constants";
import {ThemeContext} from "../../App";

/**
 * function to display cards on the usageAnalysis Page
 * @returns {Element}
 * @constructor
 */
export function UsageAnalysisCardComponent(props) {
    const {usageDetails} = props;
    const {theme} = useContext(ThemeContext);
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
                                {card.value} {index === 3 && <span style={{fontSize: "20px"}}>sec</span>}
                            </div>
                        }
                    </Card>
                ))}
            </div>
        </>
    )
}