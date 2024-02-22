import React from "react";
import {Backdrop, CircularProgress} from "@mui/material";
import style from "./loader.module.css";

/**
 * LoaderComponent is a React functional component that renders a circular progress indicator.
 * @param {Object} props - Component properties.
 * @param {string} props.color - Color of the circular progress indicator.
 * @param {number} props.thickness - Thickness of the circular progress indicator.
 * @returns {JSX.Element} - Rendered React element representing the circular loader.
 */
export default function LoaderComponent(props) {
    return <div>
        <CircularProgress style={{color: props.color}} thickness={props.thickness}/>
    </div>
}

export function AnalyticsLoader() {
    return (
        <Backdrop open={true} sx={{zIndex: 999}}>
            <div className={style.loadingWave}>
                <div className={style.loadingBar}></div>
                <div className={style.loadingBar}></div>
                <div className={style.loadingBar}></div>
                <div className={style.loadingBar}></div>
            </div>
        </Backdrop>
    );
}