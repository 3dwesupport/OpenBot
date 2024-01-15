import {useContext, useEffect, useState} from "react";
import * as PropTypes from "prop-types";
import {Images} from "../../utils/images";
import {DropdownComponent} from "../common/dropdownComponent";
import   styles from "./profileModal.module.css";
import "./profileModal.module.css"


const UserDetails = ({user}) =>
{
    return(
<div className={styles.userProfileDiv}>
        <div className={styles.dropdownMenuItem}>
        <img className={"profileModalIcon"} style={{height:"40px", width:"40px", borderRadius:"50%", objectFit: "cover" , paddingTop:"5%"}} src={user?.photoURL} alt="User" />
        <span>{user?.displayName}</span>

        </div>
</div>

    );
}
const DropdownMenu = ({  }) => {
    return (
        <div className={"dropdownDiv"}>
            <DropdownComponent icon={Images.profileModalIcon} label={"Edit Profile"}/>
            <DropdownComponent icon={Images.transactionHistory} label={"Transaction History"}/>
            <DropdownComponent icon={Images.logOutIcon} label={"Logout"}/>
        </div>

    );
};


export  function ProfileModal (props){
    const [isDropdownVisible,setIsDropdownVisible]=useState(false);
    const {user, setUser} = props
    const [firstName, setFirstName] = useState('');
    const [file, setFile] = useState(user?.photoURL);


    useEffect(() => {

    }, []);


return(
        <div>
            {user ? (
                <div>
                    <UserDetails user={user} />
                    <img src={Images.arrowDown} alt={"arrow icon"} style={{height:"5px",width:"px"}} onClick={()=>setIsDropdownVisible(!isDropdownVisible)}/>
                    {isDropdownVisible && (
                        <DropdownMenu/>
                        )}
                </div>
            ):null}
        </div>
    );

}