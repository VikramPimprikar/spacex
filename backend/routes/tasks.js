
const express = require("express");
const router = express.Router();
const db = require("../db");
const { safeError, addHistory } = require("../helpers");
const { taskUpdateSchema, outcomeSchema } = require("../schemas");

router.get("/", (req, res) => {
  const tasks = db.prepare(`
    SELECT ai.*, m.title AS source_meeting_title
    FROM action_items ai
    LEFT JOIN meetings m ON m.id = ai.source_meeting_id
    ORDER BY
      CASE ai.status
        WHEN 'open' THEN 0
        WHEN 'in_progress' THEN 1
        ELSE 2
      END,
      ai.due_date IS NULL,
      ai.due_date ASC
  `).all();

  res.json(tasks);
});

router.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare(
    "SELECT * FROM action_items WHERE id = ?"
  ).get(id);

  if (!task) {
    return safeError(res, req, 404, "Task not found");
  }

  const parsed = taskUpdateSchema.safeParse(req.body);

  if (!parsed.success || Object.keys(req.body || {}).length === 0) {
    return safeError(res, req, 400, "Invalid task update");
  }

  const updates = parsed.data;

  if (updates.status === "closed") {
    return safeError(
      res, req, 400,
      "Use POST /api/tasks/:id/close and provide an outcome"
    );
  }

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  values.push(id);

  db.prepare(
    `UPDATE action_items SET ${fields.join(", ")} WHERE id = ?`
  ).run(...values);

  if (updates.owner !== undefined && updates.owner !== task.owner) {
    addHistory(id, task.source_meeting_id, "task.reassigned", {
      from: task.owner,
      to: updates.owner
    });
  }

  if (updates.status !== undefined && updates.status !== task.status) {
    addHistory(id, task.source_meeting_id, "task.status_changed", {
      from: task.status,
      to: updates.status
    });
  }

  if (updates.due_date !== undefined && updates.due_date !== task.due_date) {
    addHistory(id, task.source_meeting_id, "task.due_date_changed", {
      from: task.due_date,
      to: updates.due_date
    });
  }

  req.log.info({ taskId: id }, "Task updated");

  res.json(
    db.prepare("SELECT * FROM action_items WHERE id = ?").get(id)
  );
});

router.post("/:id/close", (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare(
    "SELECT * FROM action_items WHERE id = ?"
  ).get(id);

  if (!task) {
    return safeError(res, req, 404, "Task not found");
  }

  const parsed = outcomeSchema.safeParse(req.body);

  if (!parsed.success) {
    return safeError(res, req, 400, "An outcome is required");
  }

  db.prepare(`
    UPDATE action_items
    SET status = 'closed', outcome = ?
    WHERE id = ?
  `).run(parsed.data.outcome, id);

  addHistory(id, task.source_meeting_id, "task.closed", {
    outcome: parsed.data.outcome
  });

  req.log.info({ taskId: id }, "Task closed");

  res.json(
    db.prepare("SELECT * FROM action_items WHERE id = ?").get(id)
  );
});

module.exports = router;
