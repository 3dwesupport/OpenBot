const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const routes = require("./routes/routes");
const {notFoundHandler} = require("./middlewares/notFound.middleware");
const {errorHandler} = require("./middlewares/error.middleware");

const app = express();

app.set("x-powered-by", false);
app.use(
    cors({
        origin: [ `${env.corsOrigin}`],
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
    })
);
app.use(express.json({limit: "2mb"}));

app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
