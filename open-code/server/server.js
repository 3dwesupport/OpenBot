const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  console.log(`[open-code-api-server] running at ${env.port}`);
});
