import React, {useContext, useEffect, useState} from "react";
import {Chart} from "../../components/common/chart/chart";
import {getProjects, getProjectsMonthlyBasis} from "../../database/APIs/projects";
import {Constants, localStorageKeys, Month, Themes} from "../../utils/constants";
import {getModelDetails} from "../../database/APIs/models";
import {getServerDetails} from "../../database/APIs/remoteServer";
import './usageAnalysis.css'
import {UsageAnalysisCardComponent} from "./usageAnalysisCard";
import Card from "@mui/material/Card";
import {BillingHeaderComponent} from "../../components/common/billingHeader/billingHeader";
import {ThemeContext} from "../../App";
import {SubscriptionCookie} from "../../components/common/cookie/subscriptionCookie";
import Cookies from "js-cookie";
import {AnalyticsLoader} from "../../components/common/loader/loader";

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
    const [isAnalyticsLoader, setIsAnalyticsLoader] = useState(false);
    const [usageDetails, setUsageDetails] = useState({
        projects: 0,
        models: 0,
        server: 0,
        runProjectCount: 0,
        projectsMonthlyArray: Array(12).fill(0)
    })
    const plan = Cookies.get(localStorageKeys.planDetails);
    const type = plan ? JSON.parse(plan) : ""

    function onDataChange(e) {
        Month.includes(e) ? setIsChangedMonth(e) : setIsChangedYear(e);
    }

    useEffect(() => {
        setIsAnalyticsLoader(true);
        Promise.all([getProjects(isChangedYear, isChangedMonth), getModelDetails(isChangedYear, isChangedMonth), getServerDetails(isChangedYear, isChangedMonth), getProjectsMonthlyBasis(isChangedYear)]).then((res) => {
            setUsageDetails({
                ...usageDetails,
                projects: res[0],
                models: res[1],
                server: res[2],
                projectsMonthlyArray: res[3]
            })
            setIsAnalyticsLoader(false);
        })
            .catch((e) => {
                console.log(e);
                setIsAnalyticsLoader(false);
            })
    }, [isChangedMonth, isChangedYear])

    return (
        <>
            {type?.planType === Constants.free && <SubscriptionCookie/>}
            {isAnalyticsLoader && <AnalyticsLoader/>}
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