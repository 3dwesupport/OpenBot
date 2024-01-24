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
        onDataChange,
    } = props

    const handleChange = (e) => {
        onDataChange(e.target.value);
    };

    return (
        <div className={className ? className : "firstInputComponent"}>
            <div className={"namingDiv"}>{label}</div>
            <input type={textType} style={{fontSize: "18px", padding: "8px"}} name={name} className={"inputBorder"}
                   value={value}
                   disabled={disabled} onChange={handleChange} />
        </div>


    );

}

