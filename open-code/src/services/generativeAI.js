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
                console.log("res:::",res.info)
                return res.info;

                // GPT Responses
                // console.log("Response fetch from api key :::::",res.choices[0].message.content);
                // return (res.choices[0].message.content);
            })

    } catch (e) {
        console.log("Error during fetch response:", e);
    }
}


export {myCode};