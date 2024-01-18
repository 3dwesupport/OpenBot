import React from "react";
import {Modal} from "@mui/material";
import "./modal.css"
import ButtonComponent from "../button/buttonComponent";

export function LogoutComponent(props) {
    const {setLogoutModalOpen, logoutModalOpen, onClick} = props

    const handleLogoutModalClose = () => {
        setLogoutModalOpen(false);
    };

    return (

        <Modal open={logoutModalOpen}>
            <div className={"logoutComponent"}>
                <div className={"logoutDivText"}>
                    <span style={{fontSize: "20px", fontFamily: "Gilroy-Regular"}}>Confirm Logout</span>
                    <span
                        style={{fontSize: "16px", fontFamily: "Gilroy-Regular"}}>Are you sure you want to logout?</span>
                </div>
                <div className={"logoutButtonDiv"}>
                    <ButtonComponent classStyle={"cancelButton"} label={"Cancel"} onClick={handleLogoutModalClose}/>
                    <ButtonComponent classStyle={"okButton"} label={"Ok"} onClick={onClick}/>
                </div>
            </div>
        </Modal>

    )

}