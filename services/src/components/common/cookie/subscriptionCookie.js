import React, {useContext, useState} from "react";
import {Snackbar} from "@mui/material";
import {Images} from "../../../utils/images";
import {ThemeContext} from "../../../App";
import {PathName, Themes} from "../../../utils/constants";
import {useNavigate} from "react-router-dom";

/**
 * function to display upgrade plan cookie
 * @returns {Element}
 * @constructor
 */
export function SubscriptionCookie(props) {
    const [open, setOpen] = useState(true);
    const {theme} = useContext(ThemeContext);
    const navigate = useNavigate();

    const handleClose = () => {
        setOpen(false);
    };

    const handleUserPlan = () => {
        navigate(PathName.billing);
    }

    const action = (
        <div onClick={handleUserPlan} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            backgroundColor: "#0071c5",
            color: "white",
            borderRadius: "4px",
            height: "25px",
            fontFamily: "Gilroy-Medium', serif",
            width: "120px",
            cursor: "pointer"
        }}>
            <img src={Images.upgradePlanIcon} alt={"Upgrade"} width={13}/>
            <div>Upgrade Now</div>
        </div>
    );

    return (
        <>
            <Snackbar
                sx={{
                    ".MuiSnackbarContent-root": {
                        backgroundColor: theme === Themes.dark ? "#202020" : "rgb(255, 255, 255)",
                        color: "#969696",
                        fontSize: "13px",
                        fontFamily: "Gilroy-Medium, sans-serif",
                        justifyContent: "space-around",
                        minWidth: '240px',
                    },
                    '@media screen and (min-width: 600px)': {
                        '& .MuiSnackbarContent-root': {
                            minWidth: '360px',
                        },
                    },
                    ".css-1kr9x0n-MuiSnackbarContent-action": {
                        marginLeft: 0,
                        paddingLeft: 0
                    },
                    left: "50%",
                    right: "auto",
                    transform: "translateX(-50%)",
                }}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center'
                }}
                open={open}
                message={"*You're currently using the free version"}
                action={action}
            />
        </>
    );
}

