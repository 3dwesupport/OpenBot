import Card from '@mui/material/Card';
import {Images} from "../../../utils/images";
import React from "react";

/**
 * function to display Card component on dashboard
 * @param value
 * @param handleCardClick
 * @param index
 * @returns {JSX.Element}
 * @constructor
 */
export function CardComponent({value, handleCardClick, index}) {

    // function to handle click on card component
    const handleClick = () => {
        handleCardClick(value);
    };
    const isCommonIconVisible = index < 3 ? Images.openInNewFileIcon : null;
    return (
        <Card sx={{
            width: "100%", display: "flex", flexDirection: "column", alignItems: "center", position: "relative",
            justifyContent: "center", backgroundColor: value.bgColor, borderRadius: 3, height: "100%", gap: "4%",cursor:"pointer"
        }} onClick={handleClick}>
            {isCommonIconVisible && (
                <div className={"newFileIcon"}>
                    <img src={Images.openInNewFileIcon} style={{height: "20px", width: "20px"}} alt={"icon"}/>
                </div>)}
            <div className={"cardImageAndText"}>
                <img src={value.image} className={"cardImage"} alt="Card Image"/>
                <span className={"textStyleDiv"}>{value.text}</span>
            </div>
        </Card>
    );
}
