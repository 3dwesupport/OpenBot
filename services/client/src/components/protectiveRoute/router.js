import React, {useEffect, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {Outlet, Navigate} from 'react-router-dom'
import {verifySession} from "../../stripeAPI";

/**
 * function to add a protective route for payment routes
 * @returns {Element}
 * @constructor
 */
export const ProtectiveRoute = () => {
    const location = useLocation();
    const [isPaymentVerify, setIsPaymentVerify] = useState(false);
    const [isLoader, setIsLoader] = useState(true);
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        if (!sessionId) {
            setIsLoader(false);
        } else {
            setIsLoader(true);
            verifySession(sessionId)
                .then((res) => {
                    setIsPaymentVerify(res);
                    setIsLoader(false);
                    const newSearchParams = new URLSearchParams(location.search);
                    newSearchParams.delete('session_id');
                    window.history.replaceState({}, '', `${location.pathname}${newSearchParams.toString()}`);
                })
                .catch((e) => {
                    setIsLoader(false);
                    setIsPaymentVerify(false);
                    console.log(e);
                });
        }
    }, [location.search]);

    return (
        <>
            {isLoader ? (
                <div>Loading...</div>
            ) : isPaymentVerify ? (
                <Outlet/>
            ) : (
                <Navigate to="/"/>
            )}
        </>
    );
};


