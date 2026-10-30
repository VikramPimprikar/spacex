
const { z } = require("zod");

const meetingSchema = z.object({
  title: z.string().trim().min(1).max(200),
  agenda: z.string().max(5000).optional().default(""),
  participants: z.array(z.string().trim().min(1))
    .optional().default([]),
  notes: z.string().max(20000).optional().default("")
});

const updateMeetingSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  agenda: z.string().max(5000).optional(),
  participants: z.array(z.string().trim().min(1)).optional(),
  notes: z.string().max(20000).optional(),
  status: z.enum(["in_progress", "completed"]).optional()
}).strict();

const taskUpdateSchema = z.object({
  owner: z.string().trim().max(200).nullable().optional(),
  due_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  status: z.enum(["open", "in_progress", "closed"]).optional()
}).strict();

const outcomeSchema = z.object({
  outcome: z.string().trim().min(1).max(5000)
});

const knowledgeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20000),
  source_type: z.enum(["document", "meeting", "handover"])
    .optional()
});

const carryForwardSchema = z.object({
  targetMeetingId: z.coerce.number().int().positive()
});

const recapSchema = z.object({
  summary: z.string(),
  decisions: z.array(z.string()),
  action_items: z.array(
    z.object({
      description: z.string().trim().min(1),
      owner: z.string().nullable(),
      due_date: z.string().nullable()
    })
  )
});

module.exports = {
  meetingSchema,
  updateMeetingSchema,
  taskUpdateSchema,
  outcomeSchema,
  knowledgeSchema,
  carryForwardSchema,
  recapSchema
};
