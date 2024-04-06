import React, {useContext} from "react";
import {Themes, userPlan} from "../../../utils/constants";
import {ThemeContext} from "../../../App";
import "./payment.css";

/**
 * function to take info from props and display
 * @param props
 * @returns {Element}
 * @constructor
 */
export function PaymentInfo(props) {
    const {images, text, color, click, infoText, buttonText} = props;
    const {theme} = useContext(ThemeContext);
    return (
        <>
            <div className={"headSuccessContainer"}
                 style={{
                     backgroundColor: theme === Themes.dark ? '#202020' : '#FFFFFF',
                     color: theme === Themes.dark ? "white" : "black"}}>
                <div className={'childDiv'}>
                    <img className="SuccessImg" src={images} alt={'icon'}/>
                    <div className={"paraDiv"}>
                        <p className={"infoText"}>{infoText}</p>
                        <p className={"text"}>{text}</p>
                    </div>
                    <button className={"successButton"} onClick={click}
                            style={{backgroundColor: color, borderColor: color}}>{buttonText}</button>
                </div>
            </div>
        </>
    )
}