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
        getDocDetails().then((res) => {
            const data = filterEarliestOccurrences(res);
            let count = data.filter((item) => item.year === year && item.month === month);
            resolve(count.length ?? 0);
        })
            .catch((e) => {
                reject(e);
            })
    })
}

/**
 * function to filter unique project in the current month-year
 * @param array
 * @returns {*}
 */
function filterEarliestOccurrences(array) {
    const earliestOccurrences = new Map();
    array.forEach((item) => {
        const key = item.name;
        const currentDate = new Date(`${item.year}-${item.month}`);

        if (!earliestOccurrences.has(key) || currentDate < earliestOccurrences.get(key)) {
            earliestOccurrences.set(key, currentDate);
        }
    });
    // Filter based on the earliest date for each unique name
    return array.filter((item) => {
        const key = item.name;
        const currentDate = new Date(`${item.year}-${item.month}`);
        const earliestDate = earliestOccurrences.get(key);

        return currentDate.getTime() === earliestDate.getTime();
    });
}


/**
 * function to get all document details
 * @returns {Promise<*[]>}
 */
export async function getDocDetails() {
    try {
        const ordersQuery = query(collection(db, tables.projects), where("uid", '==', localStorage.getItem(localStorageKeys.UID)));
        const querySnapshot = await getDocs(ordersQuery);
        let array = [];
        querySnapshot.forEach((doc) => {
            array.push({name: doc.data().name, year: doc.data().status.year, month: doc.data().status.month})
        });
        return array
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

/**
 * function to get years from firestore
 * @returns {Promise<unknown[]>}
 */
export async function getYears() {
    const uid = localStorage.getItem(localStorageKeys.UID);
    const ordersQuery = query(collection(db, tables.projects), where("uid", '==', uid));
    const serverQuery = query(collection(db, tables.server), where("uid", '==', uid));
    const modelsQuery = query(collection(db, tables.models), where("uid", '==', uid));
    const [ordersSnapshot, serverSnapshot, modelsSnapshot] = await Promise.all([
        getDocs(ordersQuery),
        getDocs(serverQuery),
        getDocs(modelsQuery),
    ]);

    const uniqueYearsSet = new Set();
    function processSnapshot(snapshot) {
        snapshot.forEach((doc) => {
            const status = doc.data().status;
            if (status && status.year) {
                uniqueYearsSet.add(status.year);
            }
        });
    }
    processSnapshot(ordersSnapshot);
    processSnapshot(serverSnapshot);
    processSnapshot(modelsSnapshot);
    return Array.from(uniqueYearsSet);
}