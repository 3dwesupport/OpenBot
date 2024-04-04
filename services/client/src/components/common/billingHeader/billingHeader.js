import {Modal} from "@mui/material";
import {Images} from "../../../utils/images";
import React, {useEffect, useReducer} from "react";
import './billingHeaderModule.css'
import {Constants, Month, Themes} from "../../../utils/constants";
import {getYears} from "../../../database/APIs/projects";

export function BillingHeaderComponent(props) {
    const {title, onDataChange, theme} = props
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
                return;
        }
    };
    const [state, dispatch] = useReducer(reducer, initialState);
    const {selectedModal, selectedMonth, selectedYear, years} = state;
    const handleModalAction = (actionType, payload) => {
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
                dispatch({type: actionTypes.CLOSE_MODAL})
                break;
            case actionTypes.SELECT_YEAR:
                dispatch({type: actionTypes.SELECT_YEAR, payload});
                onDataChange(payload);
                dispatch({type: actionTypes.CLOSE_MODAL})
                break;
            default:
                throw new Error('Unknown action type: ' + actionType);
        }
    };

    const commonDivStyle = {
        backgroundColor: theme === Themes.dark ? 'rgb(65, 65, 65)' : 'white',
        border: theme === Themes.dark ? '1px solid #555555' : '1px solid #F1F1F1',
    };

    useEffect(() => {
        // getYears().then((res) => {
        //     if (res?.length === 0) return;
        //     dispatch({type: actionTypes.SET_YEARS, payload: res});
        // });
    },);


    return (
        <>
            {selectedModal === 'year' && (
                <Modal open={true} onClose={() => handleModalAction(actionTypes.CLOSE_MODAL)}>
                    <div className={"modelYear"} style={{backgroundColor: theme === Themes.dark ? "#303030" : ""}}>
                        {years.map((year, index) => (
                            <div className={theme === Themes.dark ? "darkItems" : "items"} key={index}
                                 style={{
                                     color: theme === Themes.dark ? '#FFFFFF' : '#303030',
                                     backgroundColor: theme === Themes.dark ? "#303030" : "#FFFFFF"
                                 }}
                                 onClick={() => handleModalAction(actionTypes.SELECT_YEAR, year)}>
                                {year}
                            </div>
                        ))}
                    </div>
                </Modal>)}
            {selectedModal === 'month' && (
                <Modal open={true} onClose={() => handleModalAction(actionTypes.CLOSE_MODAL)}>
                    <div className={"modelMonth"} style={{backgroundColor: theme === Themes.dark ? "#303030" : ""}}>
                        {Month.map((month, index) => (
                            <div className={theme === Themes.dark ? "darkItems" : "items"} key={index}
                                 style={{color: theme === Themes.dark ? '#FFFFFF' : '#303030'}}
                                 onClick={() => handleModalAction(actionTypes.SELECT_MONTH, month)}>
                                {month}
                            </div>
                        ))}
                    </div>
                </Modal>
            )
            }
            <div className={"billingHeaderDiv"} style={{
                backgroundColor: theme === Themes.dark ? '#202020' : '',
                color: theme === Themes.dark ? '#FFFFFF' : '#303030'
            }}>
                <div className={"billingHeaderTextDiv"}>
                    <span className={"billingHeaderText"}>{title}</span>
                    {title === Constants.usageAnalysis &&
                        <div className={"calenderDiv"}>
                            <div className={"yearDiv"} style={commonDivStyle}
                                 onClick={() => handleModalAction(actionTypes.OPEN_MODAL, 'year')}>
                                {selectedYear ? selectedYear : (
                                    <span className={"yearText"}>{new Date().getFullYear()}</span>)}
                                <img className={"billingHeaderImage"}
                                     src={theme === Themes.dark ? Images.lightThemeArrowDownIcon : Images.billingHeader_icon}
                                     alt={"icon"}/>
                            </div>
                            <div className={"modalDiv"} style={commonDivStyle}
                                 onClick={() => handleModalAction(actionTypes.OPEN_MODAL, 'month')}>
                                {selectedMonth ? (<span>{selectedMonth}</span>) : (
                                    <span className={"monthText"}>{Month[new Date().getMonth()]}</span>)}
                                <img className={"billingHeaderImage"}
                                     src={theme === Themes.dark ? Images.lightThemeArrowDownIcon : Images.billingHeader_icon}
                                     alt={"icon"}/>
                            </div>
                        </div>}
                </div>
            </div>
        </>
    )
}