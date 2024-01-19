import React, {useState} from "react";
import {Images} from "../../../utils/images";

export function DropdownComponent(props) {
    const [isHovered, setIsHovered] = useState(false);
    const {
        icon,
        onClick,
        label,
        hoverIcon,
    } = props

    return (
        <div onClick={onClick} className={"dropdownIcons"} onMouseEnter={() => setIsHovered(true)}
             onMouseLeave={() => setIsHovered(false)}>
            <img src={isHovered ? hoverIcon : icon} style={{height: "24px", width: "24px"}} alt={"Dropdown Item Icon"}/>
            <div className={"dropdownDiv"}>
                <span className={"dropdownText"}>{label}</span>
                <img src={isHovered ? Images.hoverArrowLeftIcon : Images.arrowLeft}
                     style={{height: "12px", width: "12px", paddingTop: "6px"}} alt={"Arrow Icon"}/>
            </div>
        </div>
    )
}