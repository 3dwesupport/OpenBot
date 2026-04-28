let conversationHistory = [];

/**
 * API to get the assistant response with streaming
 * @param userPrompt
 * @param persona
 * @param currentXML
 * @param signal
 * @param onMessage
 * @returns {Promise<string>}
 */
export const getAIMessage = async (userPrompt, persona, currentXML, signal, onMessage) => {
    const apiBaseUrl = process.env.REACT_APP_CHAT_API_BASE_URL;
    // const url = apiBaseUrl
    //     ? `${String(apiBaseUrl).replace(/\/$/, "")}/api/chatAssistant`
    //     : "/api/chatAssistant";

    const  url = `http://localhost:8080/api/chatAssistant`;


    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                userPrompt,
                persona,
                currentXML,
                conversationHistory,
            }),
            signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("AI request failed:", errorText);
            return "Error occurred while processing your request.";
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let resultText = '';
        let sseBuffer = '';
        let requestFinished = false;
        let rawFallbackText = '';

        const extractContentFromParsedChunk = (parsed) => {
            const directDelta = parsed?.choices?.[0]?.delta?.content;
            if (typeof directDelta === "string" && directDelta.length > 0) {
                return directDelta;
            }

            // Some providers can emit content as arrays of typed parts.
            const arrayDelta = parsed?.choices?.[0]?.delta?.content?.[0]?.text;
            if (typeof arrayDelta === "string" && arrayDelta.length > 0) {
                return arrayDelta;
            }

            const finalMessage = parsed?.choices?.[0]?.message?.content;
            if (typeof finalMessage === "string" && finalMessage.length > 0) {
                return finalMessage;
            }

            if (typeof parsed?.content === "string" && parsed.content.length > 0) {
                return parsed.content;
            }

            return "";
        };

        const processSSELine = (rawLine) => {
            const line = rawLine.trim();
            if (!line) {
                return;
            }

            const dataLine = line.startsWith("data:") ? line.replace(/^data:\s*/, "") : line;
            if (!dataLine || dataLine === "[DONE]") {
                return;
            }

            let parsed;
            try {
                parsed = JSON.parse(dataLine);
            } catch (e) {
                // If chunk is non-JSON, keep it as raw fallback text.
                rawFallbackText += dataLine;
                return;
            }

            const content = extractContentFromParsedChunk(parsed);
            if (content) {
                onMessage(content);
                resultText += content;
            }

            if (parsed?.choices?.[0]?.finish_reason === "stop") {
                requestFinished = true;
            }
        };

        while (true) {
            const {done, value} = await reader.read();
            if (done) {
                // flush any remaining buffered payload on stream close
                sseBuffer += decoder.decode();
            } else {
                sseBuffer += decoder.decode(value, {stream: true});
            }

            // Stop if the request was aborted
            if (signal.aborted) {
                return "Request was cancelled.";

            }

            const streamLines = sseBuffer.split(/\r?\n/);
            if (done) {
                sseBuffer = "";
            } else {
                sseBuffer = streamLines.pop() || "";
            }

            for (const rawLine of streamLines) {
                processSSELine(rawLine);
            }

            if (requestFinished) {
                conversationHistory.push({ role: "user", content: userPrompt });
                conversationHistory.push({ role: "assistant", content: resultText });

                if (conversationHistory.length > 8) {
                    conversationHistory = conversationHistory.slice(-8);
                }

                console.log("all result text-------:", resultText);

                return resultText;
            }

            if (done) break;
        }

        if (!resultText && rawFallbackText) {
            resultText = rawFallbackText;
        }

        return resultText;

    } catch (error) {
        if (error.name === 'AbortError') {
            return "Request was cancelled.";
        } else {
            console.error('Error occurred:', error);
            return "Error occurred while processing your request.";
        }
    }
};
