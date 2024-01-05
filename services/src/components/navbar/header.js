import React, {useContext, useEffect} from "react";
import {StoreContext} from "../../context/storeContext";
import {auth, googleSigIn} from "../../databaseServices/firebase";
import styles from "./navbar.css";
import {Images} from "../../utils/images";
import {useNavigate} from "react-router-dom";
import {PathName} from "../../utils/constants";

export function LogoSection() {
    let navigate = useNavigate()

    //onClickEvent
    const openHomepage = () => {
        navigate(PathName.home);
    }

    return (<div className={"navbar_navbarDiv"}>
            <div className={"navbarTitleDiv"}>
                <img alt="openBotIcon" className={"navbar_mainIcon"} src={Images.openBotLogo}></img>
                <div className={"navbar_headDiv"}>
                    <span className={"mainTitle"}>OpenBot Dashboard</span>
                </div>
            </div>
        </div>

        // <div className={"logoDiv"}>
        //
        //     <img alt="openBotIcon"  className={"icon"}    src={Images.openBotLogo}></img>
        //         <span className={"mainTitle"} >OpenBot Dashboard</span>
        // </div>
    )
}


function Header() {

    const {setUser, setIsSignIn, isOnline} = useContext(StoreContext);

    useEffect(() => {
        auth.onAuthStateChanged((res) => {
            setUser({
                photoURL: res?.photoURL,
                displayName: res?.displayName,
                email: res?.email,
            });
        })
    }, [setUser]);

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
        <div className={"navbar_navbarDiv"}>
            <LogoSection/>
            <RightSection/>
        </div>

    );


    function RightSection(params) {
        const {
            toggleTheme,
            theme,
            setIsProfileModal,
            user,
            setUser,
        } = params
        // const themes = useTheme();
        // const isMobile = useMediaQuery(themes.breakpoints.down('sm'));
        // const tabletQuery = window.matchMedia("(min-width: 768px) and (max-width: 1024px)").matches;
        // const isMobileLandscape = window.matchMedia("(max-height:440px) and (max-width: 1000px) and (orientation: landscape)").matches
        // const isSignedIn = localStorage.getItem("isSigIn") === "true";

        return (
            <div className={"navbar_rightSectionDiv"}>
                <img alt="Theme" className={"navbar_themeIcon"} src={Images.lightTheme_icon}></img>
                <img alt="Icon" className={"navbar_lineIcon"} src={Images.line_icon}></img>
                <button className={"navbar_buttonIcon"}>
                    <span>Sign in</span>
                </button>

                {/*if signed in then show icon and name or else sign in option*/}
                {/*<ProfileSignIn setIsProfileModal={setIsProfileModal} user={user} setUser={setUser}/>*/}
            </div>

        )
    }
}


export default Header;