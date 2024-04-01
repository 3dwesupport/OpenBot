import {collection, getDocs, query, where} from "@firebase/firestore";
import {db} from "../authentication";
import {tables} from "../../utils/constants";
import {getCustomerId} from "./subscription";

export const getTransactionByCustomerId = async (cid) => {
    try {
        const transactionQuery = query(collection(db, tables.transaction), where("customer_id", '==', cid));
        const transactionSnapshot = await getDocs(transactionQuery);
        const transactions = [];
        transactionSnapshot.forEach((doc) => {
            transactions.push({id: doc.id, ...doc.data()});
        });
        console.log("transactions::", transactions);
        return transactions;
    } catch (e) {
        console.log(e);
        return [];
    }
}

export async function allTransaction() {
    try{
        const CID=await getCustomerId();
        console.log("CustomerID::::",CID);
        if (CID) {
            const transactions = await getTransactionByCustomerId(CID);
            console.log("TransactionFinal ::::",transactions);
            return transactions;
        }
        return [];
    }
    catch (e){
        console.error(e);
    }
}