import styles from "../../profile/editProfile.module.css";
import React from "react";

export default function ButtonComponent(props) {
    const {
        label,
        onClick,
        classStyle,
        disabled,

    } = props
    return (
        <div onClick={disabled ? null : onClick} className={styles.saveButton + " " + classStyle}>
            <span>{label}</span>
        </div>
    )
}
