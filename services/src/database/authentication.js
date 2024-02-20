import firebase from "firebase/compat/app";
import {getStorage} from "firebase/storage";
import {getFirestore} from "firebase/firestore";
import {Constants, localStorageKeys} from "../utils/constants";
import Cookies from "js-cookie";
import {getCustomToken} from "./APIs/profile";
import {getAuth, signOut} from "firebase/auth";
import {addSubscription} from "./APIs/subscription";

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
        await addSubscription(auth?.currentUser?.uid, Constants.free).then(async (res) => {
            localStorage.setItem(localStorageKeys.planDetails, JSON.stringify(res));
        });
        localStorage.setItem(localStorageKeys.UID, auth?.currentUser?.uid);
        let customToken = await getCustomToken(auth?.currentUser?.uid);
        Cookies.set(localStorageKeys.accessToken, signIn.credential?.accessToken, cookieOptions);
        Cookies.set(localStorageKeys.user, customToken, cookieOptions);
        return signIn
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
        localStorage.setItem(localStorageKeys.planDetails, "");
        localStorage.setItem(localStorageKeys.UID, "");
        Cookies.remove(localStorageKeys.user, cookieOptions)
        Cookies.remove(localStorageKeys.accessToken, cookieOptions);
    }).catch((error) => {
        console.log("Sign-out error ", error)
    });
}
