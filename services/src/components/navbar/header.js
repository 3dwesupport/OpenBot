import React, {useContext, useEffect} from "react";
import {StoreContext} from "../../context/storeContext";
import {auth, googleSigIn} from "../../database/authentication";
import {Images} from "../../utils/images";
import "./navbar.css";
import {useNavigate} from "react-router-dom";
import {localStorageKeys, PathName} from "../../utils/constants";
import {ProfileModal} from "../profile/profileModal";

/**
 * Dashboard header which contains logo, theme and profile signIn
 * @returns {Element}
 * @constructor
 */
function Header() {
    const {user, setUser, setIsSignIn, isSignIn, isOnline} = useContext(StoreContext);


    useEffect(() => {
        auth.onAuthStateChanged((res) => {
            setUser({
                photoURL: res?.photoURL,
                displayName: res?.displayName,
                email: res?.email,
                uid: res?.uid
            });
        })
    }, []);
    return (
        <div className={"navbar_navbarDiv"}>
            <LogoSection/>
            <RightSection user={user} setIsSignIn={setIsSignIn} isSignIn={isSignIn} setUser={setUser}
                          isOnline={isOnline}/>
        </div>
    );
}

export default Header;

/**
 * Right Component which has signIn, profile picture and edit profile option
 * @param params
 * @returns {Element}
 * @constructor
 */
export function RightSection(params) {
    const {setIsSignIn, isOnline, setUser, user} = params

    //function to handle sign-in on clicking button
    function handelSignIn() {
        if (isOnline) {
            googleSigIn().then(res => {
                setUser({
                    photoURL: res.user?.photoURL,
                    displayName: res.user?.displayName,
                    email: res.user?.email,
                });
                setIsSignIn(true);
            })
                .catch((err) => {
                    console.log("sign in error:", err);
                })
        } else {
            console.log("Internet is off")
            //TODO add slider for internet off
        }
    }

    return (
        <div className={"navbar_rightSectionDiv"}>
            <img title={"Theme"} alt="icon" src={Images.lightTheme_icon} className={"light_themeIcon"}/>
            <img alt="Icon" className={"navbar_lineIcon"} src={Images.line_icon}></img>
            {localStorage.getItem(localStorageKeys.isSignIn) === "true" ? <ProfileModal user={user} setIsSignIn={setIsSignIn} setUser={setUser}/> :
                <button onClick={handelSignIn} className={"navbar_buttonIcon"}>
                    <span>Sign in</span>
                </button>}
        </div>
    )
}

/**
 * Logo component which contains Dashboard logo and name
 * @returns {Element}
 * @constructor
 */
export function LogoSection() {
    let navigate = useNavigate()

    //function to open home page
    const openHomepage = () => {
        navigate(PathName.home);
    }

    return (<div className={"navbar_navbarDiv"}>
            <div className={"navbarTitleDiv"}>
                <img alt="openBotIcon" onClick={openHomepage} className={"navbar_mainIcon"}
                     src={Images.openBotLogo}></img>
                <div onClick={openHomepage} className={"navbar_headDiv"}>
                    <div className={"mainTitle"}>OpenBot Dashboard</div>
                </div>
            </div>
        </div>
    )
}


