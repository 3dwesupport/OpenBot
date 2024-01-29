import {getProjects, getProjectsMonthlyStatus} from "../../database/APIs/projects";
import {useEffect, useState} from "react";
import {Month} from "../../utils/constants";
import {getModelDetails} from "../../database/APIs/models";
import {getServerDetails} from "../../database/APIs/remoteServer";
import {Chart} from "../common/chart/chart";

export function UsageAnalysis() {
    let date = new Date();
    const [usageDetails, setUsageDetails] = useState({
        projects: 0,
        models: 0,
        server: 0,
        runProjectCount: 0,
        projectsMonthlyArray: Array(12).fill(0)
    })

    useEffect(() => {
        Promise.all([getProjects(date.getFullYear(), Month[date.getMonth()]), getModelDetails(date.getFullYear(), Month[date.getMonth()]), getServerDetails(date.getFullYear(), Month[date.getMonth()]), getProjectsMonthlyStatus(date.getFullYear())]).then((res) => {
            console.log("res:::", res);
            setUsageDetails({
                ...usageDetails,
                projects: res[0],
                models: res[1],
                server: res[2],
                projectsMonthlyArray: res[3]
            })
        })
    }, [])
    return (
        <>
            <div>
                projects : {usageDetails?.projects}
                models : {usageDetails?.models}
                server : {usageDetails?.server}
            </div>
            <Chart usageDetails={usageDetails}/>
        </>
    )
}