import {Box, Modal} from "@mui/material";
import {Images} from "../../../utils/images";
import React, {useState} from "react";
import './billingHeaderModule.css'
import {Month} from "../../../utils/constants";

export function BillingHeaderComponent(props) {
    const {title} = props


    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [isYearModalOpen, setIsYearModalOpen] = useState(false);

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
        setIsModalOpen(false);
    };

    return (
        <>
            {isYearModalOpen &&
                <Modal open={isYearModalOpen} onClose={handleYearModalClose}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 400,
                            bgColor: 'background.paper',
                            border: '2px solid #000',
                            boxShadow: 24,
                            p: 4,
                            outline:0,
                        }}
                    >
                        <div className={"modalYear"}>


                        </div>
                    </Box>
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
                <div  className={"billingHeaderTextDiv"}>
                    <span className={"billingHeaderText"}>{title}</span>
                    <div className={"calenderDiv"}>
                        <div className={"yearDiv"} onClick={handleYearModalOpen}>
                            <span className={"yearText"}>Year</span>
                            <img className={"billingHeaderImage"} src={Images.billingHeader_icon} alt={"icon"}></img>
                        </div>
                        <div onClick={handleModalOpen} className={"modalDiv"}>
                            {selectedMonth ? (<span>{selectedMonth}</span>) : (<span className={"monthText"}>Month</span>)}
                            <img className={"billingHeaderImage"} src={Images.billingHeader_icon} alt={"icon"}></img>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )

}
