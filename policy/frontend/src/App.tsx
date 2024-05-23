import {Route, Switch} from 'react-router-dom';
import {Button, Container, Content, Header, Nav, Navbar} from 'rsuite';
import 'rsuite/dist/styles/rsuite-default.css';
import {SessionListPage} from 'src/pages/SessionListPage';
import './App.css';
import {ConnectionAlert} from './components/ConnectionAlert';
import {HomePage} from './pages/HomePage';
import {ModelsPage} from './pages/ModelsPage';
import {TrainPage} from './pages/TrainPage';
import {auth, googleSigIn} from "./database/authentication";
import {useEffect, useState} from "react";
import {LogoutModal} from "./modals/LogoutModal";
import {localStorageKeys} from "./utils/constants";
import {useToggle} from "./utils/useToggle";
import google from "./assets/icons/google-icon.png"

function App() {
    const [user, setUser] = useState({name: "Google Sign In"});
    const [show, userModal] = useToggle();
    const [isSignIn, setIsSignIn] = useState(localStorage.getItem(localStorageKeys.isSignIn) ?? "false");

    useEffect(() => {
        auth.onAuthStateChanged((res) => {
            if (res != undefined) {
                setUser({
                    name: res.displayName ?? "Google Sign In"
                });
            }
        })
    }, [setUser])

    function handleSignIn() {
        console.log("clicked sign in");
        googleSigIn().then((res) => {
            if (res != undefined) {
                console.log("res after google sign In::", res?.displayName);
                setUser({
                    name: res.displayName ?? "Google Sign In"
                });
                setIsSignIn("true");
            }
        })
    }

    return (
        <>
            <Container className="App">
                <Header>
                    <Navbar appearance="inverse" className="navbar">
                        <Navbar.Header>
                            <a href="#/" className="navbar-brand logo">OpenBot Driving Policy Trainer</a>
                        </Navbar.Header>
                        <Navbar.Body>
                            <Nav>
                                <Nav.Item href="#/">Datasets</Nav.Item>
                                <Nav.Item href="#/models">Models</Nav.Item>
                                <Nav.Item href="#/uploaded">Uploaded</Nav.Item>
                                <Nav.Item href="#/train">Train</Nav.Item>
                            </Nav>
                            <Nav pullRight>
                                <Nav.Item>{isSignIn === "true" ?
                                    <Button onClick={() => {
                                        userModal()
                                    }}>{user.name}</Button> :
                                    <Button style={{
                                        color: "black", display: "flex",
                                        justifyContent: "space-evenly", width: 170
                                    }} onClick={handleSignIn}>
                                        <img src={google}
                                             style={{
                                                 height: 25,
                                             }}
                                             alt="Google-sign-in"/>
                                        Google Sign In
                                    </Button>}</Nav.Item>
                            </Nav>
                        </Navbar.Body>
                    </Navbar>
                </Header>
                <Content>
                    <Switch>
                        <Route path="/models">
                            <ModelsPage/>
                        </Route>
                        <Route path="/uploaded">
                            <SessionListPage/>
                        </Route>
                        <Route path="/train_data/:dataset">
                            <SessionListPage/>
                        </Route>
                        <Route path="/test_data/:dataset">
                            <SessionListPage/>
                        </Route>
                        <Route path="/train">
                            <TrainPage/>
                        </Route>
                        <Route>
                            <HomePage/>
                        </Route>
                    </Switch>
                </Content>
                <ConnectionAlert/>
            </Container>
            {<LogoutModal show={show} onHide={userModal} setIsSignIn={setIsSignIn}/>}
        </>
    );
}

export default App;
