import React from "react";
import "./inputField.css";
import {Themes} from "../../../utils/constants";


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
        theme,
        style={},
    } = props

    const handleChange = (e) => {
        onDataChange(e.target.value);
    };
    return (
        <div className={className ? className : "firstInputComponent"}>
            <div className={"namingDiv"} style={{color: theme === Themes.dark ? '#FFFFFF' : '#303030' }}>
                {label}
            </div>
            <input type={textType} name={name}  className={`inputBorder ${theme === Themes.dark ? 'darkThemeInput' : ''}`} value={value}
                   disabled={disabled} onChange={handleChange} style={style} />

            {/*if text type is date and theme is dark then color of date picker icon gets changed*/}
            {textType === 'date' && (
                <style>
                    {`.inputBorder.${theme === Themes.dark ? 'darkThemeInput' : ''}::-webkit-calendar-picker-indicator {
                        filter: invert(1);
                    }`}
                </style>
            )}
        </div>
    );
}

