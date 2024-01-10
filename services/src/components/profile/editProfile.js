import React, {useContext} from "react";
import {Images} from "../../utils/images";
import {InputFieldComponent} from "../common/inputField/inputField";
import storeContext from "../../context/storeContext";

export function EditProfile(props) {

    return (

        <div className={"mainScreen"}>

            <div className={"parentDiv"}>
                <div className={"editProfileContainer"}>
                    <div className={"editProfileTextDiv"}>Edit Profile</div>
                    <div className={"editProfileImage"}>
                        <img alt="icon" className={"editProfileIcon"} src={Images.EditProfileIcon}/>
                    </div>

                </div>
                <div className={"childDiv"}>
                    <div className={"nameDiv"}>
                        <InputFieldComponent label="First Name" textType="text"/>
                        <InputFieldComponent label="Last Name" textType="text"/>
                    </div>
                    <div className={"detailsDiv"}>
                        <InputFieldComponent label="Date Of Birth" textType="date"/>
                    </div>

                    <div className={"emailDiv"}>
                        <InputFieldComponent label={"Email address"} textType={"email"}/>
                    </div>

                    <div className={"buttonSection"}>
                        <div className={"saveButton"}>
                            <div>Save</div>
                        </div>
                        <div className={"cancelButton"}>
                            <div>Cancel</div>
                        </div>
                        <div className={"logOutSection"}>
                            <div className={"logOutButton"}>
                                <img alt={"icon"} className={"logOutIcon"} src={Images.logOutIcon}/>
                                <div className={"logoutDiv"}>Logout</div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>


    )
}






