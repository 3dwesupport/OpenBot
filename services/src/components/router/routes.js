import {BrowserRouter, Outlet, Route, Routes} from 'react-router-dom'
import {PathName} from "../../utils/constants";
import {Home} from "../pages/home";

export const RouterComponent = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path={PathName.home} element={<Outlet/>}>
                    <Route index element={<Home/>}/>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}