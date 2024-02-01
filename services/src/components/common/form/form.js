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
        user
    } = props

    return (
        <>
            <div className={"nameDiv"}>
                <InputFieldComponent label="First Name" textType="text" value={userDetails.firstName}
                                     onDataChange={(name) => handleNameChange('firstName', name)}
                                     style={{
                                         border: userDetails?.firstName?.trim().length === 0 && "1px solid red",
                                         outline: userDetails?.firstName?.trim().length === 0 && "none",
                                     }}/>
                <InputFieldComponent label="Last Name" textType="text" value={userDetails.lastName}
                                     onDataChange={(name) => handleNameChange('lastName', name)}/>
            </div>
            <div className={"detailsDiv"}>
                <InputFieldComponent value={userDetails.dob} label="Date Of Birth" textType="date"
                                     onDataChange={handleDOBChange}/>
            </div>
            <div className={"emailDiv"}>
                <InputFieldComponent value={user?.email} label={"Email address"} style={{color: "grey"}}
                                     textType={"email"}
                                     disabled={true}/>
            </div>
            <div className={"buttonSection"}>
                <ButtonComponent label={"Save"} onClick={handleSubmit} disabled={isSaveDisabled}/>
            </div>
        </>
    )
}
