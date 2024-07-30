import {initializeApp} from 'firebase/app'
import {getAuth, signOut, signInWithPopup, GoogleAuthProvider} from 'firebase/auth'
import {getFirestore} from '@firebase/firestore'
import {getStorage} from 'firebase/storage'
import Cookies from 'js-cookie'
import {checkPlanExpiration, deleteCookie} from '../index'
import {getUserPlan} from './APIs'
import {localStorageKeys} from '../utils/constants'

// firebaseConfig.js
const firebaseConfig = {
    apiKey: import.meta.env.SNOWPACK_PUBLIC_FIREBASE_API_KEY,
    authDomain: import.meta.env.SNOWPACK_PUBLIC_AUTH_DOMAIN,
    projectId: import.meta.env.SNOWPACK_PUBLIC_PROJECT_ID,
    storageBucket: import.meta.env.SNOWPACK_PUBLIC_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.SNOWPACK_PUBLIC_MESSAGING_SENDER_ID,
    appId: import.meta.env.SNOWPACK_PUBLIC_APP_ID,
    measurementId: import.meta.env.SNOWPACK_PUBLIC_MEASUREMENT_ID
}
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
const provider = new GoogleAuthProvider()
export const FirebaseStorage = getStorage()
export const db = getFirestore(app)

/**
 * Function to google Sign in
 * @returns {Promise<unknown>}
 */
export function googleSigIn() {
    return new Promise((resolve, reject) => {
        signInWithPopup(auth, provider)
            .then((result) => {
                // The signed-in user info.
                const user = result.user
                getUserPlan().then((res) => {
                    Cookies.set(localStorageKeys.serverPlanDetails, JSON.stringify(res))
                    checkPlanExpiration()
                })
                resolve(user)
            })
            .catch((error) => {
                // Handle Errors here.
                reject(error)
            })
    })
}

/**
 * function to log out user from Google account
 * @returns {Promise<void>}
 */
export async function googleSignOut() {
    signOut(auth).then(() => {
        localStorage.setItem(localStorageKeys.user, null)
        localStorage.setItem(localStorageKeys.isSignIn, false.toString())
        deleteCookie(localStorageKeys.serverPlanDetails)
    }).catch((error) => {
        console.log('Sign-out error ', error)
    })
}
