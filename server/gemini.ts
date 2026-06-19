// Shared Gemini AI helper with model fallback
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];

function stripJsonMarkdown(text: string): string {
  let cleaned = text.replace(/^[\s\S]*?(\[|\{)/m, (_, c) => c).replace(/(\]|\})[^\]\}]*$/, (_, c) => c).trim();
  if (!cleaned.startsWith("[") && !cleaned.startsWith("{")) {
    cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  }
  return cleaned;
}

export async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  let lastErr: any;
  for (const model of MODELS) {
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

export async function callGeminiJSON<T = any>(prompt: string): Promise<T> {
  const text = await callGemini(prompt);
  return JSON.parse(stripJsonMarkdown(text));
}
