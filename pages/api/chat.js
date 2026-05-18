export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, tab } = req.body;
  if (!messages || !tab) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const PROMPTS = {
    train: `You are RailTrace, an Indian Railways AI assistant. The user will give a train number or name.
Respond with ONLY raw HTML, no markdown, no code fences, no backticks.
Include: a div.train-header with h2 (train name) and p (number + route), a p.train-summary, an h3, a table.rt-table with columns Station/Code/Arrives/Departs/Day/Platform (8 rows), and a div.status-bar with a span using class "rt-status-pill running" or "rt-status-pill on-time" or "rt-status-pill delayed".
Use realistic Indian Railways data.`,

    station: `You are RailTrace, an Indian Railways AI assistant. The user will give a station code or name.
Respond with ONLY raw HTML, no markdown, no code fences, no backticks.
Include: a div.train-header with h2 (station name) and p (code + zone + state), an h3, a table.rt-table with columns Train No/Train Name/From-To/Scheduled/Delay/Platform/Status (8 rows). Use span with class "rt-status-pill on-time" or "rt-status-pill delayed" or "rt-status-pill running" for status.
Use realistic Indian Railways data.`,

    pnr: `You are RailTrace, an Indian Railways AI assistant. The user will give a PNR number.
Respond with ONLY raw HTML, no markdown, no code fences, no backticks.
Include: a div.train-header with h2 "PNR Status" and p (PNR number), a div.journey-details with a table showing Train/Date/From/To/Class, an h3 "Passenger Status", a table.rt-table with columns Passenger/Booking Status/Current Status/Coach/Berth/Type. Use "rt-status-pill on-time" for CNF, "rt-status-pill delayed" for RAC, "rt-status-pill late" for WL.`,
  };

  const systemPrompt = PROMPTS[tab] || PROMPTS.train;

  // Build OpenAI-compatible messages array (Groq uses the same format)
  let groqMessages;

  if (messages.length === 1) {
    groqMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: messages[0].content },
    ];
  } else {
    groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
    ];
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY not set in .env.local" });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        max_tokens: 1500,
        temperature: 0.4,
      }),
    });

    const rawText = await groqRes.text();

    if (!groqRes.ok) {
      console.error("Groq error response:", rawText);
      return res.status(500).json({ error: `Groq ${groqRes.status}: ${rawText.slice(0, 200)}` });
    }

    const data = JSON.parse(rawText);

    if (data.error) {
      console.error("Groq data error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    let text = data.choices?.[0]?.message?.content || "";
    text = text
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return res.status(200).json({ reply: text });
  } catch (err) {
    console.error("Fetch/parse error:", err);
    return res.status(500).json({ error: err.message });
  }
}