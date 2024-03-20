import {and, collection, getDocs, query, where} from "@firebase/firestore";
import {db} from "../authentication";
import {localStorageKeys, Month, tables} from "../../utils/constants";

/**
 * function to get time duration for remote web server
 * @param year
 * @param month
 * @returns {Promise<unknown>}
 */
export async function getServerDetails(year, month) {
    let monthIndex = Month.indexOf(month);
    return new Promise(async (resolve, reject) => {
        try {
            const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0); // Set the day to 1
            const endDate = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0); // Set the day to 1 of the next month
            const ordersQuery = query(collection(db, tables.server), and(where("startTime", '>=', startDate), where("startTime", '<', endDate), where("uid", '==', localStorage.getItem(localStorageKeys.UID))));
            const querySnapshot = await getDocs(ordersQuery);
            let duration = 0;
            querySnapshot.forEach((doc) => {
                const startTime = new Date(doc.data()?.startTime.seconds * 1000 + doc.data()?.startTime.nanoseconds / 1e6);
                const endTime = new Date(doc.data()?.endTime.seconds * 1000 + doc.data()?.endTime.nanoseconds / 1e6);
                duration += (new Date(endTime) - new Date(startTime)) / 1000
            });
            resolve(duration);
        } catch (error) {
            console.log("error :", error);
            reject(error);
        }
    })
}