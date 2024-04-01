import * as React from 'react';
import {DataGrid} from '@mui/x-data-grid';
import {Themes} from "../../../utils/constants";
import {useState} from "react";
import './table.css'
export function TableComponent(props) {
    const {tableAttributes, rowsData, theme} = props;
    const [selectedCell, setSelectedCell] = useState(null);

    const handleCellClick = (params, event, details) => {
        if(params.field === 'INVOICE'){
        setSelectedCell(params.hasFocus);
        setTimeout(() => {
            setSelectedCell(null);
        }, 150);}
    };
    return (
        <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginTop: "15px",
        }}>

            <div style={{width: "90%"}}>
                <DataGrid
                    rowHeight={75}
                    disableColumnFilter
                    disableColumnSelector
                    disableDensitySelector
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
                                pageSize: 6,
                            },
                        },
                    }}

                    sx={{
                        borderColor: theme === Themes.dark ? '#323232' : '#F1F1F1',
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: theme === Themes.dark ? '#323232' : "#F1F1F1",
                            borderColor:theme === Themes.dark ? '#323232' : '#F1F1F1',
                            color:theme === Themes.dark ? '#F1F1F1' : "inherit",
                            fontSize: '14px',
                            fontWeight: 'bold',
                        },

                        '& .MuiDataGrid-cell': {
                            color: theme === Themes.dark ? '#FFFFFF' : '#303030',
                            borderColor:theme === Themes.dark ? '#323232' : '#F1F1F1'
                        },
                        "& .MuiDataGrid-row:hover": {
                            backgroundColor: theme === Themes.dark ? '#303030' : '#EEF8FF'
                        },
                        '& .MuiDataGrid-footerContainer':{
                            borderColor:theme === Themes.dark ? '#323232' : '#F1F1F1',
                        },
                        '& .MuiTablePagination-displayedRows':{
                            color:theme === Themes.dark ? '#F1F1F1' : 'inherit',
                        },
                        '& .MuiTablePagination-actions':{
                            color:theme === Themes.dark ? '#F1F1F1' : 'inherit',
                        }
                    }}

                    pageSizeOptions={[6]}
                    disableRowSelectionOnClick
                />
            </div>
        </div>
    );
}