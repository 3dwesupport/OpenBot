import React, {useContext, useState} from "react";
import {Snackbar} from "@mui/material";
import {Images} from "../../../utils/images";
import {ThemeContext} from "../../../App";
import {Themes} from "../../../utils/constants";

export function SubscriptionCookie() {
    const [open, setOpen] = useState(true);
    const {theme} = useContext(ThemeContext);

    const handleClose = () => {
        setOpen(false);
    };

    const action = (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            backgroundColor: "#0071c5",
            color: "white",
            borderRadius: "4px",
            height: "25px",
            fontFamily: "Gilroy-Medium', serif",
            width: "110px",
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
                    },
                    '@media screen and (min-width: 600px)': {
                        '& .MuiSnackbarContent-root': {
                            minWidth: '360px',
                        },
                    },
                    "& .MuiSnackbar-anchorOriginBottomCenter": {
                        left: "50%",
                        right: "auto"
                    },
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

