const dotenv = require("dotenv");

dotenv.config({ quiet: true });

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.CHAT_API_PORT || process.env.PORT || 8080),
  corsOrigin: process.env.CORS_ORIGIN,
  openAIKey: process.env.OPENAI_API_KEY,
};

module.exports = env;
