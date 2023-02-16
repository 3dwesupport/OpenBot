import React, {useState} from "react";
import styles from "./inputComponent.module.css"
import BlackText from "../fonts/blackText";

export default function SimpleInputComponent(props) {
    const {inputTitle, extraStyle, inputType, onDataChange} = props

    const date = new Date()
    let currentDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    function handleChange(e){
        setName(e.target.value)
        onDataChange(e.target.value);
    }

    const [name, setName] = useState(props?.value ? props.value : '');
    return (
        <div className={styles.mainDiv + " " + extraStyle}>
            <BlackText text={inputTitle}/>
            {
                inputType === "date" ?
                    <div className={styles.inputBorder}>
                        <input type="date" name="date"
                               min="1920-01-01"
                               max={currentDate}
                               defaultValue={currentDate}
                               className={styles.inputSection}

                        />
                    </div> :
                    inputType === "email" ?
                        <div className={styles.inputBorder}>
                            <input disabled={true} className={styles.inputSection} value={props.value}/>
                        </div> :
                        <div className={styles.inputBorder}>
                            <input className={styles.inputSection} value={name} onChange={handleChange} />
                        </div>
            }

        </div>

    )
}