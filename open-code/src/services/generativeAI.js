async function myCode(code) {
    // console.log("Code i am getting from Blockly ::",code);
    try {
        return await fetch(`http://localhost:9000/genAI/myData`, {
            method: "POST",
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify({
                data: code
            })
        }).then((res) => res.json())
            .then((res) => {
                // console.log("res:::",res.info)
                return res.info;
            })
        // if (response !== undefined) {
        //     console.log("Fetch data from api:", response);
        // } else {
        //     console.log("resp", response);
        // }
        // const streamResult=await response;
        // console.log("response get from api",JSON.stringify((streamResult.response)));

    } catch (e) {
        console.log("Error during fetch response:", e);
    }
}

export {myCode};