import {Constants, localStorageKeys} from '../utils/constants.js'
import {signInWithCustomToken} from 'firebase/auth'
import {auth} from '../firebase/authentication.js'
import {getServerDetails, getUserPlan, uploadServerUsage} from '../firebase/APIs.js'
import Cookies from 'js-cookie'
import {deleteCookie, getCookie, sendId, showExpirationWrapper} from '../index.js'

export let signedInUser = JSON.parse(localStorage.getItem(localStorageKeys.user))

/**
 * function to handle single sign on from openBot dashboard
 */
export function handleSingleSignOn() {
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

/**
 * function to handle server details
 */
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
export function handleAuthChangedOnRefresh(signedInUser) {
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

/**
 * function to check whether user subscription expires or not
 */
export function checkPlanExpiration() {
    if (localStorage.getItem(localStorageKeys.isSignIn) === 'true') {
        const details = getCookie(localStorageKeys.serverPlanDetails)
        console.log('details:::', details)
        if (details) {
            const items = JSON.parse(details)
            let isExpired = false
            let isIdSend = false
            getServerDetails().then((res) => {
                const endTimeCheckInterval = setInterval(() => {
                    if (new Date() >= new Date(items?.planEndDate)) { // If subscription time is reached
                        clearInterval(endTimeCheckInterval)
                        isExpired = true
                        showExpirationWrapper()
                    } else if (items?.planType === Constants.free && res >= 60) { // If free 60 minutes are over
                        clearInterval(endTimeCheckInterval)
                        isExpired = true
                        showExpirationWrapper()
                    } else if (items?.planType === Constants.standard && res >= 60 * 50) { // If standard and 3000 minutes are over
                        clearInterval(endTimeCheckInterval)
                        isExpired = true
                        showExpirationWrapper()
                    } else if (items?.planType === Constants.premium && res >= 60 * 480) { // If premium and 28800 minutes are over
                        clearInterval(endTimeCheckInterval)
                        isExpired = true
                        showExpirationWrapper()
                    } else if (!isExpired && !isIdSend) {
                        sendId()
                        isIdSend = true
                    }
                }, 100)// 1 minute in milliseconds
            })
        }
    }
}