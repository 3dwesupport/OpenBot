import {Box, Modal} from "@mui/material";
import {Images} from "../../../utils/images";
import React, {useEffect, useState} from "react";
import './billingHeaderModule.css'
import {Month} from "../../../utils/constants";
import {getYears} from "../../../database/APIs/projects";

export function BillingHeaderComponent(props) {
    const {title, onDataChange} = props
    const currentDate = new Date();
    const currentMonth = Month[currentDate.getMonth()]
    const currentYear = currentDate.getFullYear();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [isYearModalOpen, setIsYearModalOpen] = useState(false);
    const [years, setYears] = useState([new Date().getFullYear()]);

    const handleYearModalOpen = async () => {
        setIsYearModalOpen(true);
    };

    const handleYearModalClose = () => {
        setIsYearModalOpen(false);
    };
    const handleModalOpen = () => {
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    const handleMonthClick = (month) => {
        setSelectedMonth(month);
        onDataChange(month)
        setIsModalOpen(false);
    };
    const handleYearClick = (year) => {
        setSelectedYear(year);
        onDataChange(year)
        setIsYearModalOpen(false);
    }

    useEffect(() => {
        getYears().then((res) => {
            if (res?.length === 0) return
            setYears(res);
        })
    }, []);

    return (
        <>
            {isYearModalOpen &&
                <Modal open={isYearModalOpen} onClose={handleYearModalClose}>
                        <div className={"modalYear"}>
                            {years.map((year, index) => (
                                <div onClick={() => handleYearClick(year)} key={index} style={{padding: '10px'}}
                                     className={"items"}>
                                    {year}
                                </div>
                            ))}
                        </div>
                </Modal>
            }
            {
                isModalOpen &&
                <Modal open={isModalOpen} onClose={handleModalClose}>
                    <div className={"modalMonth"}>
                        {Month.map((month, index) => (
                            <div onClick={() => handleMonthClick(month)} style={{padding: "10px"}} className={"items"}
                                 key={index}>{month}</div>
                        ))}
                    </div>
                </Modal>
            }
                <div className={"billingHeaderDiv"}>
                    <div className={"billingHeaderTextDiv"}>
                        <span className={"billingHeaderText"}>{title}</span>
                        <div className={"calenderDiv"}>
                            <div className={"yearDiv"} onClick={handleYearModalOpen}>
                                {selectedYear ? selectedYear : (
                                    <span className={"yearText"}>{currentYear}</span>)}
                                <img className={"billingHeaderImage"} src={Images.billingHeader_icon}
                                     alt={"icon"}></img>
                            </div>
                            <div onClick={handleModalOpen} className={"modalDiv"}>
                                {selectedMonth ? (<span>{selectedMonth}</span>) : (
                                    <span className={"monthText"}>{currentMonth}</span>)}
                                <img className={"billingHeaderImage"} src={Images.billingHeader_icon}
                                     alt={"icon"}></img>
                            </div>
                        </div>
                    </div>
                </div>
        </>
    )
}
