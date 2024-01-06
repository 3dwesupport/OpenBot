import React, {useContext, useEffect} from "react";
import {StoreContext} from "../../context/storeContext";
import {auth, googleSigIn} from "../../databaseServices/firebase";
import {Images} from "../../utils/images";
import {useNavigate} from "react-router-dom";
import {PathName} from "../../utils/constants";
import "./navbar.css";
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
                    <div className={"mainTitle"}>OpenBot Dashboard</div>
                </div>
            </div>
        </div>
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
        const {} = params
        return (
            <div className={"navbar_rightSectionDiv"}>
                <img alt="Theme" className={"navbar_themeIcon"} src={Images.lightTheme_icon}></img>
                <img alt="Icon" className={"navbar_lineIcon"} src={Images.line_icon}></img>
                <button onClick={()=>handelSignIn()}  className={"navbar_buttonIcon"}>
                    <div>Sign in</div>
                </button>
            </div>
        )
    }
}

export default Header;