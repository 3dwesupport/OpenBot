import {Modal, Button, ModalProps} from 'rsuite';
import {googleSignOut} from "../database/authentication";

type LogoutModelProps = ModalProps & { show: boolean; onHide: () => void; setIsSignIn: (b: string) => void };

export const LogoutModal = ({show, onHide, setIsSignIn}: LogoutModelProps) => {
    return (
        <>
            <Modal backdrop="static" size="sm" show={show} onHide={onHide}>
                <Modal.Header>
                    <Modal.Title>Confirm Logout</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure want to logout ?
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={() => {
                        googleSignOut().then(() => {
                            setIsSignIn("false");
                            onHide()
                        });
                    }} appearance="primary">
                        Yes
                    </Button>
                    <Button onClick={onHide} appearance="subtle">
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};