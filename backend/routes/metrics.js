
const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/continuity", (req, res) => {
  const result = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(
        CASE
          WHEN owner IS NOT NULL AND TRIM(owner) != ''
           AND due_date IS NOT NULL AND TRIM(due_date) != ''
          THEN 1 ELSE 0
        END
      ) AS complete
    FROM action_items
    WHERE status != 'closed'
  `).get();

  const total = result.total || 0;
  const complete = result.complete || 0;

  res.json({
    totalOpenTasks: total,
    tasksWithOwnerAndDueDate: complete,
    continuityScore: total === 0
      ? 100
      : Math.round((complete / total) * 100)
  });
});

module.exports = router;
