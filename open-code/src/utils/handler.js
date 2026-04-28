//Function that hide the xml and provide complete formatted response on ui after response is completed
export const handler = (message) => {
    const decodeJSONString = (raw = "") => {
        try {
            return JSON.parse(`"${raw}"`);
        } catch (e) {
            return raw
                .replace(/\\"/g, '"')
                .replace(/\\n/g, "\n")
                .replace(/\\t/g, "\t")
                .replace(/\\\\/g, "\\");
        }
    };

    try {
        const parsedMessage = JSON.parse(message);
        let content = parsedMessage?.$$CONTENT$$;

        // Define a regex to match XML content that starts with <xml xmlns="https://developers.google.com/blockly/xml">
        const xmlRegex = /<xml xmlns="https:\/\/developers\.google\.com\/blockly\/xml"[\s\S]*<\/xml>/g;

        // If the content contains XML, replace it with an empty string
        if (content && xmlRegex.test(content)) {
            content = content.replace(xmlRegex, '');
        }
        return content ?? undefined;
    } catch (error) {
        // Fallback 1: parse any JSON object fragment in a noisy response.
        const jsonObjectMatch = typeof message === "string" ? message.match(/\{[\s\S]*\}/) : null;
        if (jsonObjectMatch?.[0]) {
            try {
                const parsedMessage = JSON.parse(jsonObjectMatch[0]);
                return parsedMessage?.$$CONTENT$$ ?? undefined;
            } catch (e) {
                // Continue to regex fallback.
            }
        }

        // Fallback 2: extract $$CONTENT$$ even if JSON is incomplete.
        const contentMatch = typeof message === "string"
            ? message.match(/"\$\$CONTENT\$\$"\s*:\s*"((?:\\.|[^"\\])*)"/)
            : null;
        if (contentMatch?.[1]) {
            return decodeJSONString(contentMatch[1]);
        }

        // Keep chat stable without console spam for transient stream fragments.
        return undefined;
    }
};

//This function is to provide formatting on clicking pause icon
export function cleanAndFormatResponse(response) {
    // Replace multiple newlines (two or more) with double newlines to ensure paragraph breaks
    let cleanedResponse = response.replace(/\n{2,}/g, '\n\n');

    // Convert single newlines into spaces to prevent displaying "\n" in text
    cleanedResponse = cleanedResponse.replace(/([^\n])\n([^\n])/g, '$1 $2');

    // Ensure that numbered lists (e.g., "1. ...") are formatted correctly by keeping a newline before them
    cleanedResponse = cleanedResponse.replace(/(\d+)\.\s+/g, '\n$1. ');

    // Properly format bullet points (e.g., "- ") by keeping a newline before them
    cleanedResponse = cleanedResponse.replace(/\s*-\s+/g, '\n- ');

    // Add double newlines after periods for paragraph breaks, unless it's part of a list or bullet point
    cleanedResponse = cleanedResponse.replace(/(?<!\d)\.\s+/g, '.\n\n');

    // Clean up any extra spaces and ensure proper formatting
    cleanedResponse = cleanedResponse.replace(/\s{2,}/g, ' ').trim();

    return cleanedResponse;
}
