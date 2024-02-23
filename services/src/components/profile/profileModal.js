import React, {useContext, useState} from "react";
import {Images} from "../../utils/images";
import {DropdownComponent} from "../common/dropdown/dropdown";
import styles from "./profileModal.module.css";
import "./profileModal.module.css"
import {Avatar, Popover, styled} from "@mui/material";
import {LogoutComponent} from "../common/logout/modalComponent";
import LoaderComponent from "../common/loader/loader";
import {PathName, Themes} from "../../utils/constants";
import {googleSignOut} from "../../database/authentication.js";
import {useNavigate} from "react-router-dom";
import "../common/dropdown/dropdown.css"
import {ThemeProvider, createTheme} from '@mui/material/styles';
import {ThemeContext} from "../../App";

export function ProfileModal(props) {
    const [anchorEl, setAnchorEl] = useState(null);
    const {user, setIsSignIn} = props;
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const navigate = useNavigate();
    const open = Boolean(anchorEl);
    const themes = createTheme();
    const {theme} = useContext(ThemeContext);
    const StyledPopover = styled(Popover)(({theme}) => ({
        '& .MuiPopover-paper': {
            width: "270px",
            borderRadius: "10px",
        },
        '@media screen and (max-width: 768px)': {
            '& .MuiPopover-paper': {
                width: "160px",
            },
        }
    }));

    const handlePopoverOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handlePopoverClose = () => {
        setAnchorEl(null);

    };
    // on the click of logout first it will navigate to dashboard then sign-out
    const handleLogoutClick = () => {
        setLogoutModalOpen(true);
    };

    const navigateAndSignOut = () => {
        navigate(PathName.home);
        googleSignOut().then(() => {
            setIsSignIn(false);
        })
    }

    function handleProfileOptionsClick(option) {
        switch (option) {
            case "Edit Profile" :
                navigate(PathName.editProfile);
                break;
            case "Transaction History":
                navigate(PathName.billingHistory);
                break;
            case "Logout":
                handleLogoutClick();
                break;
            default:
                break;
        }
        handlePopoverClose();
    }

    /*StyledPopover for the dropdown menu*/
    return (
        <div>
            <ThemeProvider theme={themes}>
                {<StyledPopover theme={themes} open={open} anchorEl={anchorEl} onClose={handlePopoverClose}
                                anchorOrigin={{vertical: 'bottom', horizontal: 'right',}}
                                transformOrigin={{vertical: 'top', horizontal: 'right'}}>
                    <div className={"dropdownItem"}
                         style={{backgroundColor: theme === Themes.dark ? "rgb(48, 48, 48)" : "#FFFFFF"}}>
                        <DropdownComponent icon={Images.editProfileDropdownIcon} hoverIcon={Images.hoverEditProfileIcon}
                                           darkThemeIcon={Images.whiteUserIcon}
                                           label="Edit Profile" className={"dropdownIconDiv"}
                                           onClick={() => handleProfileOptionsClick("Edit Profile")}/>
                        <DropdownComponent label="Transaction History" hoverIcon={Images.hoverTransactionHistoryIcon}
                                           icon={Images.transactionHistoryIcon}
                                           darkThemeIcon={Images.whiteTransactionIcon}
                                           onClick={() => handleProfileOptionsClick("Transaction History")}
                                           className={"dropdownIconDiv"}/>
                        <DropdownComponent label="Logout" icon={Images.logOutIcon} hoverIcon={Images.hoverLogoutIcon}
                                           onClick={() => handleProfileOptionsClick("Logout")}
                                           darkThemeIcon={Images.whiteLogoutIcon}
                                           className={"dropdownIconDiv"}/>
                    </div>
                </StyledPopover>}
            </ThemeProvider>
            {user?.photoURL ? (
                //display user profile information in right section of header
                <div onClick={handlePopoverOpen} className={styles.dropdown}>
                    <Avatar className={styles.profileModalIcon} src={user?.photoURL} alt="User"/>
                    <span
                        className={styles.textProfileModal}>{user?.displayName ? (user.displayName.length > 7 ? user.displayName.slice(0, 7) + '...' : user.displayName) : ''}</span>
                    <img className={styles.downArrow} src={Images.arrowDown} alt={'arrow icon'}/>
                </div>
            ) : <LoaderComponent color="#FFFFFF" height="20" width="20"/>}
            {
                // display the logout modal if open
                logoutModalOpen &&
                <LogoutComponent onClick={navigateAndSignOut} setLogoutModalOpen={setLogoutModalOpen}
                                 logoutModalOpen={logoutModalOpen} theme={theme}/>
            }
        </div>
    );
}

