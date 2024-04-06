import React, {useContext, useEffect, useState} from "react";
import {TableComponent} from "../../components/common/table/tableComponent";
import {BillingHeaderComponent} from "../../components/common/billingHeader/billingHeader";
import {Constants, localStorageKeys, Themes} from "../../utils/constants";
import {ThemeContext} from "../../App";
import {SubscriptionCookie} from "../../components/common/cookie/subscriptionCookie";
import Cookies from "js-cookie";
import {allTransaction} from "../../database/APIs/transaction";
import {downloadInvoice} from "../../stripeAPI";
import {AnalyticsLoader} from "../../components/common/loader/loader";

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
    const [isAnalysisLoader, setIsAnalysisLoader] = useState(true);
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
                if (params.value === 'paid') return 'success-cell';
                else if (params.value === 'payment_failed' || 'payment_action_required') return 'failure-cell';
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

    useEffect(() => {
        setIsAnalysisLoader(true);
        allTransaction().then((r) => {
            const newTransaction = r.map((tr, index) => ({
                id: index + 1,
                DATE: getCurrentDateOfBirth(new Date(tr.transaction_time.seconds * 1000 + tr.transaction_time.nanoseconds / 1e6)),
                AMOUNT: `$${tr.transaction_amount}`,
                STATUS: tr.transaction_status,
                INVOICE: tr.invoice_id
            }))
            setTransaction(newTransaction);
            setIsAnalysisLoader(false);
        }).catch((error) => {
            console.error("Error fetching transaction data:::");
            setIsAnalysisLoader(false);
        })
    }, []);

    return (
        <div style={{
            backgroundColor: theme === Themes.dark ? '#202020' : '#FFFFFF',
            color: theme === Themes.dark ? '#FFFFFF' : '#303030', height: "100vh",

        }}>
            {type?.sub_type === Constants.free && <SubscriptionCookie/>}
            <BillingHeaderComponent title={Constants.billingHistory} theme={theme}/>
            {isAnalysisLoader ? (
                <React.Fragment>
                    <p className={"dataLoading"}>Loading data...</p>
                    <AnalyticsLoader/>
                </React.Fragment>
            ) : (
                transaction.length > 0 ? (
                    <TableComponent theme={theme} tableAttributes={BillingHistoryParams} rowsData={transaction}/>
                ) : (
                    <p className={"dataLoading"}>No more transaction records found</p>
                )
            )}
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
        <a className={"anchor"} href="#" style={{
            textDecoration: "none",
            color: "#0071C5"
        }} onClick={(e) => {
            e.preventDefault();

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

