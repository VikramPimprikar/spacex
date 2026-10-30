
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pino = require("pino");
const pinoHttp = require("pino-http");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Logging setup
const logDir = path.join(__dirname, "logs");
fs.mkdirSync(logDir, { recursive: true });

const logger = pino(
  { level: process.env.LOG_LEVEL || "info" },
  pino.destination({
    dest: path.join(logDir, "app.log"),
    sync: false
  })
);

// Request IDs and HTTP request logging
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers["x-request-id"] || randomUUID(),
    customProps: (req) => ({ requestId: req.id }),
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} completed`
  })
);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173"
}));
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "SyncSpace AI"
  });
});

// Feature routes
app.use("/api/meetings", require("./routes/meetings"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/knowledge", require("./routes/knowledge"));
app.use("/api/metrics", require("./routes/metrics"));

// Unknown routes
app.use((req, res) => {
  req.log.warn({ url: req.originalUrl }, "API route not found");
  res.status(404).json({
    error: "API route not found",
    requestId: req.id
  });
});

// Unexpected errors
app.use((err, req, res, next) => {
  req.log.error({
    error: err.message,
    stack: process.env.NODE_ENV === "production"
      ? undefined
      : err.stack
  }, "Unhandled server error");

  if (res.headersSent) return next(err);

  res.status(500).json({
    error: "Internal server error",
    requestId: req.id
  });
});

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT }, "SyncSpace AI backend started");
});
