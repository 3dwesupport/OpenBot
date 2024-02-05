import {Modal} from "@mui/material";
import {Images} from "../../../utils/images";
import React, {useEffect, useReducer} from "react";
import './billingHeaderModule.css'
import {Month} from "../../../utils/constants";
import {getYears} from "../../../database/APIs/projects";


let initialState = {
    selectedModal: null,
    selectedMonth: '',
    selectedYear: '',
    years: [new Date().getFullYear()],
};
const actionTypes = {
    OPEN_MODAL: 'OPEN_MODAL',
    CLOSE_MODAL: 'CLOSE_MODAL',
    SELECT_MONTH: 'SELECT_MONTH',
    SELECT_YEAR: 'SELECT_YEAR',
    SET_YEARS: 'SET_YEARS',
};


const reducer = (state, action) => {
    switch (action.type) {
        case actionTypes.OPEN_MODAL:
            return {...state, selectedModal: action.payload};
        case actionTypes.CLOSE_MODAL:
            return {...state, selectedModal: null};
        case actionTypes.SELECT_MONTH:
            return {...state, selectedMonth: action.payload};
        case actionTypes.SELECT_YEAR:
            return {...state, selectedYear: action.payload};
        case actionTypes.SET_YEARS:
            return {...state, years: action.payload};
        default:
            throw new Error('Unknown action type: ' + action.type);
    }
};


export function BillingHeaderComponent(props) {
    const {
        title,
        onDataChange
    } = props
    const [state, dispatch] = useReducer(reducer, initialState);
    const {selectedModal, selectedMonth, selectedYear, years} = state;

    const handleModalAction = (actionType, payload) => {
        console.log('Action Type:::::::', actionType);
        console.log('Payload::::::', payload);
        console.log('Before dispatch - Selected Modal:', state.selectedModal);
        switch (actionType) {
            case actionTypes.OPEN_MODAL:
                dispatch({type: actionTypes.OPEN_MODAL, payload});
                break;
            case actionTypes.CLOSE_MODAL:
                dispatch({type: actionTypes.CLOSE_MODAL});
                break;
            case actionTypes.SELECT_MONTH:
                dispatch({type: actionTypes.SELECT_MONTH, payload});
                onDataChange(payload);
                dispatch({type:actionTypes.CLOSE_MODAL})
                break;
            case actionTypes.SELECT_YEAR:
                dispatch({type: actionTypes.SELECT_YEAR, payload});
                onDataChange(payload);
                dispatch({type:actionTypes.CLOSE_MODAL})
                break;
            default:
                throw new Error('Unknown action type: ' + actionType);
        }
        console.log('After dispatch - Selected Modal:', state.selectedModal);
    };

    useEffect(() => {
        getYears().then((res) => {
            if (res?.length === 0) return;
            dispatch({type: actionTypes.SET_YEARS, payload: res});
        });
    }, []);


    return (
        <>
            {selectedModal === 'year' && (
                <Modal open={true} onClose={() => handleModalAction(actionTypes.CLOSE_MODAL)}>
                    <div className={"modalYear"}>
                        {years.map((year, index) => (
                            <div className={"items"} key={index}
                                 onClick={() => handleModalAction(actionTypes.SELECT_YEAR, year)}>
                                {year}
                            </div>
                        ))}
                    </div>
                </Modal>)}
            {selectedModal === 'month' && (
                <Modal open={true} onClose={() => handleModalAction(actionTypes.CLOSE_MODAL)}>
                    <div className={"modalMonth"}>
                        {Month.map((month, index) => (
                            <div className={"items"} key={index}
                                 onClick={() => handleModalAction(actionTypes.SELECT_MONTH, month)}>
                                {month}
                            </div>
                        ))}
                    </div>
                </Modal>
            )
            }
            <div className={"billingHeaderDiv"}>
                <div className={"billingHeaderTextDiv"}>
                    <span className={"billingHeaderText"}>{title}</span>
                    <div className={"calenderDiv"}>
                        <div className={"yearDiv"} onClick={() => handleModalAction(actionTypes.OPEN_MODAL, 'year')}>
                            {selectedYear ? selectedYear : (
                                <span className={"yearText"}>{new Date().getFullYear()}</span>)}
                            <img className={"billingHeaderImage"} src={Images.billingHeader_icon} alt={"icon"}/>
                        </div>
                        <div className={"modalDiv"} onClick={() => handleModalAction(actionTypes.OPEN_MODAL, 'month')}>
                            {selectedMonth ? (<span>{selectedMonth}</span>) : (
                                <span className={"monthText"}>{Month[new Date().getMonth()]}</span>)}
                            <img className={"billingHeaderImage"} src={Images.billingHeader_icon} alt={"icon"}/>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}