const OpenAI = require("openai");
const env = require("../config/env");

let openAIClient;

function getOpenAIClient() {
  if (!env.openAIKey) {
    return null;
  }
  if (!openAIClient) {
    openAIClient = new OpenAI({
      apiKey: env.openAIKey,
    });
  }
  return openAIClient;
}

module.exports = { getOpenAIClient };
