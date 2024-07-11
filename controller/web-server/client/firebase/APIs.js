import {addDoc, and, collection, getDocs, query, where} from '@firebase/firestore'
import {auth, db} from './authentication'
import {Constants, localStorageKeys, tables} from '../utils/constants'
import {nanoid} from 'nanoid'
import {getCookie} from '../index'

/**
 * function to upload user usage on monthly basis on firebase firestore
 * @returns {Promise<void>}
 * @param serverStartTime
 * @param serverEndTime
 */
export async function uploadServerUsage (serverStartTime, serverEndTime) {
 const user = JSON.parse(localStorage.getItem(localStorageKeys.user))
 const details = {
  startTime: serverStartTime,
  uid: user?.uid,
  endTime: serverEndTime
 }
 try {
  await addDoc(collection(db, tables.server),
      details
  ).then(() => {
   console.log('server details successfully added')
  })
 } catch (e) {
  console.log('error::', e)
 }
}

/**
 * function to get user current plan
 * @returns {Promise<undefined|*>}
 */
export async function getUserPlan () {
 const startDate = new Date()
 const endDate = new Date(startDate)
 endDate.setDate(startDate.getDate() + 30)
 const subscriptionDetails = {
  uid: auth.currentUser?.uid,
  sub_type: Constants.free,
  sub_start_date: startDate,
  sub_end_date: endDate,
  sub_plan_id: nanoid(),
  customer_id: null
 }
 try {
  const docDetails = await getDocDetails(subscriptionDetails?.uid)
  if (docDetails === null) {
   return await addDoc(collection(db, tables.subscription),
       subscriptionDetails
   ).then(() => {
    return {planType: subscriptionDetails.planType, planEndDate: endDate, planStartDate: startDate}
   })
  } else {
   const dateObject = new Date(docDetails?.data.planEndDate.seconds * 1000 + docDetails?.data.planEndDate.nanoseconds / 1e6)
   const startDateObject = new Date(docDetails?.data.planStartDate.seconds * 1000 + docDetails?.data.planStartDate.nanoseconds / 1e6)
   return {
    planType: docDetails?.data.sub_type,
    planEndDate: dateObject.toISOString(),
    planStartDate: startDateObject.toISOString()
   }
  }
 } catch (e) {
  console.log(e)
 }
}

/**
 * function to get user plan subscription details
 * @param uid
 * @returns {Promise<null>}
 */
export const getDocDetails = async (uid) => {
 try {
  const ordersQuery = query(collection(db, tables.subscription), where('uid', '==', uid))
  const querySnapshot = await getDocs(ordersQuery)
  let response = null
  querySnapshot.forEach((doc) => {
   return response = {
    data: doc.data(),
    id: doc.id
   }
  })
  return response
 } catch (error) {
  // console.log("error:", error)
  console.log('error:', error)
 }
}

export async function getServerDetails () {
 const details = getCookie(localStorageKeys.planDetails)
 if (details) {
  const items = JSON.parse(details)
  const startDate = new Date(items?.planStartDate)
  const endDate = new Date(items.planEndDate)
  try {
   const ordersQuery = query(collection(db, tables.server), and(where("startTime", '>=', startDate), where("startTime", '<', endDate), where("uid", '==', auth?.currentUser.uid)));
   const querySnapshot = await getDocs(ordersQuery)
   let duration = 0
   querySnapshot.forEach((doc) => {
    const startTime = new Date(doc.data()?.startTime.seconds * 1000 + doc.data()?.startTime.nanoseconds / 1e6)
    const endTime = new Date(doc.data()?.endTime.seconds * 1000 + doc.data()?.endTime.nanoseconds / 1e6)
    duration += (new Date(endTime) - new Date(startTime)) / (1000 * 60) // in minutes
   })
   return duration
  } catch (error) {
   console.log('error :', error)
  }
 }
}