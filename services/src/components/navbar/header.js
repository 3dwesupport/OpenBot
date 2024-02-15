import React, {useContext, useEffect} from "react";
import {StoreContext} from "../../context/storeContext";
import {auth, googleSigIn} from "../../database/authentication";
import {Images} from "../../utils/images";
import "./navbar.css";
import {localStorageKeys, PathName} from "../../utils/constants";
import {ProfileModal} from "../profile/profileModal";
import {useNavigate} from "react-router-dom";
import {ThemeContext} from "../../App";


/**
 * Dashboard header which contains logo, theme and profile signIn
 * @returns {Element}
 * @constructor
 */
function Header() {
    const {user, setUser, setIsSignIn, isSignIn, isOnline, isUserProfile} = useContext(StoreContext);
    const {theme, toggleTheme} = useContext(ThemeContext);

    useEffect(() => {
        auth.onAuthStateChanged((res) => {
            console.log("set user profile")
            setUser({
                photoURL: res?.photoURL,
                displayName: res?.displayName,
                email: res?.email,
                uid: res?.uid
            });
        })
    }, [isUserProfile]);
    return (
        <div className={"navbar_navbarDiv"}>
            <LogoSection/>
            <RightSection user={user} setIsSignIn={setIsSignIn} isSignIn={isSignIn} setUser={setUser}
                          isOnline={isOnline} theme={theme} toggleTheme={toggleTheme}/>
        </div>
    );
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

    return (<>
            <div className={"navbarTitleDiv"}>
                <img alt="openBotIcon" onClick={openHomepage} className={"navbar_mainIcon"}
                     src={Images.openBotLogo}></img>
                <div onClick={openHomepage} className={"navbar_headDiv"}>
                    <span className={"mainTitle"}>OpenBot Dashboard</span>
                </div>
            </div>
        </>
    )
}

/**
 * Right Component which has signIn, profile picture and edit profile option
 * @param params
 * @returns {Element}
 * @constructor
 */
export function RightSection(params) {
    const {setIsSignIn, isOnline, setUser, user, theme, toggleTheme} = params

    //function to handle sign-in on clicking button
    function handelSignIn() {
        if (isOnline) {
            googleSigIn().then(res => {
                setUser({
                    photoURL: res.user?.photoURL,
                    displayName: res.user?.displayName,
                    email: res.user?.email,
                    uid: res.user?.uid
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
            <img title={"Theme"} alt="icon" onClick={toggleTheme}
                 src={theme === 'dark' ? Images.darkThemeIcon : Images.lightTheme_icon}
                 className={`${theme === 'dark' ? "light_themeIcon" : "dark_themeIcon"}`}/>
            <img alt="Icon" className={"navbar_lineIcon"} src={Images.line_icon}></img>
            {localStorage.getItem(localStorageKeys.isSignIn) === "true" ?
                <ProfileModal user={user} setIsSignIn={setIsSignIn} setUser={setUser}/> :
                <button onClick={handelSignIn} className={"navbar_buttonIcon"}>
                    <span className={"buttonText"}>Sign in</span>
                </button>}
        </div>
    )
}

export default Header;
