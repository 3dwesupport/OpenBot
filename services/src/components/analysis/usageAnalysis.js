import {getProjects} from "../../database/APIs/projects";
import {useEffect, useState} from "react";
import {Month} from "../../utils/constants";

// import { LineChart } from '@mui/x-charts/LineChart';


export function UsageAnalysis() {
    let newYear = new Date();
    const [usageDetails, setUsageDetails] = useState({
        projects: 0,
        models: 0,
        server: 0,
        runProjectCount: 0
    })

    useEffect(() => {
        getProjects(newYear.getFullYear(), Month[newYear.getMonth()]).then((res) => {
            setUsageDetails({
                ...usageDetails,
                projects: res
            })
        })
    }, [usageDetails])

    return (
        <>
            projects : {usageDetails?.projects}
        </>
    )
}