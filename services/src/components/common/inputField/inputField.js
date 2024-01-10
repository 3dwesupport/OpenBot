import React from "react";
import "./inputField.css";

export function InputFieldComponent(props) {
    const {
        label,
        textType,
        name,
        value,
        disabled,
        className = "",
    } = props
    return (
        <div className={className ? className : "firstInputComponent"}>
            <div  className={"namingDiv"}>{label}</div>
            <input type={textType} name={name} className={"inputBorder"} value={value}
                   disabled={disabled}/>
        </div>


    );

}

