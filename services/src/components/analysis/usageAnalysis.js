import {getProjects} from "../../database/APIs/projects";
import {useEffect, useState} from "react";
import {Month} from "../../utils/constants";
import {getModelDetails} from "../../database/APIs/models";
import {getServerDetails} from "../../database/APIs/remoteServer";

export function UsageAnalysis() {
    let newYear = new Date();
    const [usageDetails, setUsageDetails] = useState({
        projects: 0,
        models: 0,
        server: 0,
        runProjectCount: 0
    })
    useEffect(() => {
        Promise.all([getProjects(newYear.getFullYear(), Month[newYear.getMonth()]), getModelDetails(newYear.getFullYear(), Month[newYear.getMonth()]), getServerDetails(newYear.getFullYear(), Month[newYear.getMonth()])]).then((res) => {
            console.log("res:::", res);
            setUsageDetails({
                ...usageDetails,
                projects: res[0],
                models: res[1],
                server: res[2],
            })
        })
    }, [])

    return (
        <>
            projects : {usageDetails?.projects}
            models : {usageDetails?.models}
            server : {usageDetails?.server}
        </>
    )
}