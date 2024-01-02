import React, {createContext, useState} from "react";

export const StoreContext = createContext(null);

export default ({children, user, setUser, isOnline}) => {
    const [isSignIn, setIsSignIn] = useState(false);

    const store = {
        isSignIn, setIsSignIn, isOnline,
        user, setUser
    }
    return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}