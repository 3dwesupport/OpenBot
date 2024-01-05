import React, {useContext} from "react";
import {localStorageKeys} from "../../../utils/constants";
import {StoreContext} from "../../../context/storeContext";
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
                <CardComponent bgColor={"#FFAB1A"} image={Images.openbotCardIcon} text="OpenBot Playground"/>
                <CardComponent bgColor={"#8156C9"} image={Images.webServerCardIcon} text="Web Server"/>
                <CardComponent bgColor={"#4B40D6"} image={Images.trainModelCardIcon} text="Train your Own Model"/>
                <CardComponent bgColor={"#5C96EA"} image={Images.billingCardIcon} text="Billing"/>
                <CardComponent bgColor={"#EA3D78"} image={Images.downloadCloudCardIcon} text="Download Apps"/>
                <CardComponent bgColor={"#B73DDF"} image={Images.graphCardIcon} text="Usage Analytics"/>
            </div>
        </div>


    );
}


// export const Playground = () => {
//     const {user} = useContext(StoreContext);
//
//     const redirectToPlayground = () => {
//         if (user != null) {
//             const destinationUrl = 'https://www.openbot.itinker.io/';
//             const accessToken = localStorage.getItem(localStorageKeys.accessToken);
//             const playgroundUrl = `${destinationUrl}?user=${encodeURIComponent(JSON.stringify(user))}&accessToken=${encodeURIComponent(accessToken)}`;
//             window.open(playgroundUrl, '_blank');
//         } else {
//             console.log("There is no user");
//         }
//     };
//     return (
//         <button onClick={redirectToPlayground}>Playground</button>
//     );
// }


export function CardComponent(props) {

    const {bgColor, image, text} = props
    const textStyles = {

        color: "#FFFFFF",

    }
    return (
        <Card sx={{
            width: "100%", display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", backgroundColor: bgColor, overflow: "hidden",
            borderRadius: 3,
            height: "100%"
        }}>
            <div className={"cardImage"}>
                <img src={image} alt="Card Image"/>
            </div>
            <div className={"txtStyleDiv"}>
                <span style={textStyles}>{text}</span>
            </div>


        </Card>

    )
}