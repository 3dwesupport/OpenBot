import {localStorageKeys} from '../utils/constants.js'
import {signInWithCustomToken} from 'firebase/auth'
import {auth} from '../firebase/authentication.js'
import {getUserPlan, uploadServerUsage} from '../firebase/APIs.js'
import Cookies from 'js-cookie'
import {checkPlanExpiration, deleteCookie, getCookie, signedInUser} from '../index.js'

/**
 * function to handle single sign on from openbot dashboard
 */
function handleSingleSignOn() {
    const cookie = getCookie(localStorageKeys.user)
    if (cookie) {
        const result = cookie
        localStorage.setItem(localStorageKeys.isSignIn, 'true')
        signInWithCustomToken(auth, result).then((res) => {
            // Use the user data or store it in a variable for later use
            signedInUser = res.user
            const signInBtn = document.getElementsByClassName('google-sign-in-button')[0]
            signInBtn.innerText = res.user.displayName
            localStorage.setItem(localStorageKeys.user, JSON.stringify(res.user))
            localStorage.setItem(localStorageKeys.isSignIn, true.toString())
            getUserPlan().then((res) => {
                console.log("res:::", res)
                Cookies.set(localStorageKeys.serverPlanDetails, JSON.stringify(res))
                checkPlanExpiration()
            })
            deleteCookie(localStorageKeys.user)
        })
            .catch((error) => {
                console.log('error::', error)
            })
    }
}

export function handleServerDetailsOnSSO() {
    const cookie = getCookie(localStorageKeys.user)
    if (cookie) {
        if (getCookie(localStorageKeys.serverStartTime)) {
            const time = new Date()
            uploadServerUsage(new Date(getCookie(localStorageKeys.serverStartTime)), time).then(() => {
                deleteCookie(localStorageKeys.serverStartTime)
                deleteCookie(localStorageKeys.serverEndTime)
                handleSingleSignOn()
            })
        } else {
            handleSingleSignOn()
        }
    }
}

/**
 * function to handle access token
 */
export function handleAccessToken() {
    const tokenCookie = getCookie('accessToken')
    if (tokenCookie) {
        deleteCookie('accessToken')
    }
}

/**
 * function to handle auth status on refreshing page
 */
export function handleAuthChangedOnRefresh() {
    if (localStorage.getItem(localStorageKeys.isSignIn) === 'true') {
        setTimeout(() => {
            auth.onAuthStateChanged((res) => {
                if (res != null) {
                    signedInUser = res
                    const signInBtn = document.getElementsByClassName('google-sign-in-button')[0]
                    signInBtn.innerText = res.displayName
                    localStorage.setItem(localStorageKeys.user, JSON.stringify(res))
                    localStorage.setItem(localStorageKeys.isSignIn, 'true')
                    if (getCookie(localStorageKeys.serverStartTime)) {
                        const time = new Date()
                        uploadServerUsage(new Date(Cookies.get(localStorageKeys.serverStartTime)), new Date(Cookies.get(localStorageKeys.serverEndTime)) ?? time).then(() => {
                            deleteCookie(localStorageKeys.serverStartTime)
                            deleteCookie(localStorageKeys.serverEndTime)
                        })
                    }
                    checkPlanExpiration()
                }
            })
        }, 1000)
    }
}