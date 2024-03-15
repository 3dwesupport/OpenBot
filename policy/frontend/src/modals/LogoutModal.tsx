import {Modal, Button} from 'rsuite';
import {googleSignOut} from "../database/authentication";

export const LogoutModal = (params: { open: boolean; setOpen: any; }) => {
    const {open, setOpen} = params;
    const handleClose = () => setOpen(false);

    return (
        <Modal backdrop="static" size="xs"  open={open} onClose={handleClose}>
            <Modal.Header>
                <Modal.Title>Modal Title</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Are you sure want to logout ?
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={googleSignOut} appearance="primary">
                    Ok
                </Button>
                <Button onClick={handleClose} appearance="subtle">
                    Cancel
                </Button>
            </Modal.Footer>
        </Modal>
    );
};