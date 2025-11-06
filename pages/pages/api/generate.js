// Minimal test handler — safe, simple. Use this to confirm Vercel build environment.
export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  return res.status(200).json({ ok: true, tweets: [{ text: "API sanity test OK" }] });
}
