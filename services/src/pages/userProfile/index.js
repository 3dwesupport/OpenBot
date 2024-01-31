import React, {useContext, useEffect, useRef, useState} from "react";
import {FormComponent} from "../../components/common/form/formComponent";
import {getDateOfBirth, setDateOfBirth, uploadProfilePic} from "../../database/APIs/profile";
import firebase from "firebase/compat/app";
import {errorToast, successToast} from "../../utils/constants";
import LoaderComponent from "../../components/common/loader/loaderComponent";
import {Avatar} from "@mui/material";
import {Images} from "../../utils/images";
import {StoreContext} from "../../context/storeContext";
import {Constants} from "../../utils/constants";
import styles from "./userProfile.module.css";
import auth from "../../database/authentication"
import heic2any from "heic2any";
import Compressor from 'compressorjs';

/**
 * Edit profile component
 * @returns {Element}
 * @constructor
 */
export function UserProfile() {
    const {user} = useContext(StoreContext);
    const {isOnline} = useContext(StoreContext);
    const inputRef = useRef("-");
    const [isProfileLoader, setIsProfileLoader] = useState(false);
    const [file, setFile] = useState(user?.photoURL);
    const [isSaveDisabled, setIsSaveDisabled] = useState(false);
    const [userDetails, setUserDetails] = useState({
        displayName: user?.displayName,
        firstName: user?.displayName,
        lastName: user?.displayName,
        email: user?.email,
        photoURL: user?.photoURL,
        dob : ""
    })
    // useEffect to fetch and update user profile data when the 'user' object changes
    useEffect(() => {
        if (!user) {
            return;
        }
        setIsProfileLoader(true);

        (async () => {
            try {
                const [dob, names] = await Promise.all([
                    getDateOfBirth(user.uid),
                    user.displayName ? user.displayName.split(' ') : [],
                ]);
                setUserDetails((prevState) => ({
                    ...prevState,
                    firstName: names[0] || '',
                    lastName: names[1] || '',
                    photoURL: user.photoURL || prevState.photoURL,
                    dob: dob,
                }));
            } catch (error) {
                console.error("Error fetching profile data:", error);
            } finally {
                setIsProfileLoader(false);
            }
        })();
    }, [user]);


    /**
     * function to compress the profile image
     * @param e
     * @returns {Promise<void>}
     */
    async function handleCompressFile(e) {
        const file = e.target.files[0];
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

    /**
     * function to handle name change
     */
    function handleNameChange(nameType, name) {
        switch (nameType) {
            case "firstName":
                setUserDetails(prevState => ({
                    ...prevState,
                    firstName: name,
                }));
                setIsSaveDisabled(name.trim().length === 0);
                break
            case "lastName":
                setUserDetails(prevState => ({
                    ...prevState,
                    lastName: name,
                }));
                break
            default:
                console.error('Invalid nameType:', nameType);
        }
    }

    /**
     * function to handle user image change
     * @param e
     */
    function changeUserImage(e) {
        handleCompressFile(e).then(() =>
            setUserDetails({
                ...userDetails,
                photoURL: URL.createObjectURL(e.target.files[0])
            })
        );
    }

    /**
     * TimeStamp format for setting DOB
     * @param dob
     * @returns {Date}
     */
    function toTimeStamp(dob) {
        const date = new Date(dob);
        return firebase.firestore.Timestamp.fromDate(date).toDate();

    }

    /**
     * handle Date of birth change
     * @param newDOB
     * @returns {Promise<void>}
     */
    const handleDOBChange = (newDOB) => {
        setUserDetails({
            ...userDetails,
            dob: newDOB
        })
    };

    /**
     * Handling save button on edit profile modal
     * @returns {Promise<void>}
     */
    async function handleSubmit() {
        setIsProfileLoader(true);
        console.log('save button clicked');

        if (isOnline) {
            // Check if there are changes in profile picture or display name
            if (file !== undefined || user.displayName !== `${userDetails?.firstName} ${userDetails?.lastName}`) {
                try {
                    let photoURL = user.photoURL;

                    // Upload new profile picture if a new file is selected
                    if (file) {
                        photoURL = await uploadProfilePic(file, file.name || 'user profile image');
                    }

                    // Update profile information
                    await auth.currentUser?.updateProfile({
                        photoURL: photoURL,
                        displayName: `${userDetails?.firstName} ${userDetails?.lastName}`,
                    });

                    // Refresh the user object
                    const updatedUser = auth.currentUser;
                    await setDateOfBirth(toTimeStamp(userDetails.dob));
                    successToast(Constants.ProfileSuccessMsg);
                } catch (e) {
                    console.error("Error in updating profile:", e);
                    // TODO: Show failure toast for profile update
                }
            }
            setIsProfileLoader(false);
        } else {
            errorToast(Constants.offlineMessage);
        }
    }

    return (
        <div style={{height: "100vh"}}>
            {isProfileLoader ?
                <div className={styles.loader}>
                    <LoaderComponent color='blue'/>
                </div>:
                <div className={styles.mainScreen}>
                    <div className={styles.parentDiv}>
                        <div className={styles.editProfileContainer}>
                            <div className={styles.editProfileTextDiv}>Edit Profile</div>
                            <div className={styles.editProfileImageDiv}>
                                <div className={styles.profileImage}>
                                </div>
                                <Avatar className={styles.profileImage} style={{
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    height: "100px",
                                    width: "100px"
                                }}
                                        src={userDetails?.photoURL}
                                        alt={"user"}/>
                                <input ref={inputRef} onChange={changeUserImage} style={{display: "none"}} type={"file"}
                                       accept={"image/*,.heic,.heif,.jpeg"}/>
                                <img onClick={() => inputRef?.current?.click()} alt="edit profile icon"
                                     className={styles.editProfileIcon} src={Images.EditProfileIcon}/>
                            </div>
                        </div>
                        <div className={styles.childDiv}>
                        <FormComponent userDetails={userDetails} handleNameChange={handleNameChange} handleDOBChange={handleDOBChange}
                                       handleSubmit={handleSubmit} isSaveDisabled={isSaveDisabled} user={user}/>
                        </div>
                    </div>
                </div>
            }
        </div>
    );
}

