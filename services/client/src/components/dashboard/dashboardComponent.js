import React, {useContext} from "react";
import "../common/card/card.css";
import {CardData, Constants, errorToast, localStorageKeys, PathName, Themes} from "../../utils/constants";
import {CardComponent} from "../common/card/card";
import {StoreContext} from "../../context/storeContext";
import {useNavigate} from "react-router-dom";
import {ThemeContext} from "../../App";
import {getCustomToken} from "../../database/APIs/profile";
import {auth} from "../../database/authentication";
import Cookies from "js-cookie";

/**
 * Function to display all openBot services on home page
 * @returns {Element}
 * @constructor
 */
export function DashboardComponent() {
    const {user} = useContext(StoreContext);
    const navigate = useNavigate();
    const {theme} = useContext(ThemeContext);

    async function CustomTokenGenerate() {
        const tokenValue = Cookies.get("user");
        if (localStorage.getItem(localStorageKeys.isSignIn) === "true") { // if user logged in
            if (tokenValue === undefined) {
                // to find expiration time 
                let currentDate = new Date();
                let expirationDate = new Date(currentDate.getTime() + (1 * 60 * 60 * 1000));

                const cookieOptions = {
                    // domain: '.openbot.org',
                    domain: 'localhost',
                    // domain: ".itinker.io",
                    secure: true,
                    expires: expirationDate,
                };
                localStorage.setItem(localStorageKeys.UID, auth?.currentUser?.uid);
                let customToken = await getCustomToken(auth?.currentUser?.uid);
                Cookies.set(localStorageKeys.user, customToken, cookieOptions);
            }
        }
    }

    //function to handle click event on cards
    const handleCardClick = (clickedCard) => {
        switch (clickedCard.text) {
            case CardData[0].text:
                CustomTokenGenerate().then(() => {
                        window.open("https://www.openbot.itinker.io/", '_blank');
                        // window.open("http://localhost:3001/", '_blank');
                    }
                )
                break;
            case CardData[1].text:
                console.log(CardData[1].text);
                CustomTokenGenerate().then(() => {
                    window.open("http://localhost:8080/", '_blank');
                })
                break;
            case CardData[2].text:
                CustomTokenGenerate().then(() => {
                    const notebookPath = 'services/src/modelTraining/training-service.ipynb';
                    const colabUrl = `https://colab.research.google.com/github/3dwesupport/OpenBot/blob/openbot-services/${notebookPath}`;
                    window.open(colabUrl, '_blank');
                    console.log(CardData[2].text);
                })
                break;
            case CardData[3].text:
                console.log(CardData[3].text);
                navigate(PathName.billing);
                break;
            case CardData[4].text:
                console.log(CardData[3].text);
                // navigate(PathName.billingHistory);
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