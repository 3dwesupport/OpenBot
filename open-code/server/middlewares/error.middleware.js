const { HttpError } = require("../utils/httpError");

function errorHandler(err, req, res, next) {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  const message =
    err instanceof HttpError
      ? err.message
      : "Internal server error while processing request.";

  if (!res.headersSent) {
    res.status(statusCode).json({ error: message });
  }

  if (statusCode >= 500) {
    console.error("[open-code-api-server] error:", err);
  }

  next();
}

module.exports = { errorHandler };
