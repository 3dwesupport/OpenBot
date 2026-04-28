const {personaFinalPrompt, blocklyFinalPrompt} = require("../utils/prompt");

function buildChatAssistantPayload(payload) {
    const {userPrompt, persona, currentXML, conversationHistory} = payload || {};
    const safeHistory = Array.isArray(conversationHistory) ? conversationHistory : [];

    return {
        messages: [
            {role: "system", content: persona ? personaFinalPrompt(persona) : blocklyFinalPrompt + "\nInput XML : " + currentXML},
            ...safeHistory,
            {role: "user", content: userPrompt || ""},
        ],
        model: "gpt-4o-mini-2024-07-18",
        stream: true,
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "blockly_chat_assistant",
                description: `Response structure should follow the given json schema structure:
                        $$CONTENT$$ key  does not have any xml but  $$RESPONSE$$ key have only xml code in it.
                       `,
                schema: {
                    type: "object",
                    strict: true,
                    properties: {
                        $$CONTENT$$: {
                            type: "string",
                            description: `Make sure you Provide only an explanation in clear, simple text. This section should describe the purpose and usage of the Blockly blocks. Do not include any XML code or technical details in this part—just the explanation`
                        },
                        $$RESPONSE$$: {
                            type: "string",
                            description: `Ensure you Provide only valid XML code for the Blockly blocks. Do not include any explanations in this section—only XML code.`
                        },
                    },
                    required: ["$$CONTENT$$", "$$RESPONSE$$"],
                    additionalProperties: false,
                },
            },
        },
    };
}

module.exports = {buildChatAssistantPayload};
