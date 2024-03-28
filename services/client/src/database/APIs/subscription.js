import {addDoc, collection, getDocs, query, where} from "@firebase/firestore";
import {db} from "../authentication";
import {Constants, localStorageKeys, tables} from "../../utils/constants";

/**
 * function to add user subscription in firebase firestore
 * @param uid
 * @param planType
 * @returns {Promise<{type: (string|*), planEndDate: *}>}
 */
export async function addSubscription(uid, planType) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 30);
    const subscriptionDetails = {
        uid: uid,
        sub_plan_id: null,
        customer_id: null,
        sub_start_date: startDate,
        sub_end_date: endDate,
        sub_type: planType,
    }

    try {
        let docDetails = await getDocDetails(uid);

        console.log("docDetails::", docDetails);
        if (planType === Constants.free) {
            if (docDetails === null) {
                return await addDoc(collection(db, tables.subscription),
                    subscriptionDetails
                ).then(() => {
                    return {sub_type: planType, sub_end_date: endDate, sub_start_date: startDate}
                });
            } else {
                const dateObject = new Date(docDetails?.data.sub_end_date.seconds * 1000 + docDetails?.data.sub_end_date.nanoseconds / 1e6);
                const startDateObject = new Date(docDetails?.data.sub_start_date.seconds * 1000 + docDetails?.data.sub_start_date.nanoseconds / 1e6);
                return {
                    sub_type: docDetails?.data.sub_type,
                    sub_end_date: dateObject.toISOString(),
                    sub_start_date: startDateObject.toISOString()
                }
            }
        }
    } catch (e) {
        console.log(e);
    }
}

/**
 * function to get user plan subscription details
 * @param uid
 * @returns {Promise<null>}
 */
export const getDocDetails = async (uid) => {
    try {
        const ordersQuery = query(collection(db, tables.subscription), where("uid", '==', uid));
        const querySnapshot = await getDocs(ordersQuery);
        let response = null;
        querySnapshot.forEach((doc) => {
            return response = {
                data: doc.data(),
                id: doc.id,
            }
        });
        return response
    } catch (error) {
        console.log("error :", error);
    }
}

export async function getCustomerId() {
    try {
        let docDetails = await getDocDetails(localStorage.getItem(localStorageKeys.UID));
        return docDetails?.data.customer_id
    } catch (e) {
        console.log(e);
    }
}