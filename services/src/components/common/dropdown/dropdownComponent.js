import React, {useState} from "react";
import {Images} from "../../../utils/images";

export function DropdownComponent(props) {
    const [isHovered, setIsHovered] = useState(false);
    const {
        icon,
        onClick,
        label,
        hoverIcon,
        className,
    } = props

    return (
        <div onClick={onClick} className={"dropdownIcons"} onMouseEnter={() => setIsHovered(true)}
             onMouseLeave={() => setIsHovered(false)}>
            <img src={isHovered ? hoverIcon : icon} className={className} alt={"Dropdown Item Icon"}/>
            <div className={"dropdownDiv"}>
                <span className={"dropdownText"}>{label}</span>
                <img src={isHovered ? Images.hoverArrowLeftIcon : Images.arrowLeft}
                   className={"arrowLeft"}  alt={"Arrow Icon"}/>
            </div>
        </div>
    )
}