const express = require("express");
const {
  proxyChatCompletions,
  pipeUpstreamToClient,
} = require("../services/openaiProxy.service");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    name: "open-code-api-server",
    status: "ok",
  });
});

router.post("/api/chatAssistant", async (req, res, next) => {
  try {
    const upstream = await proxyChatCompletions(req.body);

    await pipeUpstreamToClient(upstream, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
