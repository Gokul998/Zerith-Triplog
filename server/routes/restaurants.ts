import { Router } from "express";
import { verifyToken } from "../auth";

const router = Router({ mergeParams: true });
const PLACES_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "AIzaSyDatnEBjk2sEXsrgziQY4j4raDttjoNc-U";

router.get("/", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !verifyToken(token)) return res.status(401).json({ error: "Unauthorized" });

  const destination = (req.query.destination as string) || "";
  if (!destination) return res.status(400).json({ error: "destination required" });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // 1. Geocode with Nominatim
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
      { headers: { "User-Agent": "TripLog/1.0" }, signal: controller.signal }
    );
    const geoData = await geoRes.json() as any[];

    if (!geoData.length) {
      clearTimeout(timeout);
      return res.json({ restaurants: [], searchUrl: `https://www.google.com/maps/search/restaurants+in+${encodeURIComponent(destination)}` });
    }

    const lat = parseFloat(geoData[0].lat);
    const lon = parseFloat(geoData[0].lon);

    // 2. Google Places Nearby Search
    const placesRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=3000&type=restaurant&key=${PLACES_KEY}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    const placesData = await placesRes.json() as any;
    const restaurants = (placesData.results ?? []).slice(0, 15).map((p: any) => ({
      name: p.name,
      cuisine: p.types?.filter((t: string) => !["food", "point_of_interest", "establishment", "restaurant"].includes(t)).map((t: string) => t.replace(/_/g, " ")).slice(0, 2).join(", ") || "restaurant",
      address: p.vicinity || destination,
      rating: p.rating,
      ratingCount: p.user_ratings_total,
      priceLevel: p.price_level,
      openNow: p.opening_hours?.open_now,
      photo: p.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photo_reference=${p.photos[0].photo_reference}&key=${PLACES_KEY}`
        : null,
      placeId: p.place_id,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
    }));

    res.json({ restaurants, searchUrl: `https://www.google.com/maps/search/restaurants+in+${encodeURIComponent(destination)}` });
  } catch (e: any) {
    if (e.name === "AbortError") {
      res.json({ restaurants: [], searchUrl: `https://www.google.com/maps/search/restaurants+in+${encodeURIComponent(destination)}` });
    } else {
      res.status(500).json({ error: e.message || "Failed to fetch restaurants" });
    }
  }
});

export default router;
