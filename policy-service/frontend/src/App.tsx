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
import {jsonRpc} from "./utils/ws";


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
        googleSigIn().then(async (res) => {
            console.log("res after google sign In::", res?.displayName);
            setUser({
                name: res?.displayName ?? "Google Sign In"
            });
            await jsonRpc('createIdDirectory', {})
            setIsSignIn("true");
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
                        </Navbar.Body>
                        <Nav pullRight>
                            <Nav.Item>{
                                <Button size={"sm"} style={{
                                    display: "flex",
                                    justifyContent: "space-evenly",
                                    alignItems: "center",
                                    backgroundColor: "#FFFFFF",
                                    width: 150
                                }} onClick={() => {
                                    if (isSignIn === "true") {
                                        userModal()
                                    } else {
                                        handleSignIn()
                                    }
                                }}>
                                    <img src={google} style={{height: 25}} alt="Google-sign-in"/>
                                    {isSignIn === "true" ? user.name : "Google Sign In"}
                                </Button>}</Nav.Item>
                        </Nav>
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
