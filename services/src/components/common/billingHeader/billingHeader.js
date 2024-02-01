import {Modal} from "@mui/material";
import {Images} from "../../../utils/images";
import React, {useState} from "react";
import './billingHeaderModule.css'
import {Month} from "../../../utils/constants";

export function BillingHeaderComponent(props) {
    const {title} = props

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState('');

    const handleModalOpen = () => {
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    const handleMonthClick = (month) => {
        setSelectedMonth(month);
        setIsModalOpen(false);
    };

    return (
        <>
            {isModalOpen &&
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
                <div  className={"billingHeaderTextDiv"}>
                    <span className={"billingHeaderText"}>{title}</span>
                    <div className={"calenderDiv"}>
                        <div className={"yearDiv"}>
                            <span>Year</span>
                            <img className={"billingHeaderImage"} src={Images.billingHeader_icon} alt={"icon"}></img>
                        </div>
                        <div onClick={handleModalOpen} className={"modalDiv"}>
                            {selectedMonth ? (<span>{selectedMonth}</span>) : (<span>Month</span>)}
                            <img className={"billingHeaderImage"} src={Images.billingHeader_icon} alt={"icon"}></img>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}