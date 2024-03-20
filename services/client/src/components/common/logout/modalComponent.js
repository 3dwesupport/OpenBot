import React from "react";
import {Modal} from "@mui/material";
import "./modal.css"
import ButtonComponent from "../button/button";
import {Themes} from "../../../utils/constants";

/**
 * component to represent logout modal on the click of logout in dropdown
 */
export function LogoutComponent(props) {
    const {setLogoutModalOpen, logoutModalOpen, onClick, theme} = props

    //handle the logout modal close
    const handleLogoutModalClose = () => {
        setLogoutModalOpen(false);
    };

    //render the logout confirmation modal
    return (
        <Modal open={logoutModalOpen}>
            <div className={"logoutComponent"} style={{backgroundColor: theme === Themes.dark ? "#303030" : ""}}>
                <div className={"logoutDivText"}>
                    <span className={"confirmLogout"} style={{color: theme === Themes.dark ? "#FFFFFF" : ""}}>Confirm Logout</span>
                    <span className={"sureLogout"} style={{color: theme === Themes.dark ? "gray" : ""}}>Are you sure you want to logout?</span>
                </div>
                <div className={"logoutButtonDiv"}>
                    <ButtonComponent classStyle={"logoutButtons" + " " + "logoutCancelButton"} label={"Cancel"}
                                     onClick={handleLogoutModalClose}
                                     inlineStyle={{backgroundColor: theme === Themes.dark ? "#303030" : "#FFFFFF"}}/>
                    <ButtonComponent classStyle={"logoutButtons" + " " + "logoutOkButton"} label={"Ok"}
                                     onClick={onClick}/>
                </div>
            </div>
        </Modal>
    )

}