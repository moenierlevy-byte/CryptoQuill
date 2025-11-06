export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  try {
    const body = req.body || {};
    const topic = (body.topic || "").toString().trim();
    const tone = (body.tone || "witty").toString();
    const count = Math.max(1, Math.min(10, Number(body.count) || 3));
    const maxChars = Math.max(64, Math.min(280, Number(body.maxChars) || 220));

    if (!topic) return res.status(400).json({ error: "Topic required" });

    // Lazy-load OpenAI to avoid build-time bundling issues
    let OpenAI;
    try {
      OpenAI = (await import("openai")).default;
    } catch (e) {
      OpenAI = require("openai").default || require("openai");
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 1) Run moderation on the user's input
    try {
      const mod = await openai.moderations.create({ model: "omni-moderation-latest", input: topic });
      if (mod?.results?.[0]?.flagged) {
        return res.status(400).json({ error: "Input flagged by moderation" });
      }
    } catch (mErr) {
      // moderation failure should not block; log and continue
      console.warn("Moderation check failed; continuing", mErr);
    }

    // 2) Ask model for JSON output (strict). Include a system message for safety.
    const systemMsg = "You are CryptoQuill, a concise social media copywriter for crypto influencers. NEVER provide personalized financial advice, no buy/sell calls, no price predictions. If asked for trading advice, respond with a general educational message.";

    const userPrompt = `Create ${count} unique, tweet-length variations about: "${topic}".
Tone: ${tone}.
Max characters per tweet: ${maxChars}.
Return output as STRICT JSON exactly in this shape:
{ "tweets": [ { "text": "..." }, ... ] }
Each tweet: unique, catchy, <= ${maxChars} characters, at most 1 emoji. Do NOT provide financial advice.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const raw = completion?.choices?.[0]?.message?.content || "";

    // Parse JSON safely
    let parsed = null;
    try {
      const cleaned = raw.trim().replace(/^```json\\n?|```$/g, "");
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch (e2) { parsed = null; }
      }
    }

    // If parsing fails, fallback to newline-split best-effort
    if (!parsed || !Array.isArray(parsed.tweets)) {
      const lines = raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
      const tweets = lines.slice(0, count).map(l => ({ text: l.slice(0, maxChars) }));
      return res.status(200).json({ tweets });
    }

    // Final moderation check on generated tweets
    const flagged = [];
    for (const t of parsed.tweets || []) {
      try {
        const m = await openai.moderations.create({ model: "omni-moderation-latest", input: t.text });
        if (m?.results?.[0]?.flagged) flagged.push(t.text);
      } catch (err) {
        console.warn("Moderation of generated tweet failed", err);
      }
    }
    if (flagged.length > 0) {
      return res.status(400).json({ error: "Generated content flagged", flagged });
    }

    // All good
    return res.status(200).json({ tweets: parsed.tweets });
  } catch (err) {
    console.error("Generation error", err);
    return res.status(500).json({ error: "Generation failed", details: String(err) });
  }
}
