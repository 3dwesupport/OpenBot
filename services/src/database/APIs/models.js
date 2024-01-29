import {and, collection, getCountFromServer, getDocs, query, where} from "@firebase/firestore";
import {localStorageKeys, tables} from "../../utils/constants";
import {db} from "../authentication";


export async function getModelDetails(year, month) {
    return new Promise(async (resolve, reject) => {
        try {
            const ordersQuery = query(collection(db, tables.models), and(where("status.year", '==', year), where("uid", '==', localStorage.getItem(localStorageKeys.UID)), where("status.month", '==', month)));
            let snapshot = await getCountFromServer(ordersQuery);
            resolve(snapshot.data().count);
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}