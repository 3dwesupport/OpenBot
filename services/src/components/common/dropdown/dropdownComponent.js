import React, {useState} from "react";
import {Images} from "../../../utils/images";

export function DropdownComponent(props) {
    // State to track hover state
    const [isHovered, setIsHovered] = useState(false);
    const {
        icon,
        onClick,
        label,
        hoverIcon,
        className,
    } = props

    // Render the dropdown item with dynamic styling based on hover state
    return (
        <div onClick={onClick} className={"dropdownIcons"} onMouseEnter={() => setIsHovered(true)}
             onMouseLeave={() => setIsHovered(false)}>

            {/* Display the appropriate icon based on hover state */}
            <img src={isHovered ? hoverIcon : icon} className={className} alt={"Dropdown Item Icon"}/>
            {/* Dropdown content with label and arrow icon */}
            <div className={"dropdownDiv"}>
                <span className={"dropdownText"}>{label}</span>
                <img src={isHovered ? Images.hoverArrowLeftIcon : Images.arrowLeft}
                   className={"arrowLeft"}  alt={"Arrow Icon"}/>
            </div>
        </div>
    )
}