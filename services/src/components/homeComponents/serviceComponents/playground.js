import React, {useContext} from "react";
import "./card.css"
import Card from '@mui/material/Card';
import {Images} from "../../../utils/images";

export function HomeServices() {
    return (
        <div className={"container"}>
            <div className={"txtDiv"}>
             <span className="title">
              <span style={{fontWeight: 'bold'}}>WELCOME</span>, NAME
        </span>
            </div>

            <div className="cardContainer">
                <CardComponent handleServices={redirectToPlayground} bgColor={"#FFAB1A"} image={Images.openbotCardIcon}
                               text="OpenBot Playground"/>
                <CardComponent bgColor={"#8156C9"} image={Images.webServerCardIcon} text="Web Server"/>
                <CardComponent bgColor={"#4B40D6"} image={Images.trainModelCardIcon} text="Train your Own Model"/>
                <CardComponent bgColor={"#5C96EA"} image={Images.billingCardIcon} text="Billing"/>
                <CardComponent bgColor={"#EA3D78"} image={Images.downloadCloudCardIcon} text="Download Apps"/>
                <CardComponent bgColor={"#B73DDF"} image={Images.graphCardIcon} text="Usage Analytics"/>
            </div>
        </div>
    );
}

export const redirectToPlayground = () => {
    window.open("https://www.openbot.itinker.io/", '_blank');
    // window.open("http://localhost:3001/", '_blank');
};


export function CardComponent(props) {

    const {bgColor, image, text, handleServices} = props
    const textStyles = {
        color: "#FFFFFF",
    }
    return (
        <Card sx={{
            width: "100%", display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", backgroundColor: bgColor, overflow: "hidden",
            borderRadius: 3,
            height: "100%"
        }} onClick={handleServices}>
            <div className={"cardImage"}>
                <img src={image} alt="Card Image"/>
            </div>
            <div className={"txtStyleDiv"}>
                <span style={textStyles}>{text}</span>
            </div>

        </Card>
    )
}