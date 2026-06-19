import { Router } from "express";
import { requireAuth } from "../auth";
import { callGeminiJSON } from "../gemini";

const router = Router({ mergeParams: true });

// In-memory cache: destination → { suggestions, source, expiresAt }
const cache = new Map<string, { suggestions: any[]; source: string; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Fallback: Wikipedia/Nominatim strategy
const WIKIPEDIA_CATEGORIES: Record<string, string[]> = {
  museum: ["Museum", "Art museum", "History museum"],
  temple: ["Hindu temple", "Buddhist temple", "Mosque", "Church"],
  palace: ["Palace", "Fort", "Castle"],
  park: ["National park", "Wildlife sanctuary", "Reserve"],
  beach: ["Beach"],
};

function guessCategory(title: string, snippet: string = ""): string {
  const text = (title + " " + snippet).toLowerCase();
  if (/restaurant|cafe|food|cuisine|street food|market/.test(text)) return "food";
  if (/hotel|resort|hostel|lodge|guesthouse/.test(text)) return "accommodation";
  if (/airport|railway|station|bus|metro|transit/.test(text)) return "transport";
  if (/mall|market|bazaar|shopping/.test(text)) return "shopping";
  if (/museum|gallery|art|exhibition/.test(text)) return "sightseeing";
  if (/temple|mosque|church|shrine|mandir|masjid|cathedral|fort|palace|monument|ruins|heritage|historic/.test(text)) return "sightseeing";
  if (/park|garden|nature|wildlife|sanctuary|lake|waterfall|mountain|beach|hill|valley|forest/.test(text)) return "sightseeing";
  if (/festival|fair|event|show/.test(text)) return "activity";
  return "sightseeing";
}

async function geocode(destination: string): Promise<{ lat: number; lon: number; type: string; displayName: string } | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1&addressdetails=1`,
      { headers: { "User-Agent": "TripLog/1.0 (triplog@app.com)" } }
    );
    const data = await r.json();
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), type: data[0].type || data[0].class || "city", displayName: data[0].display_name };
  } catch { return null; }
}

async function wikipediaGeoSearch(lat: number, lon: number, radius = 8000, limit = 15): Promise<any[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=${radius}&gscoord=${lat}|${lon}&gslimit=${limit}&format=json&origin=*`;
    const r = await fetch(url, { headers: { "User-Agent": "TripLog/1.0" } });
    const data = await r.json();
    return data?.query?.geosearch || [];
  } catch { return []; }
}

async function wikipediaSearch(query: string, limit = 10): Promise<any[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " tourist attractions")}&srlimit=${limit}&format=json&origin=*`;
    const r = await fetch(url, { headers: { "User-Agent": "TripLog/1.0" } });
    const data = await r.json();
    return data?.query?.search || [];
  } catch { return []; }
}

async function getSubCities(destination: string): Promise<{ name: string; lat: number; lon: number }[]> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=8&featuretype=city`,
      { headers: { "User-Agent": "TripLog/1.0 (triplog@app.com)" } }
    );
    const data = await r.json();
    return data
      .filter((d: any) => d.type === "city" || d.type === "town" || d.addresstype === "city")
      .map((d: any) => ({ name: d.name || d.display_name.split(",")[0], lat: parseFloat(d.lat), lon: parseFloat(d.lon) }))
      .slice(0, 5);
  } catch { return []; }
}

async function fallbackWikipedia(destination: string): Promise<any[]> {
  try {
    const seen = new Set<string>();
    const results: any[] = [];

    const coords = await geocode(destination);
    if (coords) {
      // Geo-search near center
      const geoResults = await wikipediaGeoSearch(coords.lat, coords.lon, 8000, 20);
      for (const p of geoResults) {
        if (!seen.has(p.title)) {
          seen.add(p.title);
          results.push({ name: p.title, category: guessCategory(p.title), location: destination, description: "", estimatedCost: "Varies", lat: p.lat, lon: p.lon });
        }
      }

      // For large regions, also search sub-cities
      const isRegion = ["state","region","country","administrative","boundary"].some(t => coords.type.includes(t)) || geoResults.length < 5;
      if (isRegion) {
        const subCities = await getSubCities(destination);
        for (const city of subCities) {
          if (!seen.has(city.name)) {
            seen.add(city.name);
            results.push({ name: city.name, category: "sightseeing", location: destination, description: `City in ${destination}`, estimatedCost: "Varies" });
          }
          const cityGeo = await wikipediaGeoSearch(city.lat, city.lon, 5000, 8);
          for (const p of cityGeo) {
            if (!seen.has(p.title)) {
              seen.add(p.title);
              results.push({ name: p.title, category: guessCategory(p.title), location: city.name, description: "", estimatedCost: "Varies", lat: p.lat, lon: p.lon });
            }
          }
        }
      }
    }

    // Text search fallback
    if (results.length < 8) {
      const textResults = await wikipediaSearch(destination, 10);
      for (const p of textResults) {
        if (!seen.has(p.title) && !p.title.includes("district") && !p.title.includes("census")) {
          seen.add(p.title);
          const snippet = p.snippet?.replace(/<[^>]+>/g, "") || "";
          results.push({ name: p.title, category: guessCategory(p.title, snippet), location: destination, description: snippet.slice(0, 120), estimatedCost: "Varies" });
        }
      }
    }

    return results.slice(0, 30);
  } catch { return []; }
}

router.get("/", requireAuth, async (req, res) => {
  const destination = (req.query.destination as string)?.trim() || "";
  if (!destination) return res.status(400).json({ error: "destination required" });

  try {
    // Check cache first
    const cacheKey = destination.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ suggestions: cached.suggestions, destination, source: cached.source, cached: true });
    }

    // Try Gemini first
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `List the top 20 tourist places, restaurants, and activities for a trip to ${destination}. Return ONLY a JSON array, no markdown, where each item has: name (string), category (one of: sightseeing|food|shopping|activity|accommodation|transport), location (neighborhood or city area), description (1-2 sentence helpful tip for tourists), estimatedCost (string like "₹500-1000" or "Free"). Focus on must-see attractions, hidden gems, and local experiences.`;
        const suggestions = await callGeminiJSON(prompt);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          cache.set(cacheKey, { suggestions, source: "gemini", expiresAt: Date.now() + CACHE_TTL_MS });
          return res.json({ suggestions, destination, source: "gemini" });
        }
      } catch (geminiErr) {
        console.error("Gemini suggestions failed, falling back to Wikipedia:", geminiErr);
      }
    }

    // Fallback to Wikipedia
    const suggestions = await fallbackWikipedia(destination);
    cache.set(cacheKey, { suggestions, source: "wikipedia", expiresAt: Date.now() + CACHE_TTL_MS });
    res.json({ suggestions, destination, source: "wikipedia" });
  } catch (err) {
    console.error("Suggestions error:", err);
    res.json({ suggestions: [], destination });
  }
});

export default router;
