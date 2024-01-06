import Card from '@mui/material/Card';

// CardComponent component
export function CardComponent({value}) {
    return (
        <Card sx={{
            width: "100%", display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", backgroundColor: value.bgColor,
            borderRadius: 3,
            height: "100%",
            gap: "4%"
        }}>
            {/* Card image */}
            <div className={"cardImage"}>
                <img src={value.image} alt="Card Image"/>
            </div>
            {/* Card text */}
            <div className={"textStyleDiv"}>
                <div>{value.text}</div>
            </div>
        </Card>
    );
}