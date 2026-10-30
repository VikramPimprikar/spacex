
const Groq = require("groq-sdk");

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const AI_MODEL = process.env.GROQ_MODEL;

function requireAI(res, req) {
  if (!groq || !AI_MODEL) {
    res.status(503).json({
      error: "AI is not configured. Set GROQ_API_KEY and GROQ_MODEL in backend/.env.",
      requestId: req.id
    });

    return false;
  }

  return true;
}

async function askAI(systemPrompt, userPrompt) {
  const response = await groq.chat.completions.create({
    model: AI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned an empty response");
  }

  return JSON.parse(content);
}

module.exports = {
  requireAI,
  askAI
};
