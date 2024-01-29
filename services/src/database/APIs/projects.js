import {and, collection, getDocs, query, where} from "@firebase/firestore";
import {localStorageKeys, tables} from "../../utils/constants";
import {db} from "../authentication";

export async function getProjects(year, month) {
    return new Promise((resolve, reject) => {
        getDocDetails("status.year", year, "status.month", month).then((res) => {
            resolve(res);
        })
            .catch((e) => {
                reject(e);
            })
    })
}

export async function getDocDetails(fieldName, value, fieldMonth, monthValue) {
    try {
        const ordersQuery = query(collection(db, tables.projects), and(where(fieldName, '==', value), where("uid", '==', localStorage.getItem(localStorageKeys.UID)), where(fieldMonth, '==', monthValue)));
        const querySnapshot = await getDocs(ordersQuery);
        let count = 0;
        querySnapshot.forEach((doc) => {
            count += doc.data().status.update;
        });
        return count
    } catch (error) {
        console.log("error :", error);
    }
}