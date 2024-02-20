import {
    addDoc, and,
    collection, getCountFromServer, query, where,
} from "firebase/firestore";
import {auth, db} from "../services/firebase";
import {localStorageKeys, Month, tables} from "../utils/constants";
import {nanoid} from "nanoid";
import {getCookie} from "../services/workspace";

/**
 * function to upload model details to firebase firestore
 * @param modelName
 * @returns {Promise<void>}
 */
export async function uploadModelDetails(modelName) {
    const date = new Date();
    const details = {
        name: modelName,
        uid: auth?.currentUser.uid,
        created_at: date,
        id: nanoid()
    }
    try {
        await addDoc(collection(db, tables.models),
            details
        ).then();
    } catch (e) {
        console.log("error in uploading projects::", e);
    }
}

export async function getModelsCount() {
    const details = getCookie(localStorageKeys.planDetails)
    if (details) {
        const items = JSON.parse(details);
        const startDate = new Date(items?.planStartDate);
        const endDate = new Date(items.planEndDate);
        try {
            const ordersQuery = query(collection(db, tables.models), and(where("uid", '==', auth?.currentUser.uid), where("created_at", '>=', startDate), where("created_at", '<=', endDate)));
            const snapshot = await getCountFromServer(ordersQuery);
            return {count: snapshot.data().count, planType: items.planType, planEndDate: endDate};
        } catch (e) {
            console.log(e);
        }
    }
}