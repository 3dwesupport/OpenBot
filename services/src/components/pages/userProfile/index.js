import Header from "../../navbar/header";
import React from "react";
import {EditProfile} from "../../profile/editProfile";

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