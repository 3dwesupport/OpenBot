import React, {useState} from "react";
import {Images} from "../../utils/images";
import {DropdownComponent} from "../common/dropdown/dropdownComponent";
import styles from "./profileModal.module.css";
import "./profileModal.module.css"
import {Avatar, Popover, styled} from "@mui/material";
import {LogoutComponent} from "../common/logout/modalComponent";
import LoaderComponent from "../common/loader/loaderComponent";
import {PathName} from "../../utils/constants";
import {googleSignOut} from "../../database/authentication.js";
import {useNavigate} from "react-router-dom";
import "../common/dropdown/dropdown.css"
import { ThemeProvider, createTheme } from '@mui/material/styles';


const theme = createTheme();
const StyledPopover = styled(Popover)(({ theme }) =>({
    '& .MuiPopover-paper': {
        padding: '20px',
        width: "20%",
        borderRadius: "4%",
        [theme.breakpoints.down('md')]: {
            width: "120px",
            height: "70px",
            marginLeft: "2%",
            paddingTop: "12px"
        },

    },
}));

export function ProfileModal(props) {
    const [anchorEl, setAnchorEl] = useState(null);
    const {user, setIsSignIn,userDetails} = props;
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const navigate = useNavigate();
    const open = Boolean(anchorEl);

    const handlePopoverOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handlePopoverClose = () => {
        setAnchorEl(null);

    };
     // on the click of logout first it will navigate to dashboard then sign-out
    const handleLogoutClick = () => {
        setLogoutModalOpen(true);
        handlePopoverClose();
    };

    const navigateAndSignOut = () => {
        navigate(PathName.home);
        googleSignOut().then(() => {
            setIsSignIn(false);
        })
    }
      /*StyledPopover for the dropdown menu*/
    return (
        <div>
            <ThemeProvider theme={theme}>
            {<StyledPopover open={open} anchorEl={anchorEl} onClose={handlePopoverClose}
                            anchorOrigin={{vertical: 'bottom', horizontal: 'right',}}
                            transformOrigin={{vertical: 'top', horizontal: 'right'}}>
                <div className={"dropdownItem"}>
                    <DropdownComponent icon={Images.editProfileDropdownIcon} hoverIcon={Images.hoverEditProfileIcon}
                                       label="Edit Profile" className={"dropdownIconDiv"}
                                       onClick={() => navigate(PathName.editProfile)}/>
                    <DropdownComponent label="Transaction History" hoverIcon={Images.hoverTransactionHistoryIcon}
                                       icon={Images.transactionHistoryIcon} className={"dropdownIconDiv"} />
                    <DropdownComponent label="Logout" icon={Images.logOutIcon} hoverIcon={Images.hoverLogoutIcon}
                                       onClick={handleLogoutClick} className={"dropdownIconDiv"} />
                </div>
            </StyledPopover>}
            </ThemeProvider>
            {user ? (
                //display user profile information in right section of header
                <div onClick={handlePopoverOpen} className={styles.dropdown}>
                    <Avatar className={styles.profileModalIcon} src={user?.photoURL} alt="User"/>
                    <span className={styles.textProfileModal}>{user?.displayName?( user.displayName.length>7 ? user.displayName.slice(0,7)+'...':user.displayName):''}</span>
                    <img  className={styles.downArrow} src={Images.arrowDown} alt={'arrow icon'}/>
                </div>
            ) : <LoaderComponent color="#FFFFFF" height="20" width="20"/>}
            {
                // display the logout modal if open
                logoutModalOpen &&
                <LogoutComponent onClick={navigateAndSignOut} setLogoutModalOpen={setLogoutModalOpen}
                                 logoutModalOpen={logoutModalOpen}/>
            }
        </div>
    );
}

