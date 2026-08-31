import {InputFieldComponent} from "../inputField/inputField";
import ButtonComponent from "../button/button";
import React from "react";
import './form.css';


/**
 * form component of edit profile page containing all the user details
 * @param props
 * @returns {Element}
 * @constructor
 */
export function FormComponent(props) {

    const {
        userDetails,
        handleNameChange,
        handleDOBChange,
        handleSubmit,
        isSaveDisabled,
        user,
        theme,
    } = props

    return (
        <>
            <div className={"nameDiv"}>
                <InputFieldComponent label="First Name" textType="text" value={userDetails.firstName}
                                     onDataChange={(name) => handleNameChange('firstName', name)} theme={theme}
                                     style={{
                                         border: userDetails?.firstName?.trim().length === 0 && "1px solid red",
                                         outline: userDetails?.firstName?.trim().length === 0 && "none",
                                     }}/>
                <InputFieldComponent label="Last Name" textType="text" value={userDetails.lastName}
                                     onDataChange={(name) => handleNameChange('lastName', name)} theme={theme}/>
            </div>
            <div className={"detailsDiv"}>
                <InputFieldComponent label="Date Of Birth" textType="date" value={userDetails.dob}
                                     onDataChange={handleDOBChange} theme={theme}/>
            </div>
            <div className={"emailDiv"}>
                <InputFieldComponent label={"Email address"} textType={"email"} value={user?.email}
                                     style={{color: "grey"}} disabled={true} theme={theme}/>
            </div>
            <div className={"buttonSection"}>
                <ButtonComponent label={"Save"} onClick={handleSubmit} disabled={isSaveDisabled}/>
            </div>
        </>
    )
}
