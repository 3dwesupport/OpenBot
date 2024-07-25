import './App.css';
import {RouterComponent} from "./components/router/routes";
import {createContext, useEffect, useState} from "react";
import {auth, db} from "./database/authentication"
import StoreProvider from "./context/storeContext"
import {Constants, localStorageKeys, Themes} from "./utils/constants";
import Cookies from "js-cookie";
import {getCustomToken} from "./database/APIs/profile";
import {ToastContainer} from "react-toastify";
import {query, where, onSnapshot, collection} from "@firebase/firestore";

export const ThemeContext = createContext(null);

function App() {
    const [user, setUser] = useState();
    let isAndroid = /Android/i.test(navigator.userAgent);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    let onPageLoad = localStorage.getItem("theme") || ""
    const [theme, setTheme] = useState(onPageLoad);

    const handleOnline = () => {
        setIsOnline(true)
    };
    const handleOffline = () => {
        setIsOnline(false)
    };

    useEffect(() => {
        window.addEventListener(Constants.online, handleOnline);
        window.addEventListener(Constants.offline, handleOffline);
        return () => {
            window.removeEventListener(Constants.online, handleOnline);
            window.removeEventListener(Constants.offline, handleOffline);
        };
    }, [])

    useEffect(() => {
        if (isAndroid) {
            auth.getRedirectResult().then(async function (result) {
                if (result.credential) {
                    localStorage.setItem(localStorageKeys.accessToken, result.credential.accessToken);
                    localStorage.setItem(localStorageKeys.isSignIn, "true");
                    setUser({
                        photoURL: result.user?.photoURL,
                        displayName: result.user?.displayName,
                        email: result.user?.email,
                        uid: result.user?.uid
                    });

                    // to find expiration time
                    let currentDate = new Date();
                    let expirationDate = new Date(currentDate.getTime() + (1 * 60 * 60 * 1000));

                    const cookieOptions = {
                        // domain: '.openbot.org',
                        domain: 'localhost',
                        // domain: ".itinker.io",
                        secure: true,
                        expires: expirationDate,
                    };
                    let customToken = await getCustomToken(auth?.currentUser?.uid);
                    Cookies.set(localStorageKeys.accessToken, result.credential?.accessToken, cookieOptions);
                    Cookies.set(localStorageKeys.user, customToken, cookieOptions);
                }
            });
        }
    }, [])

    useEffect(() => {
        document.body.classList.toggle("dark-mode", theme === Themes.dark);
    }, [theme]);


    if (!localStorage.getItem("theme")) {
        const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)"); //check system theme
        //set system prefer theme in localstorage
        localStorage.setItem("theme", darkThemeMq.matches ? Themes.dark : Themes.light);
    }

    //if theme is dark and when click on change theme then setTheme light and vice-versa.
    const toggleTheme = () => {
        if (theme === "light") {
            setTheme("dark");
            localStorage.setItem("theme", Themes.dark);
            document.body.classList.replace("light", "dark"); // for background theme
        } else {
            setTheme("light");
            localStorage.setItem("theme", Themes.light);
            document.body.classList.replace("dark", "light"); //for background theme
        }
    };

    useEffect(()=>{
        const q=query(collection(db,"subscription"),where("uid","==",localStorage.getItem(localStorageKeys.UID)));
        onSnapshot(q,(snapshot)=>{
            snapshot.docChanges().forEach((change)=>{
                console.log("Which type changed :::",change);
                if (change.type === "added") {
                    console.log("New city: ", change.doc.data());
                    Cookies.set(localStorageKeys.planDetails,`${JSON.stringify(change.doc.data())}`);
                }
                if (change.type === "modified") {
                    console.log("Modified city: ", change.doc.data());
                    Cookies.set(localStorageKeys.planDetails,`${JSON.stringify(change.doc.data())}`);
                }
            })
        })
    })

    return (
        <ThemeContext.Provider value={{theme, toggleTheme}}>
            <StoreProvider user={user} setUser={setUser} isOnline={isOnline}>
                <div id={theme}>
                    <RouterComponent/>
                </div>
                <ToastContainer autoClose={5000}/>
            </StoreProvider>
        </ThemeContext.Provider>
    );
}

export default App;
