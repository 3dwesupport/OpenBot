import {BrowserRouter, Outlet, Route, Routes} from 'react-router-dom'
import {PathName} from "../../utils/constants";
import {Home} from "../pages/home";
import UserProfile from "../pages/userProfile";

/**
 * Router to maintain different paths of the application
 * @returns {JSX.Element}
 * @constructor
 */
export const RouterComponent = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path={PathName.home} element={<Outlet/>}>
                    <Route index element={<Home/>}/>
                    <Route path={PathName.editProfile} element={<UserProfile/>}/>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
