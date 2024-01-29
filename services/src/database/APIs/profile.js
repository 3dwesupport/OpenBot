import 'firebase/compat/auth';
import {collection, doc, setDoc,getDoc} from "@firebase/firestore";
import 'firebase/compat/firestore';
import {getDownloadURL, ref, uploadBytes} from 'firebase/storage';
import {FirebaseStorage, auth, db} from "../authentication";

/**
 * function to upload profile photo to firebase storage
 * @param file
 * @param fileName
 * @returns {Promise<string>}
 */
export async function uploadProfilePic(file, fileName) {
    if (fileName === undefined) {
        return
    }
    const fileRef = ref(FirebaseStorage, "profile_pictures/" + auth.currentUser.uid + ".jpg")
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef)
}

/**
 * function to handle single sign-on using custom token
 * @returns {Promise<*>}
 * @param UID
 */
export async function getCustomToken(UID) {
    try {
        const response = await fetch(`${process.env.REACT_APP_DOMAIN_ADDRESS}/getToken?uid=${UID}`);
        const data = await response.json();
        return data.token
    } catch (error) {
        console.error('Error fetching token:', error);
    }
}


/**
 * Function to get the current date in the format YYYY-MM-DD
 */
export async function getCurrentDateOfBirth() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * function to get date of birth if exists
 * @param uid
 * @returns {Promise<string>}
 */
export async function getDateOfBirth(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {

        const dobTimestamp = docSnap.data()?.dob;

        if (dobTimestamp) {
            const date = new Date(dobTimestamp.toDate());
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            // return`${year}-${month}-${day}`; // dob which we are storing from firebase
            const firebaseDOB = `${year}-${month}-${day}`;
            return firebaseDOB;

        }
    }
    const currentDOB = await getCurrentDateOfBirth();
    return currentDOB; // current dob

}

/**
 * function to store date of birth in firebase
 * @param DOB
 * @returns {Promise<void>}
 */
export async function setDateOfBirth(DOB) {
    const workspaceRef = doc(collection(db, "users"), auth.currentUser?.uid);
    try {
        // Ensure that DOB is an object with a 'dob' property
        const data = {dob: DOB};

        // Call setDoc with the object data
        await setDoc(workspaceRef, data);

    } catch (error) {
        console.error('Error setting date of birth:', error);
        throw error; // Re-throw the error to indicate failure
    }
}







