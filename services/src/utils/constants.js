import {Images} from "./images";
import {toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const PathName = {
    "home": "/",
    "editProfile": "/editProfile",
    "usageAnalysis": "/usageAnalysis",
    "billingHistory": "/billingHistory",
    "billing": "/billing"
}

export const localStorageKeys = {
    accessToken: "accessToken",
    user: "user",
    isSignIn: "isSignIn",
    UID: "UID"
}
// Array of card data
export const CardData = [
    {bgColor: "#FFAB1A", image: Images.openbotCardIcon, text: "OpenBot Playground"},
    {bgColor: "#8156C9", image: Images.webServerCardIcon, text: "Web Server"},
    {bgColor: "#4B40D6", image: Images.trainModelCardIcon, text: "Train your Own Model"},
    {bgColor: "#5C96EA", image: Images.billingCardIcon, text: "Billing"},
    {bgColor: "#EA3D78", image: Images.downloadCloudCardIcon, text: "Download Apps"},
    {bgColor: "#B73DDF", image: Images.graphCardIcon, text: "Usage Analytics"},
];

export const UserAnalysisCardData = [
    {text: "Number of Projects"},
    {text: "Number of Models"},
    {text: "Projects Run"},
    {text: "Remote Server"},
]

export const Constants = {
    online: "online",
    offline: "offline",
    offlineMessage: "User is offline",
    ProfileSuccessMsg: "Profile updated successfully!",
    signInMessage: "You need to sign in to analyse usage",
    usageAnalysis: "Usage Analysis",
    billingHistory: "Billing History",
    billingTitle: "Choose your plan",
    profileErrorMsg: "There was an error in updating profile",
    free : "free",
    premium : "premium"
}

export const errorToast = (message) => {
    toast.error(message, {
        position: 'top-center',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
        theme: 'colored',
        pauseOnFocusLoss: false,
    })

}
export const successToast = (message) => {
    toast.success(message, {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        background: '#4CAF50',
        color: '#ffffff',
        borderRadius: '8px',
    })
}

export const userPlan = [
    {
        title: "FREE PLAN",
        cost: "$0",
        description: "The Free Plan gives access to OpenBot services, including the Playground, Web Controller, Android app, and iOS app. ",
        services: [
            "Compile 5 projects using OpenBot Playground",
            "1 hour limit for OpenBot Web-controller",
            "Run 5 projects through the app by scanning QR code",
            "Train 2 AI models using training service",
            "Upload 2 AI models from Playground"
        ],
        planType: "CURRENT PLAN",
        lightBackgroundColor: "#FFFFFF",
        darkBackgroundColor: "#303030",
        buttonBackgroundColor: "#F0F0F0",
        color: "black",
        buttonColor: "#ACABAB",
        checkSign: Images.blackCheckMark
    },
    {
        title: "PREMIUM PLAN",
        cost: "$50",
        description: "The Premium Plan gives access to OpenBot services, including the Playground, Web Controller, Android app, and iOS app. ",
        services: [
            "Unlimited compiling of projects using OpenBot Playground",
            "Unlimited usage of OpenBot Web-controller",
            "Run unlimited projects from app by scanning QR code",
            "Train unlimited AI models using training service",
            "Upload unlimited models from Playground"
        ],
        planType: "UPGRADE PLAN",
        lightBackgroundColor: "#0071C5",
        darkBackgroundColor: "#0071C5",
        buttonBackgroundColor: "#FFFFFF",
        color: "#FFFFFF",
        buttonColor: "#0071C5",
        checkSign: Images.whiteCheckMark,
    }
]

/**
 user usage tables
 */
export const tables = {
    users: "users",
    projects: "projects",
    models: "models",
    server: "server",
    subscription: "subscription"
}

// month array
export const Month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * dark and light theme constants
 * @type {{light: string, dark: string}}
 */
export const Themes = {
    "light": "light",
    "dark": "dark",
}
