import {BrowserRouter, Route, Routes} from 'react-router-dom'
import {PathName} from "../../utils/constants";
import {Home} from "../pages/home";
import UserProfile from "../pages/userProfile";
import Analytics from "../pages/analytics";
import Header from "../navbar/header";

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
                    element={<Layout><Home /></Layout>}
                />
                <Route
                    path={PathName.editProfile}
                    element={<Layout><UserProfile /></Layout>}
                />
                <Route
                    path={PathName.usageAnalysis}
                    element={<Layout><Analytics /></Layout>}
                />
            </Routes>
        </BrowserRouter>
    );
};

const Layout = ({ children }) => (
    <>
        <Header />
        {children}
    </>
);


