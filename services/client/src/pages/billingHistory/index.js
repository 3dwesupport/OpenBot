import React, {useContext, useEffect, useState} from "react";
import {TableComponent} from "../../components/common/table/tableComponent";
import {BillingHeaderComponent} from "../../components/common/billingHeader/billingHeader";
import {Constants, localStorageKeys, Themes} from "../../utils/constants";
import {ThemeContext} from "../../App";
import {SubscriptionCookie} from "../../components/common/cookie/subscriptionCookie";
import Cookies from "js-cookie";
import {allTransaction} from "../../database/APIs/transaction";
import {downloadInvoice} from "../../stripeAPI";

import './bilingHistory.css';
import Box from "@mui/material/Box";

/**
 * function to render billing history
 * @returns {Element}
 * @constructor
 */
export function BillingHistory() {
    const [transaction, setTransaction] = useState([]);
    const [downloadStatus, setDownloadStatus] = useState({});
    const {theme} = useContext(ThemeContext);

    const BillingHistoryParams = [
        {
            field: 'id',
            headerName: 'ID',
            headerAlign: 'center',
            align: 'center',
            flex: 1,
            minWidth: 100
        },
        {
            field: 'DATE',
            headerName: 'DATE',
            headerAlign: 'center',
            align: 'center',
            flex: 1,
            minWidth: 100
        },
        {
            field: 'AMOUNT',
            headerName: 'AMOUNT',
            headerAlign: 'center',
            align: 'center',
            flex: 1,
            minWidth: 100
        },
        {
            field: 'STATUS',
            headerName: 'STATUS',
            type: 'number',
            headerAlign: 'center',
            align: 'center',
            flex: 1,
            minWidth: 100,

            cellClassName: (params) => {
                if (params.value === 'succeeded') return 'success-cell';
                else if (params.value === 'failure') return 'failure-cell';
                else return 'onHold-cell';
            },
            renderCell: (params) => {
                return (
                    <Box
                        sx={{
                            width: "100%",
                            height: "100%",
                            justifyContent: 'center',
                            textAlign: 'center',
                            marginTop: '50px'
                        }}
                    >
                        {params.value}
                    </Box>
                );
            }
        },
        {
            field: 'INVOICE',
            headerName: 'INVOICE',
            headerAlign: 'center',
            align: 'center',
            flex: 1,
            minWidth: 100,
            renderCell: (params) => {
                return (<DownloadInvoice params={params} downloadStatus={downloadStatus}
                                         setDownloadStatus={setDownloadStatus}/>);
            },
        },
    ];
    const plan = Cookies.get(localStorageKeys.planDetails);
    const type = plan ? JSON.parse(plan) : ""

    function getCurrentDateOfBirth(timestamp) {
        const date = timestamp;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
    }

    const rowData = [
        {id: 1, DATE: '10-01-2023', AMOUNT: '$10', STATUS: 'succeeded', INVOICE: 'abc'},
        {id: 2, DATE: '11-01-2023', AMOUNT: '$50', STATUS: 'succeeded', INVOICE: 'abc'},
        {id: 3, DATE: '12-01-2023', AMOUNT: '$10', STATUS: 'succeeded', INVOICE: 'abc'},
        {id: 4, DATE: '13-01-2023', AMOUNT: '$50', STATUS: 'succeeded', INVOICE: 'abc'},
        {id: 5, DATE: '10-01-2023', AMOUNT: '$10', STATUS: 'succeeded', INVOICE: 'abc'},
        {id: 6, DATE: '13-01-2023', AMOUNT: '$50', STATUS: 'succeeded', INVOICE: 'abc'},
        {id: 7, DATE: '13-01-2023', AMOUNT: '$50', STATUS: 'succeeded', INVOICE: 'abc'},
        {id: 8, DATE: '13-01-2023', AMOUNT: '$50', STATUS: 'succeeded', INVOICE: 'abc'},
        {id: 9, DATE: '13-01-2023', AMOUNT: '$50', STATUS: 'succeeded', INVOICE: 'abc'},
        {id: 10, DATE: '13-01-2023',AMOUNT: '$50', STATUS: 'failure', INVOICE: 'abc'},
        {id: 11, DATE: '13-01-2023',AMOUNT: '$50', STATUS: 'succeeded', INVOICE: 'abc'},
    ];
    useEffect(() => {
        allTransaction().then((r) => {
            const newTransaction = r.map((tr, index) => ({
                id: index+1,
                DATE: getCurrentDateOfBirth(new Date(tr.transaction_time.seconds * 1000 + tr.transaction_time.nanoseconds / 1e6)),
                AMOUNT: `$${tr.transaction_amount}`,
                STATUS: tr.transaction_status,
                INVOICE: tr.invoice_id
            }))
            setTransaction(newTransaction);
        })
    }, []);

    return (
        <div style={{
            backgroundColor: theme === Themes.dark ? '#202020' : '#FFFFFF',
            color: theme === Themes.dark ? '#FFFFFF' : '#303030', height: "100vh",

        }}>
            {type?.sub_type === Constants.free && <SubscriptionCookie/>}
            <BillingHeaderComponent title={Constants.billingHistory} theme={theme}/>
            <TableComponent theme={theme} tableAttributes={BillingHistoryParams} rowsData={transaction}/>
        </div>
    );
}
/**
 * function to Download Invoice
 * @param props
 * @returns {Element}
 * @constructor
 */
function DownloadInvoice(props) {
    const {params, downloadStatus, setDownloadStatus} = props;
    const invoiceId = params.value;
    const invoiceDownloadStatus = downloadStatus[invoiceId] || "Download Invoice";


    return <div>
        <a className={'anchor'} href="#" style={{
            textDecoration: "none",
            color: invoiceDownloadStatus === "Downloaded" ? "grey" : "#0071C5"
        }} onClick={(e) => {
            e.preventDefault();
            console.log("cell clicked::", params.value);

            downloadInvoice(params.value).then((res) => {
                let link = document.createElement('a');
                link.href = res;
                link.click();
                setDownloadStatus(prevStatus => ({
                    ...prevStatus,
                    [invoiceId]: "Downloaded"
                }));
            }).catch((error) => {
                console.error("Error downloading invoice:", error);
                // Handle error if necessary
            });
        }}>Download Invoice</a>

    </div>
}

