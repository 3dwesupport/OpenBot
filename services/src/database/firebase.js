import firebase from "firebase/compat/app";
import 'firebase/compat/auth';
import {localStorageKeys, PathName} from "../utils/constants";
import Cookies from "js-cookie";
import {getAuth, signOut} from "firebase/auth";

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
// export const FirebaseStorage = getStorage()
// export const db = getFirestore(app)
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
 * @param UID
 * @returns {Promise<*>}
 */
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
