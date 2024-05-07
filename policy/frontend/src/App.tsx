import {Route, Switch} from 'react-router-dom';
import {Button, Container, Content, Header, Nav, Navbar} from 'rsuite';
import 'rsuite/dist/styles/rsuite-default.css';
import {SessionListPage} from 'src/pages/SessionListPage';
import './App.css';
import {ConnectionAlert} from './components/ConnectionAlert';
import {HomePage} from './pages/HomePage';
import {ModelsPage} from './pages/ModelsPage';
import {TrainPage} from './pages/TrainPage';
import {auth, googleSigIn, googleSignOut} from "./database/authentication";
import {useEffect, useState} from "react";
import {LogoutModal} from "./modals/LogoutModal";
import {localStorageKeys} from "./utils/constants";


function App() {
    const [name, setName] = useState("Google Sign in");
    const [open, setOpen] = useState(false);

    useEffect(() => {
        auth.onAuthStateChanged((res) => {
            setName(res?.displayName ?? "Google Sign in");
        })
    }, [name])

    return (
        <>
            <Container className="App">
                {open && <LogoutModal open={open} setOpen={setOpen}/>}
                <Header>
                    <Navbar appearance="inverse">
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
                                <Nav.Item>{localStorage.getItem(localStorageKeys.isSignIn) === "true" ?
                                    <Button onClick={() => setOpen(true)}>{name}</Button> :
                                    <Button onClick={() => {
                                        googleSigIn().then((res) => {
                                            console.log("res after google sign In::", res?.displayName);
                                            setName(res?.displayName ?? "Google Sign In");
                                        })
                                    }}>Google Sign In</Button>}</Nav.Item>
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
        </>
    );
}

export default App;
