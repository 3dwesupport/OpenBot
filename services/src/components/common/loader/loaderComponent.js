import React from "react";
import {Backdrop, CircularProgress} from "@mui/material";

/**
 * LoaderComponent is a React functional component that renders a circular progress indicator.
 * @param {Object} props - Component properties.
 * @param {string} props.color - Color of the circular progress indicator.
 * @param {number} props.thickness - Thickness of the circular progress indicator.
 * @returns {JSX.Element} - Rendered React element representing the circular loader.
 */
export default function LoaderComponent(props){
    return <div>
       <CircularProgress style={{color:props.color}}  thickness={props.thickness}/>
    {/*<Backdrop*/}
    {/*    sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={true}>*/}
    {/*    <CircularProgress color="inherit" />*/}
    {/*</Backdrop>*/}
    </div>

}