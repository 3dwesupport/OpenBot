import firebase from "firebase/compat/app";
import {getStorage} from "firebase/storage";
import {getFirestore} from "firebase/firestore";
import {getAuth, signOut, GoogleAuthProvider, signInWithPopup} from "firebase/auth";
import {localStorageKeys} from "../utils/constants";
import {jsonRpc} from "../utils/ws";

/**
 * Firebase Configuration
 * @type {{storageBucket: *, apiKey: *, messagingSenderId: *, appId: *, projectId: *, measurementId: *, authDomain: *}}
 */
const firebaseConfig: {
    storageBucket: any;
    apiKey: any;
    messagingSenderId: any;
    appId: any;
    projectId: any;
    measurementId: any;
    authDomain: any;
} = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
    measurementId: process.env.REACT_APP_MEASUREMENT_ID,
};

const app = firebase.initializeApp(firebaseConfig);

export const auth = getAuth();
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({prompt: 'select_account'});
provider.addScope("https://www.googleapis.com/auth/drive.file")
export const FirebaseStorage = getStorage()
export const db = getFirestore(app)
export default firebase;

/**
 * function to log in user with Google credentials provided by the user.
 * @returns {Promise<firebase.auth.UserCredential>}
 */
export async function googleSigIn() {
    const signIn = await signInWithPopup(auth, provider);
    localStorage.setItem(localStorageKeys.isSignIn, "true");
    const uid = auth?.currentUser?.uid; // Assuming auth is of type Auth | undefined\
    if (uid != undefined) {
        localStorage.setItem(localStorageKeys.uid, uid);
        // @ts-ignore: Property 'credential' does not exist on type 'UserCredential'
        localStorage.setItem(localStorageKeys.accessToken, signIn._tokenResponse.oauthAccessToken);
    }
    return auth.currentUser;
}

/**
 * function to log out user from Google account
 * @returns {Promise<void>}
 */
export async function googleSignOut() {
    signOut(auth).then(() => {
        window.location.reload();
        localStorage.setItem(localStorageKeys.isSignIn, "false");
        localStorage.setItem(localStorageKeys.uid, " ");
        localStorage.setItem(localStorageKeys.accessToken, " ");
        window.location.reload();
    }).catch((error) => {
        console.log("Sign-out error ", error)
    });
}
