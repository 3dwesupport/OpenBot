import {and, collection, getCountFromServer, getDocs, query, where} from "@firebase/firestore";
import {localStorageKeys, Month, tables} from "../../utils/constants";
import {db} from "../authentication";

/**
 * function to get new model details on monthly and yearly basis
 * @param year
 * @param month
 * @returns {Promise<unknown>}
 */
export async function getModelDetails(year, month) {
    return new Promise(async (resolve, reject) => {
        try {
            let monthIndex = Month.indexOf(month);
            const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0); // Set the day to 1
            const endDate = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0); // Set the day to 1 of the next month
            const ordersQuery = query(collection(db, tables.models), and(where("created_at", '>=', startDate), where("created_at", '<', endDate), where("uid", '==', localStorage.getItem(localStorageKeys.UID))));
            const snapshot = await getCountFromServer(ordersQuery);
            resolve(snapshot.data().count);
        } catch (e) {
            console.log(e);
            reject(e);
        }
    })
}