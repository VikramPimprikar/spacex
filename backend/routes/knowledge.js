
const express = require("express");
const router = express.Router();
const db = require("../db");
const { safeError } = require("../helpers");
const { knowledgeSchema } = require("../schemas");

router.get("/search", (req, res) => {
  const query = String(req.query.q || "").trim();

  if (!query) {
    return res.json({ documents: [], meetings: [] });
  }

  const pattern = `%${query}%`;

  const documents = db.prepare(`
    SELECT id, title, content, source_type, created_at
    FROM knowledge_documents
    WHERE title LIKE ? OR content LIKE ?
    ORDER BY id DESC
    LIMIT 20
  `).all(pattern, pattern);

  const meetings = db.prepare(`
    SELECT id, title, summary, notes, created_at
    FROM meetings
    WHERE title LIKE ?
       OR notes LIKE ?
       OR summary LIKE ?
    ORDER BY id DESC
    LIMIT 20
  `).all(pattern, pattern, pattern);

  res.json({ documents, meetings });
});

router.post("/", (req, res) => {
  const parsed = knowledgeSchema.safeParse(req.body);

  if (!parsed.success) {
    return safeError(res, req, 400, "Invalid knowledge document");
  }

  const {
    title,
    content,
    source_type = "document"
  } = parsed.data;

  const result = db.prepare(`
    INSERT INTO knowledge_documents (title, content, source_type)
    VALUES (?, ?, ?)
  `).run(title, content, source_type);

  const documentId = Number(result.lastInsertRowid);

  req.log.info({ documentId }, "Knowledge document saved");

  res.status(201).json(
    db.prepare(
      "SELECT * FROM knowledge_documents WHERE id = ?"
    ).get(documentId)
  );
});

module.exports = router;
