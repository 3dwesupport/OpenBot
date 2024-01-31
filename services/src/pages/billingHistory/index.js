import React from "react";
import {TableComponent} from "../../components/common/table/tableComponent";

/**
 * function to render billing history
 * @returns {Element}
 * @constructor
 */
export function BillingHistory() {

    const BillingHistoryParams = [
        {
            field: 'id',
            headerName: 'ID',
            headerAlign: 'center',
            align: 'center',
            width: 150
        },
        {
            field: 'DATE',
            headerName: 'DATE',
            headerAlign: 'center',
            align: 'center',
            width: 170
        },
        {
            field: 'AMOUNT',
            headerName: 'AMOUNT',
            headerAlign: 'center',
            align: 'center',
            width: 150
        },
        {
            field: 'STATUS',
            headerName: 'STATUS',
            type: 'number',
            headerAlign: 'center',
            align: 'center',
            width: 130
        },
        {
            field: 'INVOICE',
            headerName: 'INVOICE',
            headerAlign: 'center',
            align: 'center',
            width: 170
        },
    ];

    const rows = [{id: 1, DATE: new Date().getDate(), AMOUNT: 100, STATUS: 'Jon', INVOICE: "link"}];
    return (
        <div style={{height: "100vh"}}>
            <TableComponent tableAttributes={BillingHistoryParams} rowsData={rows}/>
        </div>
    );
}