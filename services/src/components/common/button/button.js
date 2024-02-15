import styles from "../../../pages/userProfile/userProfile.module.css";
import React from "react";

/**
 * ButtonComponent is a React functional component representing a custom button.
 * @param {Object} props - Component properties.
 * @param {string} props.label - Text to be displayed on the button.
 * @param {Function} props.onClick - Function to be executed when the button is clicked.
 * @param {string} props.classStyle - Additional CSS class to apply to the button.
 * @param {boolean} props.disabled - Indicates whether the button is disabled.
 * @returns {JSX.Element} - Rendered React element representing the button.
 */
export default function ButtonComponent(props) {
    const {
        label,
        onClick,
        classStyle,
        disabled,
        inlineStyle
    } = props
    return (
        <div onClick={disabled ? null : onClick} className={styles.saveButton + " " + classStyle} style={inlineStyle}>
            <span>{label}</span>
        </div>
    )
}
