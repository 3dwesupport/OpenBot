import React from "react";
import style from "./chart.module.css"
import {Images} from "../../../utils/images";
import {LineChart} from "@mui/x-charts/LineChart";
import {Month} from "../../../utils/constants";

/**
 * function to display chart component
 * @param props
 * @returns {Element}
 * @constructor
 */



export function Chart(props) {
    const {usageDetails} = props;
    let date = new Date();
    const firstHalfY = usageDetails?.slice(0, 6);
    const secondHalfY = usageDetails?.slice(0, -6);

    return (
        <>
            <div className={style.chartYAxisLabel}>
                <span style={{marginTop: "10px"}}>Compile code (Blockly)</span>
                <img src={Images.lightChartArrow} alt={"arrow"} height={20} width={15}
                />
            </div>
            <LineChart
                margin={{top: 80}}
                series={[{
                    data: date.getMonth() < 6 ? firstHalfY : secondHalfY,
                    area: true,
                    showMark: false,
                    color: "#459CDE",
                    // highlightScope: {
                    //     backgroundColor: "tomato"
                    // }
                }]}
                xAxis={[{
                    tickLabelStyle: {
                        fill: "#969696"
                    },
                    tickFontSize: 12,
                    scaleType: 'point',
                    data: date.getMonth() < 6 ? Month.slice(0, 6).map(month => month.slice(0, 3)) : Month.slice(-6).map(month => month.slice(0, 3)),
                }]}
                yAxis={[{
                    tickLabelStyle: {
                        fill: "#969696"
                    },
                    tickFontSize: 12,
                }]}
                sx={{
                    '.MuiLineElement-root': {
                        zIndex: 999
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
        </>
    )
}