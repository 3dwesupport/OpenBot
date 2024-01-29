import {and, collection, getDocs, query, where} from "@firebase/firestore";
import {db} from "../authentication";
import {localStorageKeys, tables} from "../../utils/constants";

export async function getServerDetails(year, month) {
    return new Promise(async (resolve, reject) => {
        try {
            const ordersQuery = query(collection(db, tables.server), and(where("uid", '==', localStorage.getItem(localStorageKeys.UID)), where("status.year", '==', year), where("status.month", '==', month)));
            const querySnapshot = await getDocs(ordersQuery);
            let duration = 0;
            querySnapshot.forEach((doc) => {
                let startTime = doc.data().startTime;
                let endTime = doc.data().endTime;
                duration += (new Date(endTime) - new Date(startTime)) / 1000
            });
            resolve(duration);
        } catch (error) {
            console.log("error :", error);
            reject(error);
        }
    })
}