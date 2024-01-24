import Card from '@mui/material/Card';

/**
 * function to display Card component
 * @param value
 * @param handleCardClick
 * @returns {JSX.Element}
 * @constructor
 */
export function CardComponent({value, handleCardClick}) {

    // function to handle click on card component
    const handleClick = () => {
        handleCardClick(value);
    };

    return (
        <Card sx={{
            width: "100%", display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", backgroundColor: value.bgColor, borderRadius: 3, height: "100%", gap: "4%"
        }} onClick={handleClick}>
            <div className={"cardImage"}>
                <img src={value.image} alt="Card Image" style={{cursor: "pointer"}}/>
            </div>
            <div className={"textStyleDiv"}>
                <div style={{cursor: "pointer"}}> {value.text}</div>
            </div>
        </Card>
    );
}