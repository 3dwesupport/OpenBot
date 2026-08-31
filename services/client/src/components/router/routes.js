import {BrowserRouter, Route, Routes, useLocation} from 'react-router-dom'
import {PathName} from "../../utils/constants";
import {Home} from "../../pages/home";
import {UsageAnalysis} from "../../pages/analytics";
import Header from "../navbar/header";
import {BillingHistory} from "../../pages/billingHistory";
import {UserProfile} from "../../pages/userProfile";
import {Billing} from "../../pages/billing";
import React from "react";
import {PaymentSuccess} from "../../pages/payment/success";
import {PaymentFail} from "../../pages/payment/failure";
import {ProtectiveRoute} from "../protectiveRoute/router";

/**
 * Router to maintain different paths of the application
 * @returns {JSX.Element}
 * @constructor
 */
export const RouterComponent = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path={PathName.home}
                    element={<Layout><Home/>
                    </Layout>}
                />
                <Route
                    path={PathName.editProfile}
                    element={<Layout><UserProfile/></Layout>}
                />
                <Route
                    path={PathName.usageAnalysis}
                    element={<Layout><UsageAnalysis/>
                    </Layout>}
                />
                <Route
                    path={PathName.billingHistory}
                    element={<Layout><BillingHistory/>
                    </Layout>}
                />
                <Route
                    path={PathName.billing}
                    element={<Layout><Billing/></Layout>}
                />
                <Route element={<ProtectiveRoute/>}>
                    <Route
                        path={PathName.success}
                        element={<Layout><PaymentSuccess/></Layout>}
                    />
                    <Route
                        path={PathName.failure}
                        element={<Layout><PaymentFail/></Layout>}
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

const Layout = ({children}) => (
    <>
        <Header/>
        {children}
    </>
);



