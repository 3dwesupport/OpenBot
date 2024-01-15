import React from "react";
import {Images} from "../../utils/images";

export function DropdownComponent(props){
    const {
        icon,
        onClick,
        label,
    }={props}
    return(
            <div className={"dropdownMenuItem"} onClick={onClick}>
                <img src={icon} style={{ height: "10px", width: "10px" }} alt={"Dropdown Item Icon"} />
                <p>{label}</p>
                <img src={Images.arrowLeft} style={{ height: "5px", width: "5px" }} alt={"Arrow Icon"} />
            </div>


    )
}