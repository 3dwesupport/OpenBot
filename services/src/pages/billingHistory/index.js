import React, {useContext} from "react";
import {TableComponent} from "../../components/common/table/tableComponent";
import {BillingHeaderComponent} from "../../components/common/billingHeader/billingHeader";
import {Constants, localStorageKeys} from "../../utils/constants";
import {ThemeContext} from "../../App";
import {SubscriptionCookie} from "../../components/common/cookie/subscriptionCookie";

/**
 * function to render billing history
 * @returns {Element}
 * @constructor
 */
export function BillingHistory() {
    const {theme} = useContext(ThemeContext);
    const BillingHistoryParams = [
        {
            field: 'id',
            headerName: 'ID',
            headerAlign: 'center',
            align: 'center',
            flex: 1
        },
        {
            field: 'DATE',
            headerName: 'DATE',
            headerAlign: 'center',
            align: 'center',
            flex: 1
        },
        {
            field: 'AMOUNT',
            headerName: 'AMOUNT',
            headerAlign: 'center',
            align: 'center',
            flex: 1
        },
        {
            field: 'STATUS',
            headerName: 'STATUS',
            type: 'number',
            headerAlign: 'center',
            align: 'center',
            flex: 1
        },
        {
            field: 'INVOICE',
            headerName: 'INVOICE',
            headerAlign: 'center',
            align: 'center',
            flex: 1
        },
    ];
    const plan = localStorage.getItem(localStorageKeys.planDetails);
    const type = plan ? JSON.parse(plan) : ""


    const rows = [{id: 1, DATE: new Date().getDate(), AMOUNT: 100, STATUS: 'Jon', INVOICE: "link"}];
    return (
        <div style={{height: "100vh"}}>
            {type?.planType === Constants.free && <SubscriptionCookie/>}
            <BillingHeaderComponent title={Constants.billingHistory} theme={theme}/>
            <TableComponent theme={theme} tableAttributes={BillingHistoryParams} rowsData={rows}/>
        </div>
    );
}