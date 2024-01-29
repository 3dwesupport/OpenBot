import {and, collection, getDocs, query, where} from "@firebase/firestore";
import {localStorageKeys, Month, tables} from "../../utils/constants";
import {db} from "../authentication";

/**
 * function to get projects according to specific year and month
 * @param year
 * @param month
 * @returns {Promise<unknown>}
 */
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

/**
 * function to get document details
 * @param fieldName
 * @param value
 * @param fieldMonth
 * @param monthValue
 * @returns {Promise<number>}
 */
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

/**
 * function to get compile code number on yearly basis
 * @param year
 * @returns {Promise<unknown>}
 */
export async function getProjectsMonthlyBasis(year) {
    return new Promise(async (resolve, reject) => {
        try {
            const ordersQuery = query(collection(db, tables.projects), and(where("status.year", '==', year), where("uid", '==', localStorage.getItem(localStorageKeys.UID))));
            const querySnapshot = await getDocs(ordersQuery);
            let updates = Array(12).fill(0);
            querySnapshot.forEach((doc) => {
                const monthIndex = Month.indexOf(doc.data().status.month);
                if (monthIndex !== -1) {
                    updates[monthIndex] += doc.data().status.update;
                }
            });
            resolve(updates);
        } catch (error) {
            console.log("error :", error);
            reject(error);
        }
    })
}