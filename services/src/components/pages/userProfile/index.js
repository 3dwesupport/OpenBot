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
            <EditProfile />
        </div>
    );
}
export default UserProfile;