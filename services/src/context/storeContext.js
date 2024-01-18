import React, {createContext, useState} from "react";
import {localStorageKeys} from "../utils/constants";

export const StoreContext = createContext(null);

export default ({children, user, setUser, isOnline}) => {
    const [isSignIn, setIsSignIn] = useState(localStorage.getItem(localStorageKeys.isSignIn) ?? false);

    const store = {
        isSignIn, setIsSignIn, isOnline,
        user, setUser
    }
    return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}