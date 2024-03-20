import React, {useContext, useState} from "react";
import {Images} from "../../../utils/images";
import {ThemeContext} from "../../../App";
import {Themes} from "../../../utils/constants";

export function DropdownComponent(props) {
    const {theme} = useContext(ThemeContext);
    const {
        icon,
        onClick,
        label,
        hoverIcon,
        className,
        darkThemeIcon
    } = props
    const [isHovered, setIsHovered] = useState(false);

    // Render the dropdown item with dynamic styling based on hover state
    return (
        <div onClick={onClick} className={"dropdownIcons"}
             style={{
                 borderLeft: theme === Themes.dark && "rgb(89, 98, 107)",
                 backgroundColor: theme === Themes.dark ? (isHovered ? "rgb(89, 98, 107)" : "rgb(48, 48, 48)") : ""
             }}
             onMouseEnter={() => setIsHovered(true)}
             onMouseLeave={() => setIsHovered(false)}>

            {/* Display the appropriate icon based on hover state */}
            <img src={theme === Themes.dark ? darkThemeIcon : isHovered ? hoverIcon : icon} className={className}
                 alt={"Dropdown Item Icon"}/>
            {/* Dropdown content with label and arrow icon */}
            <div className={"dropdownDiv"} style={{color: theme === Themes.dark ? "#FFFFFF" : ""}}>
                <span className={"dropdownText"}>{label}</span>
                <img
                    src={theme === Themes.dark ? Images.whiteArrowIcon : isHovered ? Images.hoverArrowLeftIcon : Images.arrowLeft}
                    className={"arrowLeft"} alt={"Arrow Icon"}/>
            </div>
        </div>
    )
}