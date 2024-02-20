import {
    addDoc,
    collection,
    where,
    query,
    getDocs, and, writeBatch, getCountFromServer
} from "firebase/firestore";
import {auth, db} from "../services/firebase";
import {localStorageKeys, tables} from "../utils/constants";
import {nanoid} from "nanoid";
import {getCookie} from "../services/workspace";

/**
 * function to set user usage for projects in firebase firestore
 * @param projectName
 * @returns {Promise<void>}
 */
export async function setProjectDetails(projectName) {
    const date = new Date();
    const details = {
        projectName: projectName,
        uid: auth?.currentUser.uid,
        projectId: nanoid(),
        created_at: date
    };

    const projectActivity = {
        updated_at: date,
        projectId: "",
        uid: auth?.currentUser.uid
    }
    try {
        let docDetails = await getDocDetails(projectName, tables.projects, "projectName");
        if (docDetails === null) {
            await addDoc(collection(db, tables.projects),
                details
            ).then(async () => {
                projectActivity.projectId = details.projectId
                await addDoc(collection(db, tables.projectsActivity),
                    projectActivity
                ).then();
            });
        } else {
            projectActivity.projectId = docDetails?.data.projectId;
            await addDoc(collection(db, tables.projectsActivity),
                projectActivity
            ).then();
        }
    } catch (e) {
        console.log("error in uploading projects::", e);
    }
}

/**
 * function to rename projects in firebase firestore
 * @param oldProjectName
 * @param newProjectName
 * @returns {Promise<void>}
 */
export async function renameAllProjects(oldProjectName, newProjectName) {
    try {
        const ordersQuery = query(collection(db, tables.projects), and(where("projectName", '==', oldProjectName), where("uid", '==', auth?.currentUser.uid)));
        const querySnapshot = await getDocs(ordersQuery);
        const batch = writeBatch(db);
        querySnapshot.forEach((document) => {
            batch.update(document.ref, {projectName: newProjectName});
        });
        await batch.commit();
    } catch (e) {
        console.log("error in uploading projects::", e);
    }
}

/**
 * function to get document details from the firebase firestore
 * @param value
 * @param table
 * @param fieldName
 * @returns {Promise<null>}
 */
export const getDocDetails = async (value, table, fieldName) => {
    try {
        const ordersQuery = query(collection(db, table), and(where(fieldName, '==', value), where("uid", '==', auth?.currentUser.uid)));
        const querySnapshot = await getDocs(ordersQuery);
        let response = null;
        querySnapshot.forEach((doc) => {
            return response = {
                data: doc.data(),
                id: doc.id
            }
        });
        return response
    } catch (error) {
        console.log("error :", error);
    }
}

/**
 * function to get projects compile time
 * @returns {Promise<number>}
 */
export const sumUploadCode = async () => {
    const details = getCookie(localStorageKeys.planDetails)
    if (details) {
        const items = JSON.parse(details);
        const startDate = new Date(items?.planStartDate);
        const endDate = new Date(items.planEndDate);
        try {
            const ordersQuery = query(collection(db, tables.projectsActivity), and(where("uid", '==', auth?.currentUser.uid), where("updated_at", '>=', startDate), where("updated_at", '<=', endDate)));
            const snapshot = await getCountFromServer(ordersQuery);
            return snapshot.data().count;
        } catch (e) {
            console.log(e);
        }
    }
}