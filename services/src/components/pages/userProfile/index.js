import Header from "../../navbar/header";
import React from "react";
import {EditProfileComponent} from "../../profile/editProfileComponent";

/**
 * function to display user profile page
 * @returns {Element}
 * @constructor
 */
const UserProfile = () => {

    return (
        <div style={{height: "100vh"}}>
            <Header/>
            <EditProfileComponent/>
        </div>
    );
}
export default UserProfile;