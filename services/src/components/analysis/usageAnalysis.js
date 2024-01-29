import {getProjects, getProjectsMonthlyStatus} from "../../database/APIs/projects";
import {useEffect, useState} from "react";
import {Month} from "../../utils/constants";
import {getModelDetails} from "../../database/APIs/models";
import {getServerDetails} from "../../database/APIs/remoteServer";
import {LineChart} from '@mui/x-charts/LineChart';
import {Images} from "../../utils/images";
import styles from "./usageAnalysis.module.css"

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

    const firstHalfY = usageDetails?.projectsMonthlyArray.slice(0, 6);
    const secondHalfY = usageDetails?.projectsMonthlyArray.slice(0, -6);

    return (
        <>
            <div>
                projects : {usageDetails?.projects}
                models : {usageDetails?.models}
                server : {usageDetails?.server}
            </div>
            <div style={{position: "relative", width: "50%"}}>
                <div className={styles.chartYAxisLabel}>
                    <span>Compile code (Blockly)</span>
                    <img src={Images.lightChartArrow} alt={"arrow"} height={20} width={15}
                    />
                </div>
                <LineChart
                    width={600}
                    height={300}
                    series={[{
                        data: date.getMonth() < 6 ? firstHalfY : secondHalfY,
                        area: true,
                        showMark: false,
                        color: "#459CDE",
                    }]}
                    xAxis={[{
                        tickLabelStyle: {
                            fill: "#969696"
                        },
                        tickFontSize: 12,
                        scaleType: 'point',
                        data: date.getMonth() < 6 ? Month.slice(0, 6) : Month.slice(-6),
                    }]}
                    yAxis={[{
                        tickLabelStyle: {
                            fill: "#969696"
                        },
                        tickFontSize: 12,
                    }]}
                    sx={{
                        '.MuiLineElement-root': {
                            // display: 'none',
                        },
                        ".MuiChartsAxis-line": {
                            stroke: "none !important",
                        },
                        ".MuiChartsAxis-tick": {
                            stroke: "none !important",
                        },
                    }}
                />
                <div className={styles.chartXAxisLabel}>
                    <img style={{
                        transform: "rotate(90deg)",
                    }} src={Images.lightChartArrow} alt={"arrow"} height={20} width={15}/>
                </div>
            </div>
        </>
    )
}