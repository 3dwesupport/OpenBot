import React from "react";
import {Images} from "../../../utils/images";

export function DropdownComponent(props) {
    const {
        icon,
        onClick,
        label,
    } = props

    return (
        <div onClick={onClick} className={"dropdownIcons"}>
            <img src={icon} style={{height: "24px", width: "24px"}} alt={"Dropdown Item Icon"}/>
            <div className={"dropdownDiv"}>
                <span style={{whiteSpace: "nowrap", width: '80%'}}>{label}</span>
                <img src={Images.arrowLeft} style={{height: "10px", width: "10px"}} alt={"Arrow Icon"}/>
            </div>
        </div>
    )
}