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

const StyledPopover = styled(Popover)({
    '& .MuiPopover-paper': {
        padding: '20px',
        width: "20%",
        borderRadius: "4%"
    },
});

export function ProfileModal(props) {
    const [anchorEl, setAnchorEl] = useState(null);
    const {user, setIsSignIn} = props;
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const navigate = useNavigate();
    const open = Boolean(anchorEl);

    const handlePopoverOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

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

    return (
        <div>
            {<StyledPopover open={open} anchorEl={anchorEl} onClose={handlePopoverClose}
                            anchorOrigin={{vertical: 'bottom', horizontal: 'right',}}
                            transformOrigin={{vertical: 'top', horizontal: 'right'}}>
                <div className={"dropdownItem"}>
                    <DropdownComponent icon={Images.editProfileDropdownIcon} hoverIcon={Images.hoverEditProfileIcon}
                                       label="Edit Profile" onClick={() => navigate(PathName.editProfile)}/>
                    <DropdownComponent label="Transaction History" hoverIcon={Images.hoverTransactionHistoryIcon}
                                       icon={Images.transactionHistoryIcon}/>
                    <DropdownComponent label="Logout" icon={Images.logOutIcon} hoverIcon={Images.hoverLogoutIcon}
                                       onClick={handleLogoutClick}/>
                </div>
            </StyledPopover>}
            {user ? (
                <div onClick={handlePopoverOpen} className={styles.dropdown}>
                    <Avatar className={styles.profileModalIcon} src={user?.photoURL} alt="User"/>
                    <span className={styles.textProfileModal}>{user?.displayName}</span>
                    <img src={Images.arrowDown} alt={'arrow icon'}/>
                </div>
            ) : <LoaderComponent color="#FFFFFF" height="20" width="20"/>}
            {
                logoutModalOpen &&
                <LogoutComponent onClick={navigateAndSignOut} setLogoutModalOpen={setLogoutModalOpen}
                                 logoutModalOpen={logoutModalOpen}/>
            }
        </div>
    );
}

