
const db = require("./db");

function safeError(res, req, status, message) {
  req.log.warn({ status, message }, "Request rejected");

  return res.status(status).json({
    error: message,
    requestId: req.id
  });
}

function meetingById(id) {
  return db.prepare(
    "SELECT * FROM meetings WHERE id = ?"
  ).get(id);
}

function addHistory(taskId, meetingId, eventType, details = {}) {
  db.prepare(`
    INSERT INTO activity_history
      (action_item_id, meeting_id, event_type, details)
    VALUES (?, ?, ?, ?)
  `).run(
    taskId || null,
    meetingId || null,
    eventType,
    JSON.stringify(details)
  );
}

function parseJson(value, fallback = []) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = {
  safeError,
  meetingById,
  addHistory,
  parseJson
};
