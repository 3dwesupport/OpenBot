import React from "react";
import "./inputField.css";


/**
 * InputFieldComponent is a React functional component representing input fields of edit profile page.
 */

export function InputFieldComponent(props) {
    const {
        label,
        textType,
        name,
        value,
        disabled,
        className = "",
        onDataChange,
        style={},
    } = props

    const handleChange = (e) => {
        onDataChange(e.target.value);
    };
    return (
        <div className={className ? className : "firstInputComponent"}>
            <div className={"namingDiv"}>{label}</div>
            <input type={textType}  name={name} className={"inputBorder"}
                   value={value}
                   disabled={disabled} onChange={handleChange} style={style} />
        </div>


    );


}

