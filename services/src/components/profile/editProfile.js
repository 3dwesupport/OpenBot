import React, {useContext, useEffect, useRef, useState} from "react";
import {Images} from "../../utils/images";
import {InputFieldComponent} from "../common/inputField/inputField";
import storeContext, {StoreContext} from "../../context/storeContext";
import {auth} from "../../database/firebase";
import LoaderComponent from "../common/loader/loaderComponent";
import Compressor from 'compressorjs';
import heic2any from "heic2any";
import styles from "./editProfile.module.css"
import inputStyles from "../common/inputField/inputField.css"
import {ThemeContext} from "@emotion/react";
import firebase from "firebase/compat/app";

export function EditProfile(props) {
    const {user, setUser} = useContext(StoreContext);
    const {theme, toggleTheme} = useContext(ThemeContext);
    const inputRef = useRef("-");
    const [isLoader, setIsLoader] = useState(false);
    const [file, setFile] = useState(user?.photoURL && user.photoURL);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isDropdownVisible,setIsDropdownVisible]=useState(false);
  //  const [DOB, setDOB] = useState(isDob);


    useEffect(() => {
        if (user?.displayName) {
            const names = user.displayName.split(' ');
            setFirstName(names[0] || ''); // Set the first name
            setLastName(names.slice(1).join(' ') || ''); // Set the last name
        }
    }, [user?.displayName]);


    useEffect(() => {
        if (user) {
            setIsLoader(false)
        } else {
            setIsLoader(true);
        }
    }, [user]);


    async function handleCompressFile(e) {
        const file = e.target.files[0];
        console.log("file:::", file);
        let convertedFile = file;
        if (file.type === 'image/heic' || file.type === 'image/heif') {
            try {
                const convertedImage = await heic2any({
                    blob: file,
                    toType: 'image/jpeg', // Convert HEIC to JPEG
                });

                convertedFile = new File([convertedImage], 'converted.jpg', {type: 'image/jpeg'});
            } catch (error) {
                // Handle conversion error
                console.error('Error converting HEIC image:', error);
                return;
            }
        }

        new Compressor(convertedFile, {
            quality: 0.2, // Set the compression quality (0 to 1)
            success(result) {
                setFile(result);
            },
            error(err) {
                setFile(convertedFile);
                console.log(err.message);
            },
        });
    }

    function toTimeStamp(dob) {
        const date = new Date(dob);
        return firebase.firestore.Timestamp.fromDate(date).toDate();

    }


    function changeUserImage(e) {
        console.log("image:::", e.target.files[0])
        handleCompressFile(e).then(() =>
            setUser({
                ...user,
                photoURL: URL.createObjectURL(e.target.files[0])
            })
        );
    }


    return (
        <div className={styles.mainScreen}>
            <div className={styles.parentDiv}>
                <div className={styles.editProfileContainer}>
                    <div className={styles.editProfileTextDiv}>Edit Profile</div>
                    <div className={styles.editProfileImageDiv}>
                        {isLoader ?
                            <div className={styles.profileImage}
                                 style={{
                                     borderRadius: "50%",
                                     border: "1px solid black",
                                     display: "flex",
                                     justifyContent: "center",
                                     alignItems: "center"
                                 }}>
                                <LoaderComponent color="blue" height="20" width="20"/>
                            </div> :
                            <img className={styles.profileImage} style={{borderRadius: "50%"}} src={user?.photoURL}
                                 alt={"user"}/>}
                        <input ref={inputRef} onChange={changeUserImage} style={{display: "none"}} type={"file"}
                               accept={"image/*,.heic,.heif,.jpeg"}/>
                        <img onClick={() => inputRef?.current?.click()} alt="edit profile icon"
                             className={styles.editProfileIcon} src={Images.EditProfileIcon}/>

                    </div>
                </div>
                <div className={styles.childDiv}>
                    <div className={styles.nameDiv}>
                        <InputFieldComponent label="First Name" textType="text" value={firstName}/>
                        <InputFieldComponent label="Last Name" textType="text" value={lastName}/>
                    </div>
                    <div className={styles.detailsDiv}>
                        <InputFieldComponent label="Date Of Birth"  textType="date" />
                    </div>

                    <div className={styles.emailDiv}>
                        <InputFieldComponent value={user?.email} label={"Email address"} textType={"email"} disabled={"true"}/>
                    </div>

                    <div className={styles.buttonSection}>
                        <div className={styles.saveButton}>
                            <div>Save</div>
                        </div>
                        <div className={styles.cancelButton}>
                            <div>Cancel</div>
                        </div>
                        <div className={styles.logOutSection}>
                            <div className={styles.logOutButton}>
                                <img alt={styles.icon} className={styles.logOutIcon} src={Images.logOutIcon}/>
                                <div className={styles.logoutDiv}>Logout</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}





