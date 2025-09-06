// pages/api/effinity.js
// Proxy sécurisé : lit la clé depuis process.env.EFFINITY_KEY
export default async function handler(req, res) {
  try {
    const key = process.env.EFFINITY_KEY;
    if (!key) {
      return res.status(500).json({ error: "EFFINITY_KEY non configurée" });
    }

    // URL JSON du flux Effility (on encode la clé pour être sûr)
    const url = `https://apiv2.effiliation.com/apiv2/productfeeds.json?key=${encodeURIComponent(key)}`;

    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("Effiliation upstream error", r.status, text);
      return res.status(502).json({ error: "Erreur upstream Effility", status: r.status, body: text });
    }

    const data = await r.json();

    // Cache côté CDN / Netlify pour réduire appels (15 minutes)
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    return res.status(200).json(data);
  } catch (e) {
    console.error("Erreur /api/effinity:", e);
    return res.status(500).json({ error: "Impossible de contacter Effinity", details: String(e) });
  }
}
