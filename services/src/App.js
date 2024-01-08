import './App.css';
import {RouterComponent} from "./components/router/routes";
import {useEffect, useState} from "react";
import {auth, getCustomToken} from "./databaseServices/firebase"
import StoreProvider from "./context/storeContext"
import {localStorageKeys} from "./utils/constants";
import Cookies from "js-cookie";

function App() {
    const [user, setUser] = useState(null);
    let isAndroid = /Android/i.test(navigator.userAgent);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const handleOnline = () => {
        setIsOnline(true)
    };
    const handleOffline = () => {
        setIsOnline(false)
    };

    useEffect(() => {
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);


        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [])

    useEffect(() => {
        if (isAndroid) {
            auth.getRedirectResult().then(async function (result) {
                if (result.credential) {
                    localStorage.setItem(localStorageKeys.accessToken, result.credential.accessToken);
                    localStorage.setItem("isSigIn", "true");
                    setUser({
                        photoURL: result.user?.photoURL,
                        displayName: result.user?.displayName,
                        email: result.user?.email,
                    });
                    const cookieOptions = {
                        // domain: '.openbot.org',
                        domain: 'localhost',
                        // domain: ".itinker.io",
                        secure: true,
                    };
                    let customToken = await getCustomToken(auth?.currentUser?.uid);
                    Cookies.set(localStorageKeys.accessToken, result.credential?.accessToken, cookieOptions);
                    Cookies.set(localStorageKeys.user, customToken, cookieOptions);
                }
            });
        }
    }, [])

    return (
        <StoreProvider user={user} setUser={setUser} isOnline={isOnline}>
            <div>
                <RouterComponent/>
            </div>
        </StoreProvider>
    );
}

export default App;
