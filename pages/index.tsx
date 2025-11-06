import React, { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("witty");
  const [tweets, setTweets] = useState<{ text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setError("");
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    setLoading(true);
    setTweets([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), tone })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Generation failed");
      }
      const data = await res.json();
      setTweets(Array.isArray(data.tweets) ? data.tweets : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>CryptoQuill</h1>
          <small style={{ color: "#666" }}>AI tweet generator for crypto influencers</small>
        </header>

        <section style={{ marginTop: 18 }}>
          <label style={{ display: "block", marginBottom: 8 }}>Topic</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Bitcoin halving" style={{ width: "100%", padding: 12 }} />
        </section>

        <section style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)} style={{ width: "100%", padding: 8 }}>
              <option value="witty">Witty</option>
              <option value="hype">Hype</option>
              <option value="educational">Educational</option>
              <option value="serious">Serious</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <button onClick={generate} disabled={loading} style={{ padding: "10px 16px" }}>
              {loading ? "Generating..." : "Generate Tweets"}
            </button>
            <button onClick={() => { setTopic(""); setTweets([]); setError(""); }} style={{ padding: "10px 12px" }}>Reset</button>
          </div>
        </section>

        {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}

        <section style={{ marginTop: 18 }}>
          {tweets.length > 0 && (
            <>
              <h2 style={{ margin: "6px 0" }}>Suggestions</h2>
              <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
                {tweets.map((t, i) => (
                  <li key={i} style={{ border: "1px solid #eee", padding: 12, borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ whiteSpace: "pre-wrap" }}>{t.text}</div>
                      </div>
                      <div style={{ marginLeft: 16, display: "flex", gap: 8 }}>
                        <button onClick={() => navigator.clipboard.writeText(t.text).catch(() => alert("Copy failed"))}>Copy</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <footer style={{ marginTop: 28, color: "#666", fontSize: 14 }}>
          <div>Built with ❤️ — CryptoQuill</div>
        </footer>
      </div>
    </div>
  );
}
