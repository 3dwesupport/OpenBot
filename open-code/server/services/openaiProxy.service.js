const { Readable } = require("node:stream");
const { getOpenAIClient } = require("../clients/openAIClient");
const { HttpError } = require("../utils/httpError");
const { buildChatAssistantPayload } = require("./chatAssistantPayload.service");

async function proxyChatCompletions(payload) {
  const openAIClient = getOpenAIClient();
  if (!openAIClient) {
    throw new HttpError(500, "OPENAI_API_KEY is missing on the backend server.");
  }
  if (!payload || typeof payload !== "object") {
    throw new HttpError(400, "Request payload is required.");
  }
  if (!payload.userPrompt) {
    throw new HttpError(400, "userPrompt is required.");
  }

  try {
    const requestPayload = buildChatAssistantPayload(payload);

    console.log("requestPayload::::", requestPayload);

    return await openAIClient.chat.completions.create({
      ...requestPayload,
    });
  } catch (error) {
    const statusCode = Number(error?.status) || 500;
    const message = error?.message || "Failed to call OpenAI.";
    throw new HttpError(statusCode, message);
  }
}

function pipeUpstreamToClient(upstream, res) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  return new Promise((resolve, reject) => {
    const stream = Readable.fromWeb(upstream.toReadableStream());
    stream.on("error", reject);
    res.on("close", resolve);
    stream.pipe(res);
  });
}

module.exports = {
  proxyChatCompletions,
  pipeUpstreamToClient,
};
