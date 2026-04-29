import * as Blockly from "blockly/core";

/**
 * addBlocksToWorkspace function extracts XML data from a given message and adds it to a Blockly workspace.
 * @param message
 * @param workspace
 * @returns {Promise<void>}
 */
export const addBlocksToWorkspace = async (message, workspace) => {
    let xmlData = null;
    const decodeEscapedXML = (value = "") =>
        value
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\\\/g, "\\");

    const findXMLInText = (text = "") => {
        const xmlRegex = /<xml xmlns="https:\/\/developers\.google\.com\/blockly\/xml"[\s\S]*?<\/xml>/;
        const match = text.match(xmlRegex);
        return match?.[0] || null;
    };

    try {
        const parsedMessage = JSON.parse(message);
        xmlData = parsedMessage.$$RESPONSE$$ || null;
    } catch (jsonParseError) {
        console.warn("Message is not valid JSON, falling back to regex extraction");
    }

    // Fallback 1: parse any JSON object fragment from a noisy string.
    if (!xmlData && typeof message === "string") {
        const jsonObjectMatch = message.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch?.[0]) {
            try {
                const parsedMessage = JSON.parse(jsonObjectMatch[0]);
                xmlData = parsedMessage?.$$RESPONSE$$ || null;
            } catch (e) {
                // Continue with regex-based fallbacks.
            }
        }
    }

    // Fallback 2: escaped $$RESPONSE$$ XML inside JSON text.
    if (!xmlData) {
        const regex = /\$\$RESPONSE\$\$"\s*:\s*"(<xml xmlns=\\"https:\/\/developers.google.com\/blockly\/xml\\">[\s\S]*?<\/xml>)"/;
        const match = message.match(regex);
        if (match) {
            xmlData = decodeEscapedXML(match[1]);
        }
    }

    // Fallback 3: plain $$RESPONSE$$ XML (not escaped).
    if (!xmlData && typeof message === "string") {
        const plainResponseMatch = message.match(/"\$\$RESPONSE\$\$"\s*:\s*"(<xml xmlns="https:\/\/developers\.google\.com\/blockly\/xml"[\s\S]*?<\/xml>)"/);
        if (plainResponseMatch?.[1]) {
            xmlData = plainResponseMatch[1];
        }
    }

    // Fallback 4: raw XML anywhere in message.
    if (!xmlData && typeof message === "string") {
        xmlData = findXMLInText(message);
    }

    if (xmlData) {
        try {
            workspace.clear();
            const xmlDom = Blockly.utils.xml.textToDom(xmlData);
            Blockly.Xml.domToWorkspace(xmlDom, workspace);
        } catch (error) {
            console.error("Error parsing XML or adding to workspace:", error);
        }
    } else {
        console.log("No Blockly XML code found in the message");
    }
};

// export const addBlocksToWorkspace = async (message, workspace) => {
//     const regex = /<xml xmlns="https:\/\/developers.google.com\/blockly\/xml">[\s\S]*?<\/xml>/;
//     const match = message.match(regex);
//     if (match) {
//         try {
//             // workspace.clear()
//             workspace.clear()
//             const xmlDom = Blockly.utils.xml.textToDom(match[0]);
//             Blockly.Xml.domToWorkspace(xmlDom, workspace);
//         } catch (error) {
//             console.error("Error parsing XML or adding to workspace:", error);
//         }
//     } else {
//         console.log('No match found');
//     }
//
// };
