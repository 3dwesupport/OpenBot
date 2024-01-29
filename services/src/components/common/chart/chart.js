import React from "react";
import style from "./chart.module.css"
import {Images} from "../../../utils/images";
import {LineChart} from "@mui/x-charts/LineChart";
import {Month} from "../../../utils/constants";

export function Chart(props) {
    const {usageDetails} = props;
    let date = new Date();
    const firstHalfY = usageDetails?.projectsMonthlyArray.slice(0, 6);
    const secondHalfY = usageDetails?.projectsMonthlyArray.slice(0, -6);
    return (
        <>
            <div style={{position: "relative", width: "50%"}}>
                <div className={style.chartYAxisLabel}>
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
                <div className={style.chartXAxisLabel}>
                    <img style={{
                        transform: "rotate(90deg)",
                    }} src={Images.lightChartArrow} alt={"arrow"} height={20} width={15}/>
                </div>
            </div>
        </>
    )
}