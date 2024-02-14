import React, {useContext, useEffect, useState} from "react";
import {Chart} from "../../components/common/chart/chart";
import {getProjects, getProjectsMonthlyBasis} from "../../database/APIs/projects";
import {Constants, Month, Themes} from "../../utils/constants";
import {getModelDetails} from "../../database/APIs/models";
import {getServerDetails} from "../../database/APIs/remoteServer";
import './usageAnalysis.css'
import {UsageAnalysisCardComponent} from "./usageAnalysisCard";
import Card from "@mui/material/Card";
import {BillingHeaderComponent} from "../../components/common/billingHeader/billingHeader";
import {ThemeContext} from "../../App";

/**
 * function to display usage analytics stats
 * @returns {JSX.Element}
 * @constructor
 */
export function UsageAnalysis() {
    const {theme} = useContext(ThemeContext);
    let date = new Date();
    const [isChangedMonth, setIsChangedMonth] = useState(Month[date.getMonth()]);
    const [isChangedYear, setIsChangedYear] = useState(date.getFullYear());
    const [usageDetails, setUsageDetails] = useState({
        projects: 0,
        models: 0,
        server: 0,
        runProjectCount: 0,
        projectsMonthlyArray: Array(12).fill(0)
    })

    function onDataChange(e) {
        Month.includes(e) ? setIsChangedMonth(e) : setIsChangedYear(e);
    }

    useEffect(() => {
        Promise.all([getProjects(isChangedYear, isChangedMonth), getModelDetails(isChangedYear, isChangedMonth), getServerDetails(isChangedYear, isChangedMonth), getProjectsMonthlyBasis(isChangedYear)]).then((res) => {
            setUsageDetails({
                ...usageDetails,
                projects: res[0],
                models: res[1],
                server: res[2],
                projectsMonthlyArray: res[3]
            })
        })
    }, [isChangedMonth, isChangedYear])

    return (
        <>
            <div style={{height: "100vh", backgroundColor: theme === Themes.dark ? '#202020' : ''}}>
                <BillingHeaderComponent title={Constants.usageAnalysis} onDataChange={onDataChange} theme={theme}/>
                <div className={"userAnalysisContainer"}
                     style={{backgroundColor: theme === Themes.dark ? '#202020' : ''}}>
                    <div className={"cardChartContainer"}>
                        <UsageAnalysisCardComponent usageDetails={usageDetails}/>
                        <div className={"chartDiv"}>
                            <Card style={{
                                position: "relative",
                                borderRadius: "2%",
                                backgroundColor: theme === Themes.dark ? '#292929' : '#FFFFFF',
                                height: "100%",
                            }}>
                                <Chart usageDetails={usageDetails}/>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}