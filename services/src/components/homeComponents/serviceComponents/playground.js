import React, {useContext} from "react";
import {localStorageKeys} from "../../../utils/constants";
import {StoreContext} from "../../../context/storeContext";

export function HomeServices() {
    return (
        <Playground/>
    );
}

export const Playground = () => {
    const {user} = useContext(StoreContext);

    const redirectToPlayground = () => {
        if (user != null) {
            const destinationUrl = 'https://www.openbot.itinker.io/';
            const accessToken = localStorage.getItem(localStorageKeys.accessToken);
            const playgroundUrl = `${destinationUrl}?user=${encodeURIComponent(JSON.stringify(user))}&accessToken=${encodeURIComponent(accessToken)}`;
            window.open(playgroundUrl, '_blank');
        } else {
            console.log("There is no user");
        }
    };
    return (
        <button onClick={redirectToPlayground}>Playground</button>
    );
}