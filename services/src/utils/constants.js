import {Images} from "./images";
import {toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const PathName = {
    "home": "/",
    "editProfile": "/editProfile",
    "usageAnalysis": "/usageAnalysis",
    "billingHistory": "/billingHistory"
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


export const Constants = {
    online: "online",
    offline: "offline",
    offlineMessage: "User is offline",
    ProfileSuccessMsg: "Profile updated successfully!",
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

/**
 user usage tables
 */
export const tables = {
    users: "users",
    projects: "projects",
    models: "models",
    server: "server"
}

// month array
export const Month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
