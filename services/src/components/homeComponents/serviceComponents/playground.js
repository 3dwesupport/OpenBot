import React, {useContext} from "react";
import "./card.css"
import {CardData} from "../../../utils/constants";
import {CardComponent} from "./CardComponent/card";

export function HomeServices() {
    return (
        <div className={"container"}>
            {/* Title section */}
            <div className={"textDiv"}>
                <div className="title">
                    {/* Bold "WELCOME" */}
                    <div style={{fontWeight: 'bold', display: 'inline'}}>WELCOME</div>
                    , NAME
                </div>
            </div>
            {/* Card container */}
            <div className={"cardContainer"}>
                {/* Mapping over CardData array and rendering CardComponent for each item */}
                {CardData.map((card, index) => (
                    <CardComponent key={index} value={card}/>))}
            </div>
        </div>
    );
}


export const redirectToPlayground = () => {
    window.open("https://www.openbot.itinker.io/", '_blank');
    // window.open("http://localhost:3001/", '_blank');
};

