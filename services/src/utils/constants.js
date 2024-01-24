import {Images} from "./images";
import {toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
export const PathName = {
    "home": "/",
    "editProfile": "/editProfile"
}
export const localStorageKeys = {
    accessToken: "accessToken",
    user: "user",
    isSignIn: "isSignIn",
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
    ProfileSuccessMsg: "Profile updated successfully!",
    offlineMessage: "User is offline"
}

export const errorToast=(message)=>{
    toast.error(message,{
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

