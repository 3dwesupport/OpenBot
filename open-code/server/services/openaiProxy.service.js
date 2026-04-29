const { Readable } = require("node:stream");
const { getOpenAIClient } = require("../clients/openAIClient");
const { HttpError } = require("../utils/httpError");
const { buildChatAssistantPayload } = require("./chatAssistantPayload.service");

async function proxyChatCompletions(payload) {
  const openAIClient = getOpenAIClient();
  if (!openAIClient) {
    throw new HttpError(500, "OpenAI Client Connection Error");
  }
  if (!payload || typeof payload !== "object") {
    throw new HttpError(400, "Request payload is required.");
  }
  if (!payload.userPrompt) {
    throw new HttpError(400, "userPrompt is required.");
  }

  try {
    const requestPayload = buildChatAssistantPayload(payload);

    return await openAIClient.chat.completions.create({
      ...requestPayload,
    });
  } catch (error) {
    console.log("error in openai-->", Number(error?.status), error?.message);
    throw new HttpError(500 , "Failed to call OpenAI");
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
