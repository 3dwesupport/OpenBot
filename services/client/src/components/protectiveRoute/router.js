import React, {useEffect, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {Outlet, Navigate} from 'react-router-dom'
import {verifySession} from "../../stripeAPI";
import {PathName} from "../../utils/constants";
import {AnalyticsLoader} from "../common/loader/loader";
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
                    const newSearchParams = new URLSearchParams(location.search);
                    newSearchParams.delete('session_id');
                    newSearchParams.set('amount', res.amount);
                    window.history.replaceState({}, '', `${location.pathname}?${newSearchParams.toString()}`);
                    setIsPaymentVerify(res.status);
                    setIsLoader(false);
                })
                .catch((e) => {
                    setIsLoader(false);
                    setIsPaymentVerify(false);
                    console.log(e);
                });
        }
    }, [location.pathname, location.search, sessionId]);

    return (
        <>
            {isLoader && <AnalyticsLoader/>}
            {isLoader ? (
                <div></div>
            ) : isPaymentVerify ? (
                <Outlet isLoader={"true"}/>
            ) : (
                <Navigate to={PathName.home}/>
            )}
        </>
    );
};


