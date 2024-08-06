import * as React from 'react';
import {DataGrid} from '@mui/x-data-grid';
import {Themes} from "../../../utils/constants";
import {useState} from "react";
import './table.css'
import {useTheme} from "@mui/system/useTheme";
import {downloadInvoice} from "../../../stripeAPI";

/**
 * function to get Transaction Data and displayed yet and focus on Invoice cell
 * @param props
 * @returns {Element}
 * @constructor
 */
export function TableComponent(props) {
    const {tableAttributes, rowsData, theme} = props;
    const [selectedCell, setSelectedCell] = useState(null);

    // After Cell clicked color is Changed and also download Invoice file
    const handleCellClick = (params, event, details) => {
        if (params.field === 'INVOICE') {
            setSelectedCell(params.hasFocus);
            setTimeout(() => {
                setSelectedCell(null);
            }, 150);
        }

        if (params.field === 'INVOICE') {
            downloadInvoice(params.value).then((res) => {
                let link = document.createElement('a');
                link.href = res;
                link.click();
            }).catch((error) => {
                console.error("Error during Downloading ...");
            })
        }
    };


    return (
        <div style={{
            display: "flex",
            justifyContent: "center",
            // alignItems: "center",
            marginTop: "15px",
            height: "80%"
        }}>

            <div style={{width: "90%",maxWidth:"100%"}}>
                <DataGrid
                    rowHeight={80}
                    disableColumnFilter
                    disableColumnSelector
                    disableDensitySelector
                    disableColumnMenu
                    disableExportSelector
                    rows={rowsData}
                    columns={tableAttributes}
                    onCellClick={handleCellClick}

                    getCellClassName={(params) => {
                        return selectedCell === params.hasFocus ? 'selected-cell' : '';
                    }}

                    initialState={{
                        pagination: {
                            paginationModel: {
                                pageSize: 8,
                            },
                        },
                    }}

                    sx={{
                        borderColor: theme === Themes.dark ? '#323232' : '#F1F1F1',
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: theme === Themes.dark ? '#323232' : "#F1F1F1",
                            borderColor: theme === Themes.dark ? '#323232' : '#F1F1F1',
                            color: theme === Themes.dark ? '#F1F1F1' : "inherit",
                            fontWeight: 'bold',
                        },

                        '& .MuiDataGrid-cell': {
                            color: theme === Themes.dark ? '#FFFFFF' : '#303030',
                            borderColor: theme === Themes.dark ? '#323232' : ''
                        },
                        "& .MuiDataGrid-row:hover": {
                            backgroundColor: theme === Themes.dark ? '#303030' : '#EEF8FF'
                        },
                        '& .MuiDataGrid-footerContainer': {
                            borderColor: theme === Themes.dark ? '#323232' : '#F1F1F1',
                        },
                        '& .MuiTablePagination-displayedRows': {
                            color: theme === Themes.dark ? '#F1F1F1' : 'inherit',
                        },
                        '& .MuiTablePagination-actions': {
                            color: theme === Themes.dark ? '#F1F1F1' : 'inherit',
                        }
                    }}
                    pageSizeOptions={[8]}
                    disableRowSelectionOnClick
                />
            </div>
        </div>
    );
}