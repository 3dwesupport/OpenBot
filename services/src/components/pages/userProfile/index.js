import Header from "../../homeComponents/navbar/header";
import React from "react";
import {EditProfileComponent} from "../../editProfile/editProfileComponent";

const UserProfile = () => {

    return (
        <div style={{height: "100vh"}}>
            <Header/>
            <EditProfileComponent/>
        </div>
    );
}
export default UserProfile;