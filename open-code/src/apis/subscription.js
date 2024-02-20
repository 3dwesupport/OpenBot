import {nanoid} from "nanoid";
import {addDoc, collection, getDocs, query, where} from "firebase/firestore";
import {Constants, tables} from "../utils/constants";
import {db} from "../services/firebase";

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
        planType: planType,
        planStartDate: startDate,
        planEndDate: endDate,
        planId: nanoid(),
    }
    try {
        let docDetails = await getDocDetails(uid);
        if (docDetails === null) {
            return await addDoc(collection(db, tables.subscription),
                subscriptionDetails
            ).then(() => {
                return {planType: planType, planEndDate: endDate, planStartDate: startDate}
            });
        } else {
            const dateObject = new Date(docDetails?.data.planEndDate.seconds * 1000 + docDetails?.data.planEndDate.nanoseconds / 1e6);
            const startDateObject = new Date(docDetails?.data.planStartDate.seconds * 1000 + docDetails?.data.planStartDate.nanoseconds / 1e6);
            return {
                planType: docDetails?.data.planType,
                planEndDate: dateObject.toISOString(),
                planStartDate: startDateObject.toISOString()
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