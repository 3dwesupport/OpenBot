import React from "react";
import "../card/card.css"
import {CardData} from "../../../../utils/constants";
import {CardComponent} from "../card/card";

/**
 * Function to display all openBot services on home page
 * @returns {Element}
 * @constructor
 */
export function OpenBotServiceComponent() {
    /**
     * function to handle click event on cards
     * @param clickedCard
     */
    const handleCardClick = (clickedCard) => {
        switch (clickedCard.text) {
            case CardData[0].text:
                window.open("https://www.openbot.itinker.io/", '_blank');
                // window.open("http://localhost:3001/", '_blank');
                break;
            case CardData[1].text:
                console.log(CardData[1].text);
                // window.open("http://localhost:8080/", '_blank');
                break;
            case CardData[2].text:
                console.log(CardData[2].text);
                break;
        }
    };

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
                {/* Mapping over CardData array and rendering servicesSection for each item */}
                {CardData.map((card, index) => (
                    <CardComponent handleCardClick={handleCardClick} key={index} value={card}/>))}
            </div>
        </div>
    );
}