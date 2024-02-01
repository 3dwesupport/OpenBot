import * as React from 'react';
import {DataGrid} from '@mui/x-data-grid';

export function TableComponent(props) {
    const {tableAttributes, rowsData} = props;

    return (
        <div style={{display: "flex", justifyContent: "center", alignItems: "center", marginTop: "15px"}}>
            <div style={{width: "90%"}}>
                <DataGrid
                    disableColumnFilter
                    disableColumnSelector
                    disableDensitySelector
                    disableExportSelector
                    rows={rowsData}
                    columns={tableAttributes}
                    initialState={{
                        pagination: {
                            paginationModel: {
                                pageSize: 5,
                            },
                        },
                    }}
                    sx={{
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: "#F1F1F1",
                            fontSize: '14px',
                            fontWeight: 'bold',
                        },
                    }}
                    pageSizeOptions={[5]}
                    disableRowSelectionOnClick
                />
            </div>
        </div>
    );
}