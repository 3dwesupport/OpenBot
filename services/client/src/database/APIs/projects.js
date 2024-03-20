import {and, collection, getCountFromServer, getDocs, query, where} from "@firebase/firestore";
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
        getDocDetails(year, month).then((res) => {
            resolve(res);
        })
            .catch((e) => {
                reject(e);
            })
    })
}

/**
 * function to get all document details
 * @returns {Promise<number>}
 */
export async function getDocDetails(year, month) {
    let monthIndex = Month.indexOf(month);
    try {
        const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0); // Set the day to 1
        const endDate = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0); // Set the day to 1 of the next month
        const ordersQuery = query(collection(db, tables.projects), and(where("created_at", '>=', startDate), where("created_at", '<', endDate), where("uid", '==', localStorage.getItem(localStorageKeys.UID))));
        const snapshot = await getCountFromServer(ordersQuery);
        return snapshot.data().count;
    } catch (error) {
        console.log("error :", error);
    }
}

/**
 * function to get compile code number on yearly basis
 * @param year
 * @returns {Promise<unknown>}
 */
export async function getBlocklyCompilingCount(year) {
    return new Promise(async (resolve, reject) => {
        try {
            const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
            const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);
            const ordersQuery = query(collection(db, tables.projectsActivity), and(where("updated_at", '>=', startDate), where("updated_at", '<', endDate), where("uid", '==', localStorage.getItem(localStorageKeys.UID))));
            const querySnapshot = await getDocs(ordersQuery);
            let updates = Array(12).fill(0);
            querySnapshot.forEach((doc) => {
                const dateObject = new Date(doc.data().updated_at.seconds * 1000 + doc.data().updated_at.nanoseconds / 1e6);
                let monthIndex = dateObject.getMonth();
                if (monthIndex !== -1) {
                    updates[monthIndex] += 1;
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
            const dateObject = new Date(doc.data()?.created_at?.seconds * 1000 + doc.data()?.created_at?.nanoseconds / 1e6);
            const startTime = new Date(doc.data()?.startTime?.seconds * 1000 + doc.data()?.startTime?.nanoseconds / 1e6);
            if (!isNaN(dateObject.getTime())) {
                uniqueYearsSet.add(dateObject?.getFullYear());
            }
            if (!isNaN(startTime.getTime())) {
                uniqueYearsSet.add(startTime?.getFullYear());
            }
        });
    }

    processSnapshot(ordersSnapshot);
    processSnapshot(serverSnapshot);
    processSnapshot(modelsSnapshot);
    return Array.from(uniqueYearsSet);
}
