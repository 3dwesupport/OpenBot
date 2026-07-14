import React, {useContext, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Box, Typography} from "@mui/material";
import {ThemeContext} from "../../App";
import {Header} from "../../components/navBar/header";
import {PopUpModal} from "../../components/homeComponents/header/logOutAndDeleteModal";
import BlueButton from "../../components/buttonComponent/blueButtonComponent";
import {auth, deleteUserAccount} from "../../services/firebase";
import {errorToast, successToast, localStorageKeys, PathName} from "../../utils/constants";
import configData from "../../config.json";

/**
 * Page opened directly at /delete-account letting a signed-in user permanently delete their account
 * @returns {JSX.Element}
 * @constructor
 */
function DeleteAccount() {
    const {theme} = useContext(ThemeContext);
    const navigate = useNavigate();
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [isConfirmModal, setIsConfirmModal] = useState(false);
    const [deleteLoader, setDeleteLoader] = useState(false);
    const textColor = theme === "dark" ? "white" : "black";

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setIsSignedIn(!!user);
        });
        return () => unsubscribe();
    }, []);

    const handleDeleteClick = () => {
        if (!isSignedIn) {
            errorToast("Please sign in to delete your account.");
            return;
        }
        setIsConfirmModal(true);
    }

    const handleDeleteAccount = () => {
        setDeleteLoader(true);
        deleteUserAccount().then(() => {
            localStorage.setItem("isSigIn", "false");
            localStorage.removeItem(localStorageKeys.accessToken);
            localStorage.removeItem(localStorageKeys.allProjects);
            localStorage.removeItem(localStorageKeys.currentProject);
            localStorage.setItem(localStorageKeys.configData, JSON.stringify(configData));
            successToast("Your account has been deleted.");
            navigate(PathName.home);
        }).catch((error) => {
            console.log("delete account error: ", error);
            errorToast("Something went wrong while deleting your account. Please try again.");
            setDeleteLoader(false);
        });
    }

    return (
        <Box style={{minHeight: '100vh', backgroundColor: theme === "dark" ? "#202020" : "#f8f9fb"}}>
            <Header/>
            <Box display="flex" flexDirection="column" alignItems="center"
                 style={{paddingTop: 80, paddingLeft: 24, paddingRight: 24, textAlign: "center"}}>
                <Typography variant="h4" style={{color: textColor, fontWeight: 600}}>
                    Confirm Account Deletion
                </Typography>
                <Typography variant="body1" style={{color: textColor, marginTop: 16, maxWidth: 520}}>
                    Your account will be permanently deleted, along with all the data collected by the application.
                    Your projects are stored in your Google Drive, not on our servers, so they will not be deleted. If
                    you no longer need them, you can delete them manually from your Google Drive.
                </Typography>
                <div style={{marginTop: 24}}>
                    <BlueButton onClick={handleDeleteClick} buttonType={"contained"} buttonName={"Delete Account"}
                                inlineStyle={{
                                    backgroundColor: "#E03E1A",
                                    width: "auto",
                                    height: 38,
                                    padding: "0 20px",
                                    fontSize: 15,
                                    whiteSpace: "nowrap"
                                }}/>
                </div>
            </Box>
            {isConfirmModal &&
                <PopUpModal
                    setVariable={setIsConfirmModal}
                    inlineStyle={{backgroundColor: "#E03E1A"}}
                    headerText={"Delete this account?"}
                    containText={"You cannot restore this account later."}
                    buttonText={"Delete"}
                    deleteLoader={deleteLoader}
                    handleButtonClick={handleDeleteAccount}
                />}
        </Box>
    );
}

export default DeleteAccount;