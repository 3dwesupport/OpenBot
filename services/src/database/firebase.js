import firebase from "firebase/compat/app";
import 'firebase/compat/auth';
import {localStorageKeys, PathName} from "../utils/constants";
import Cookies from "js-cookie";
import {getAuth, signOut} from "firebase/auth";
import {collection, doc, setDoc, Timestamp} from "@firebase/firestore";
import {getDoc, getFirestore} from "firebase/firestore";
import 'firebase/compat/firestore';
import {getDownloadURL, getStorage, ref, uploadBytes} from 'firebase/storage';

/**
 * Firebase Configuration
 * @type {{storageBucket: *, apiKey: *, messagingSenderId: *, appId: *, projectId: *, measurementId: *, authDomain: *}}
 */
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
    measurementId: process.env.REACT_APP_MEASUREMENT_ID,
};


const app = firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();

export const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({prompt: 'select_account'});
provider.addScope("https://www.googleapis.com/auth/drive.file");
export const FirebaseStorage = getStorage()
export const db = getFirestore(app)
export default firebase;

/**
 * function to log in user with Google credentials provided by the user.
 * @returns {Promise<firebase.auth.UserCredential>}
 */
export async function googleSigIn() {
    let isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
        await auth.signInWithRedirect(provider)
    } else {
        const signIn = await auth.signInWithPopup(provider)
        localStorage.setItem(localStorageKeys.isSignIn, "true");
        const cookieOptions = {
            // domain: '.openbot.org',
            domain: 'localhost',
            // domain: ".itinker.io",
            secure: true,
        };
        let customToken = await getCustomToken(auth?.currentUser?.uid);
        Cookies.set(localStorageKeys.accessToken, signIn.credential?.accessToken, cookieOptions);
        Cookies.set(localStorageKeys.user, customToken, cookieOptions);
        return signIn
    }
}

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
        const response = await fetch(`http://localhost:9000/getToken?uid=${UID}`);
        const data = await response.json();
        return data.token
    } catch (error) {
        console.error('Error fetching token:', error);
    }
}

/**
 * function to log out user from Google account
 * @returns {Promise<void>}
 */
export async function googleSignOut() {
    const auth = getAuth();
    signOut(auth).then(() => {
        window.location.reload()
        localStorage.setItem(localStorageKeys.isSignIn, "false");
        const cookieOptions = {
            // domain: '.openbot.org',
            domain: 'localhost',
            // domain: ".itinker.io",
            secure: true,
        };
        Cookies.remove(localStorageKeys.user, cookieOptions)
        Cookies.remove(localStorageKeys.accessToken, cookieOptions);
    }).catch((error) => {
        console.log("Sign-out error ", error)
    });
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
    console.log("getDateOfBirth::::",uid)
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
        const data = { dob: DOB };

        // Call setDoc with the object data
        await setDoc(workspaceRef, data);

        console.log('Date of birth set successfully:', DOB);
    } catch (error) {
        console.error('Error setting date of birth:', error);
        throw error; // Re-throw the error to indicate failure
    }
}







