import {Images} from "./images";
import {toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const PathName = {
    "home": "/",
    "editProfile": "/editProfile",
    "usageAnalysis": "/usageAnalysis",
    "billingHistory": "/billingHistory",
    "billing": "/billing",
    "checkout": "/checkout",
    "success": "payment/success",
    "failure": "payment/failure"
}

export const localStorageKeys = {
    accessToken: "accessToken",
    user: "user",
    isSignIn: "isSignIn",
    UID: "UID",
    planDetails: "planDetails"
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
    {text: "Number of projects", emptyMessage: "No projects yet", value: 0},
    {text: "Number of models", emptyMessage: "No models yet", value: 0},
    {text: "Number of projects run", emptyMessage: "No projects run yet", value: 0},
    {text: "Web server", emptyMessage: "No duration yet", value: 0},
]

export const timeUnits = {
    hours: "hrs",
    minutes: "min",
    seconds: "sec",
    years: "yr",
    days: "days",
    month: "mos"
}

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
    signInText: "Please sign-in to checkout",
    free: "free",
    premium: "premium",
    standard: "standard",
    active: "ACTIVE",
    expired: "EXPIRED",
    false: "false",
    true: "true",
    success: "Your payment of $ was Successfully Completed",
    failure: "Your payment of $ was not Successful",
    successText: "Payment Successful!",
    failureText: "Payment Unsuccessful!",
    buttonSuccessText: "Done",
    buttonFailureText: "Try Again",

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

export const Colors={
    darkBackgroundColor:"#303030",
    lightBackgroundColor:"#FFFFFF",
    activeColor:"#0071C5",
    whiteColor:"#FFFFFF",
    blackColor:"#000000",
    buttonColor:"#0071C5",
    buttonBackgroundColor:"#F0F0F0"
}

export const upgradePlans={
    planType:"UPGRADE PLAN",
    upgradePlanType:"RENEW PLAN"
}
export const userPlan = [
    {
        title: "FREE PLAN",
        cost: "$0",
        description: "The Free Plan gives access to OpenBot services, including the Playground, Web Controller, Model training, Android app, and IOS app. ",
        services: [
            "Compile blockly code 50 times using OpenBot Playground",
            "1 hour limit for OpenBot Web-controller",
            "Train Autopilot/Point goal navigation Models on Google Colab."
        ],
        checkSign: Images.blackCheckMark,
        type: "free"

    }, {
        title: "STANDARD PLAN",
        cost: "$10",
        description: "The Standard Plan gives access to OpenBot services, including the Playground, Web Controller, Model training, Android app, and IOS app. ",
        services: [
            "Compile blockly code 200 times using OpenBot Playground",
            "50 hours limit for OpenBot Web-controller",
            "Train Autopilot/Point goal navigation Models on AWS Sagemaker for 10 hrs.",
        ],
        checkSign: Images.whiteCheckMark,
        type: "standard"
    },
    {
        title: "PREMIUM PLAN",
        cost: "$50",
        description: "The Premium Plan gives access to OpenBot services, including the Playground, Web Controller, Model training, Android app, and IOS app. ",
        services: [
            "Compile blockly code 1500 times of projects using OpenBot Playground",
            "20 days usage of OpenBot Web-controller",
            "Train Autopilot/Point goal navigation Models on AWS Sagemaker for 50 hrs.",
        ],
        checkSign: Images.whiteCheckMark,
        type: "premium"
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
    subscription: "subscription",
    projectsActivity: "projectActivity",
    transaction: "transaction"

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
