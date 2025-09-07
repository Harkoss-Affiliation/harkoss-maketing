// pages/api/effinity.js
import fetch from "node-fetch";

let cache = null;
let lastFetch = 0;

export default async function handler(req, res) {
  const now = Date.now();

  // Cache 30 minutes
  if (cache && (now - lastFetch < 30 * 60 * 1000)) {
    return res.status(200).json(cache);
  }

  try {
    const url = `https://apiv2.effiliation.com/apiv2/productfeeds.json?key=${process.env.EFFINITY_KEY}`;
    const r = await fetch(url);

    if (!r.ok) {
      throw new Error(`Effinity upstream error: ${r.status}`);
    }

    const data = await r.json();

    cache = data;
    lastFetch = now;

    return res.status(200).json(data);
  } catch (e) {
    console.error("Erreur API Effinity:", e.message);
    return res.status(500).json({ error: "Effinity fetch error", details: e.message });
  }
}


