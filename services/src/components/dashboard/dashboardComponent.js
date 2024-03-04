import React, {useContext} from "react";
import "../common/card/card.css";
import {CardData, Constants, errorToast, localStorageKeys, PathName, Themes} from "../../utils/constants";
import {CardComponent} from "../common/card/card";
import {StoreContext} from "../../context/storeContext";
import {useNavigate} from "react-router-dom";
import {ThemeContext} from "../../App";

/**
 * Function to display all openBot services on home page
 * @returns {Element}
 * @constructor
 */
export function DashboardComponent() {

    const {user} = useContext(StoreContext);
    const navigate = useNavigate();
    const {theme} = useContext(ThemeContext);

    //function to handle click event on cards
    const handleCardClick = (clickedCard) => {
        switch (clickedCard.text) {
            case CardData[0].text:
                window.open("https://www.openbot.itinker.io/", '_blank');
                // window.open("http://localhost:3001/", '_blank');
                break;
            case CardData[1].text:
                console.log(CardData[1].text);
                window.open("http://localhost:8080/", '_blank');
                break;
            case CardData[2].text:
                const training_file = "github/isl-org/OpenBot/blob/master/policy/policy_learning.ipynb";
                const colabUrl = `https://colab.research.google.com/${training_file}`;
                window.open(colabUrl, '_blank');
                console.log(CardData[2].text);
                break;
            case CardData[5].text:
                if (localStorage.getItem(localStorageKeys.isSignIn) === "true") {
                    navigate(PathName.usageAnalysis);
                } else {
                    errorToast(Constants.signInMessage);
                }
                break;
            default :
                break;
        }
    };

    return (
        <div className={"container"} style={{backgroundColor: theme === Themes.dark ? '#202020' : '#FFFFFF'}}>
            {/* Title section */}
            {localStorage.getItem(localStorageKeys.isSignIn) === "true" ? <div className={"textDiv"}>
                <div className="title" style={{color: theme === Themes.dark ? '#FFFFFF' : '#303030'}}>
                    <div style={{fontWeight: 'bold', display: 'inline'}}>
                        WELCOME
                    </div>
                    , {user?.displayName}
                </div>
            </div> : <div className={"textDiv"}/>}
            {/* Card container */}
            <div className={"cardContainer"}>
                {/* Mapping over CardData array and rendering servicesSection for each item */}
                {CardData.map((card, index) => (
                    <CardComponent handleCardClick={handleCardClick} key={index} value={card} index={index}/>))}
            </div>
        </div>
    );
}