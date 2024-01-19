import 'firebase/compat/auth';
import {collection, doc, setDoc,getDoc} from "@firebase/firestore";
import 'firebase/compat/firestore';
import {getDownloadURL, ref, uploadBytes} from 'firebase/storage';
import {FirebaseStorage, auth, db} from "./authentication";

/**
 * function to handle single sign-on using custom token
 * @returns {Promise<*>}
 * @param file
 * @param fileName
 */
export async function uploadProfilePic(file, fileName) {
    if (fileName === undefined) {
        return
    }
    const fileRef = ref(FirebaseStorage, "profile_pictures/" + auth.currentUser.uid + ".jpg")
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef)
}

export async function getCustomToken(UID) {
    try {
        const response = await fetch(`${process.env.DOMAIN_ADDRESS}/getToken?uid=${UID}`);
        const data = await response.json();
        return data.token
    } catch (error) {
        console.error('Error fetching token:', error);
    }
}


// Function to get the current date in the format YYYY-MM-DD
export async function getCurrentDateOfBirth() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


export async function getDateOfBirth(uid) {
    console.log("getDateOfBirth::::", uid)
    const docRef = doc(db, "users", uid);
    console.log("Getting date of birth from Firestore...");
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
            console.log("Date of birth from Firestore:", firebaseDOB);
            return firebaseDOB;

        }
    }
    const currentDOB = await getCurrentDateOfBirth();
    console.log("Date of birth not found in Firestore. Returning current date of birth:", currentDOB);
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

        console.log('Date of birth set successfully:', DOB);
    } catch (error) {
        console.error('Error setting date of birth:', error);
        throw error; // Re-throw the error to indicate failure
    }
}







