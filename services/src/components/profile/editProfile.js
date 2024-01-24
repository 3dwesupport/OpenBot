import React, {useContext, useEffect, useRef, useState} from "react";
import {Images} from "../../utils/images";
import {InputFieldComponent} from "../common/inputField/inputField";
import {StoreContext} from "../../context/storeContext";
import {auth} from "../../database/authentication.js";
import LoaderComponent from "../common/loader/loaderComponent";
import Compressor from 'compressorjs';
import heic2any from "heic2any";
import styles from "./editProfile.module.css";
import {Constants} from "../../utils/constants";
import {errorToast} from "../../utils/constants";
import {Avatar} from "@mui/material";
import firebase from "firebase/compat/app";
import ButtonComponent from "../common/button/buttonComponent";
import {getDateOfBirth, setDateOfBirth, uploadProfilePic} from "../../database/APIs";

export function EditProfile() {
    const {user, setUser} = useContext(StoreContext);
    const {isOnline} = useContext(StoreContext);
    const inputRef = useRef("-");
    const [isLoader, setIsLoader] = useState(false);
    const [isProfileLoader, setIsProfileLoader] = useState(false);
    const [file, setFile] = useState(user?.photoURL && user.photoURL);
    const [userDOB, setUserDOB] = useState("");
    const [userDetails, setUserDetail] = useState({
        displayName: user?.displayName,
        firstName: user?.displayName,
        lastName: user?.displayName,
        email: user?.email,
        photoUrl: user?.photoURL
    })
    useEffect(() => {
        setIsProfileLoader(true)
        if (user) {
            getDateOfBirth(user?.uid).then((res) => {
                setUserDOB(res);
                setIsProfileLoader(false)
            }).catch((e) => {
                setIsProfileLoader(false)
            })
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            const names = typeof user.displayName === 'string' ? user.displayName.split(' ') : [];
            setUserDetail({
                ...userDetails,
                firstName: names[0] || '',
                lastName: names.slice(1).join(' ') || '',
            })
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

    function handleNameChange(nameType, name) {
        switch (nameType) {
            case "firstName":
                setUserDetail(prevState => ({
                    ...prevState,
                    firstName: name,
                }));
                break
            case "lastName":
                setUserDetail(prevState => ({
                    ...prevState,
                    lastName: name,
                }));
                break
            default:
                console.error('Invalid nameType:', nameType);
        }
    }


    function changeUserImage(e) {
        handleCompressFile(e).then(() =>
            setUser({
                ...user,
                photoURL: URL.createObjectURL(e.target.files[0])
            })
        );
    }

    function toTimeStamp(dob) {
        const date = new Date(dob);
        return firebase.firestore.Timestamp.fromDate(date).toDate();

    }

    const handleDOBChange = async (newDOB) => {
        setUserDOB(newDOB);
    };


    async function handleSubmit() {
        console.log('save button clicked');
        if (isOnline) {
            if (user.photoURL !== file || user.displayName !== userDetails.displayName) {
                setIsLoader(true);
                setUserDetail(prevUserDetails => ({
                    ...prevUserDetails,
                    firstName: userDetails?.firstName,
                    lastName: userDetails?.lastName
                }));
                uploadProfilePic(file, file?.name || 'default file name').then(async (photoURL) => {
                    if (user.photoURL === file) {
                        photoURL = file;
                    }
                    await auth.currentUser?.updateProfile({
                        photoURL: photoURL,
                        displayName: `${userDetails?.firstName} ${userDetails?.lastName}`,
                    });
                    const updatedUser = auth.currentUser;
                    setIsLoader(false);
                })
                await setDateOfBirth(toTimeStamp(userDOB));
            }
        } else {
            errorToast(Constants.offlineMessage);
        }
    }

    return (
        <>
            {isProfileLoader ?
                <div className={styles.loader}>
                    <LoaderComponent color="blue"/>
                </div> :
                <div className={styles.mainScreen}>
                    <div className={styles.parentDiv}>
                        <div className={styles.editProfileContainer}>
                            <div className={styles.editProfileTextDiv}>Edit Profile</div>
                            <div className={styles.editProfileImageDiv}>
                                {isLoader ?
                                    <div className={styles.profileImage}>
                                        <LoaderComponent color="blue" height="20" width="20"/>
                                    </div> :
                                    <Avatar className={styles.profileImage} style={{
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        height: "100px",
                                        width: "100px"
                                    }}
                                            src={user?.photoURL}
                                            alt={"user"}/>}
                                <input ref={inputRef} onChange={changeUserImage} style={{display: "none"}} type={"file"}
                                       accept={"image/*,.heic,.heif,.jpeg"}/>

                                <img onClick={() => inputRef?.current?.click()} alt="edit profile icon"
                                     className={styles.editProfileIcon} src={Images.EditProfileIcon}/>

                            </div>
                        </div>
                        <div className={styles.childDiv}>
                            <div className={styles.nameDiv}>
                                <InputFieldComponent label="First Name" textType="text"  value={userDetails.firstName}
                                                     onDataChange={(name) => handleNameChange('firstName', name)}/>
                                <InputFieldComponent label="Last Name" textType="text" value={userDetails.lastName}
                                                     onDataChange={(name) => handleNameChange('lastName', name)}/>
                            </div>
                            <div className={styles.detailsDiv}>
                                <InputFieldComponent value={userDOB} label="Date Of Birth" textType="date"
                                                     onDataChange={handleDOBChange}
                                />
                            </div>

                            <div className={styles.emailDiv}>
                                <InputFieldComponent value={user?.email} label={"Email address"} textType={"email"}
                                                     disabled={true}/>
                            </div>

                            <div className={styles.buttonSection}>
                                <ButtonComponent label={"Save"} onClick={handleSubmit}/>
                            </div>
                        </div>

                    </div>

                </div>
            }
        </>

    );
}

