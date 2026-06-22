// AI helper — uses Groq (free, fast Llama 3) with Gemini as fallback
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];

function stripJsonMarkdown(text: string): string {
  let cleaned = text.replace(/^[\s\S]*?(\[|\{)/m, (_, c) => c).replace(/(\]|\})[^\]\}]*$/, (_, c) => c).trim();
  if (!cleaned.startsWith("[") && !cleaned.startsWith("{")) {
    cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  }
  return cleaned;
}

async function callGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Groq error");
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  let lastErr: any;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      if (data.error) {
        const msg = data.error.message || "";
        if (data.error.code === 503 || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("not found")) {
          lastErr = new Error(msg); continue;
        }
        throw new Error(msg);
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) return text;
    } catch (e: any) {
      lastErr = e;
      if (!e.message?.includes("high demand") && !e.message?.includes("overloaded") && !e.message?.includes("not found")) throw e;
    }
  }
  throw lastErr || new Error("All Gemini models failed");
}

// Try Groq first, fall back to Gemini
export async function callGeminiText(prompt: string): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    try { return await callGroq(prompt); } catch (e: any) {
      console.warn("Groq failed, falling back to Gemini:", e.message);
    }
  }
  return callGemini(prompt);
}

// Keep old export names so all routes work without changes
export { callGeminiText as callGemini };

export async function callGeminiJSON<T = any>(prompt: string): Promise<T> {
  const text = await callGeminiText(prompt);
  return JSON.parse(stripJsonMarkdown(text));
}
