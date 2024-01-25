import React from "react";
import {Modal} from "@mui/material";
import "./modal.css"
import ButtonComponent from "../button/buttonComponent";

/**
 * component to represent logout modal
 */
export function LogoutComponent(props) {
    const {setLogoutModalOpen, logoutModalOpen, onClick} = props

    //handle the logout modal close
    const handleLogoutModalClose = () => {
        setLogoutModalOpen(false);
    };

    //render the logout confirmation modal
    return (
        <Modal open={logoutModalOpen}>
            <div className={"logoutComponent"}>
                <div className={"logoutDivText"}>
                    <span className={"confirmLogout"}>Confirm Logout</span>
                    <span className={"sureLogout"}>Are you sure you want to logout?</span>
                </div>
                <div className={"logoutButtonDiv"}>
                    <ButtonComponent classStyle={"logoutButtons" + " " + "logoutCancelButton"} label={"Cancel"}
                                     onClick={handleLogoutModalClose}/>
                    <ButtonComponent classStyle={"logoutButtons" + " " + "logoutOkButton"} label={"Ok"}
                                     onClick={onClick}/>
                </div>
            </div>
        </Modal>
    )

}