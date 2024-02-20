import {nanoid} from "nanoid";
import {addDoc, collection, doc, getDocs, query, updateDoc, where} from "@firebase/firestore";
import {db} from "../authentication";
import {Constants, tables} from "../../utils/constants";

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
        if (planType === Constants.free) {
            if (docDetails === null) {
                return await addDoc(collection(db, tables.subscription),
                    subscriptionDetails
                ).then(() => {
                    return {planType: planType, planEndDate: endDate}
                });
            } else {
                const dateObject = new Date(docDetails?.data.planEndDate.seconds * 1000 + docDetails?.data.planEndDate.nanoseconds / 1e6);
                return {planType: docDetails?.data.planType, planEndDate: dateObject.toISOString()}
            }
        } else {
            if (docDetails === null) {
                return await addDoc(collection(db, tables.subscription),
                    subscriptionDetails
                ).then(() => {
                    return {planType: planType, planEndDate: endDate}
                });
            } else {
                let updatedData = docDetails?.data;
                updatedData.planType = Constants.premium;
                updatedData.planStartDate = startDate;
                updatedData.planEndDate = endDate;
                const subscriptionRef = doc(db, tables.subscription, docDetails?.id);
                return await updateDoc(subscriptionRef,
                    updatedData
                ).then(() => {
                    return {planType: planType, planEndDate: endDate}
                });
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