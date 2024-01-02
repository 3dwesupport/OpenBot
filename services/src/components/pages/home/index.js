import React, {useContext, useEffect} from "react";
import {auth, googleSigIn} from "../../../databaseServices/firebase";
import {StoreContext} from "../../../context/storeContext";
import {HomeServices} from "../../homeComponents/serviceComponents/playground";

export const Home = () => {

    const {setUser, setIsSignIn, isOnline} = useContext(StoreContext);

    useEffect(() => {
        auth.onAuthStateChanged((res) => {
            setUser({
                photoURL: res?.photoURL,
                displayName: res?.displayName,
                email: res?.email,
            });
        })
    }, [setUser]);

    function signIn() {
        if (isOnline) {
            googleSigIn().then(res => {
                setUser({
                    photoURL: res.user?.photoURL,
                    displayName: res.user?.displayName,
                    email: res.user?.email,
                });
                setIsSignIn(true);
            })
                .catch((err) => {
                    console.log("sign in error:", err);
                })
        } else {
            console.log("Internet is off")
            //TODO add slider for internet off
        }
    }

    return (
        <div>
            <button onClick={signIn}>Sign in
            </button>
            <HomeServices/>
        </div>
    );
}