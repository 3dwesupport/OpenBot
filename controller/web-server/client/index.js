/*
 * Developed for the OpenBot project (https://openbot.org) by:
 *
 * Ivo Zivkov
 * izivkov@gmail.com
 *
 * Date: Mon Nov 29 2021
 */

import {Connection} from './websocket/connection.js'
import {Keyboard} from './keyboardHandlers/keyboard.js'
import {BotMessageHandler} from './keyboardHandlers/bot-message-handler'
import {Commands} from './keyboardHandlers/commands'
import {RemoteKeyboard} from './keyboardHandlers/remote_keyboard'
import {uploadServerUsage, getServerDetails} from './firebase/APIs'
import {WebRTC} from './webRTC/webrtc.js'
import Cookies from 'js-cookie'
import {googleSigIn, googleSignOut} from './firebase/authentication'
import {Constants, localStorageKeys} from './utils/constants'
import {handleAccessToken, handleAuthChangedOnRefresh, handleServerDetailsOnSSO} from './serverHandler/index.js'

const connection = new Connection();
(async () => {
    const keyboard = new Keyboard()
    const botMessageHandler = new BotMessageHandler(connection)

    const onData = data => {
        // const msg = JSON.parse(data)
        botMessageHandler.handle(JSON.parse(data).status, connection)
    }

    const onQuit = () => {
        connection.stop()
    }

    await connection.start(onData)
    const webRtc = new WebRTC(connection)
    const sendToBot = (key) => {
        const msg = JSON.parse(key)
        let commands = {}
        if (signedInUser && signedInUser.email) {
            commands = {
                driveCmd: msg.driveCmd,
                roomId: signedInUser.email
            }
        } else {
            commands = {
                command: msg.command,
                roomId: signedInUser.email
            }
        }
        // connection.send(JSON.stringify(commands)) //This is for sending via socket)
        botMessageHandler.handle(commands, connection) // This is for sending via webRtc

    }
    const onKeyPress = (key) => {
        const command = new Commands(sendToBot)
        const remoteKeyboard = new RemoteKeyboard(command.getCommandHandler())
        // Send keypress to server
        const keyPressObj = {KEYPRESS: key}
        console.log(keyPressObj.KEYPRESS.key)
        if (keyPressObj.KEYPRESS.key === 'Escape') {
            if (webRtc != null) {
                webRtc.stop()
            }
        }
        remoteKeyboard.processKey(keyPressObj.KEYPRESS)
    }

    keyboard.start(onKeyPress, onQuit)
})()

export let signedInUser = JSON.parse(localStorage.getItem(localStorageKeys.user))

const signInButton = document.getElementsByClassName('google-sign-in-button')[0]
signInButton.addEventListener('click', handleSignInButtonClick)
const cancelButton = document.getElementById('logout-cancel-button')
const okButton = document.getElementById('logout-ok-button')
cancelButton.addEventListener('click', handleCancelButtonClick)
okButton.addEventListener('click', handleOkButtonClick)
const subscribeButton = document.getElementById('subscribe-button')
subscribeButton.addEventListener('click', handleSubscription)

/**
 * function to handle signIn on home page
 */
function handleSignInButtonClick() {
    if (localStorage.getItem(localStorageKeys.isSignIn) === 'false') {
        googleSigIn()
            .then((user) => {
                // Use the user data or store it in a variable for later use
                signedInUser = user
                const signInBtn = document.getElementsByClassName('google-sign-in-button')[0]
                signInBtn.innerText = user.displayName
                localStorage.setItem(localStorageKeys.user, JSON.stringify(user))
                localStorage.setItem(localStorageKeys.isSignIn, true.toString())
            })
            .catch((error) => {
                // Handle any errors that might occur during sign-in
                console.error('Error signing in:', error)
            })
    } else {
        showLogoutWrapper()
        hideExpirationWrapper()
    }
}

/**
 * function to sendId to remote server
 */
function sendId() {
    const response = {
        roomId: signedInUser.email
    }
    connection.send(JSON.stringify(response))
}

/**
 * function to handle signOut from google account
 */
function signOut() {
    signedInUser = null
    const signInBtn = document.getElementsByClassName('google-sign-in-button')[0]
    signInBtn.innerText = 'Sign in with Google'
    if (getCookie(localStorageKeys.serverStartTime)) {
        const time = new Date()
        uploadServerUsage(new Date(getCookie(localStorageKeys.serverStartTime)), time).then(() => {
            deleteCookie(localStorageKeys.serverStartTime)
            deleteCookie(localStorageKeys.serverEndTime)
            googleSignOut().then()
        })
    } else {
        googleSignOut().then()
    }
}

/**
 * function to handle cancel button on logout popup
 */
function handleCancelButtonClick() {
    hideLogoutWrapper()
}

/**
 * function to hide logout popup
 */
function hideLogoutWrapper() {
    const logout = document.getElementsByClassName('logout-wrapper')[0]
    logout.style.display = 'none'
}

/**
 * function to display logout popup
 */
function showLogoutWrapper() {
    const logout = document.getElementsByClassName('logout-wrapper')[0]
    logout.style.display = 'block'
}

/**
 * function to display expiration popup
 */
function showExpirationWrapper() {
    const expire = document.getElementsByClassName('plan-expiration-model')[0]
    expire.style.display = 'block'
}

/**
 * function to hide logout popup
 */
function hideExpirationWrapper() {
    const expire = document.getElementsByClassName('plan-expiration-model')[0]
    expire.style.display = 'none'
}

/**
 * function to handle "ok" button for logout popup
 */
function handleOkButtonClick() {
    hideLogoutWrapper()
    signOut()
}

/**
 * function to handle subscribe now button
 */
function handleSubscription() {
    window.open('', '_blank')
    console.log('Navigate to subscription page')
}

/**
 * function to get cookie from browser storage
 * @param cname
 * @returns {string}
 */
export function getCookie(cname) {
    const name = cname + '='
    const decodedCookie = decodeURIComponent(document.cookie)
    const ca = decodedCookie.split(';')
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i]
        while (c.charAt(0) === ' ') {
            c = c.substring(1)
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length)
        }
    }
    return ''
}

/**
 * function to delete cookie from browser storage
 * @param name
 */
export const deleteCookie = (name) => {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;'
}

handleAccessToken()
handleServerDetailsOnSSO()
handleAuthChangedOnRefresh()

// handling user usage for server duration when refreshing or closing page
window.onunload = function () {
    if (getCookie(localStorageKeys.serverStartTime)) {
        const time = new Date()
        Cookies.set(localStorageKeys.serverEndTime, time)
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