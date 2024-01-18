import Header from "../../navbar/header";
import React, {useState} from "react";
import {EditProfile} from "../../profile/editProfile";
import {getDateOfBirth} from "../../../database/firebase";
import LoaderComponent from "../../common/loader/loaderComponent";

/**
 * function to display user profile page
 * @returns {Element}
 * @constructor
 */
const UserProfile = () => {

    return (
        <div style={{height: "100vh"}}>
            <Header/>
            <EditProfile />
        </div>
    );
}
export default UserProfile;