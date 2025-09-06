// pages/api/effinity.js
import { parseStringPromise } from "xml2js";

export default async function handler(req, res) {
  try {
    const key = process.env.EFFINITY_KEY;
    if (!key) {
      return res.status(500).json({ error: "EFFINITY_KEY non configurée" });
    }

    // ⚠️ Vérifie la bonne URL dans ton compte Effiliation
    const url = `https://apiv2.effiliation.com/apiv2/productfeeds?key=${encodeURIComponent(
      key
    )}&format=json`;

    const r = await fetch(url);
    const text = await r.text(); // on lit toujours en brut

    // ✅ Essai JSON
    try {
      const data = JSON.parse(text);
      res.setHeader(
        "Cache-Control",
        "s-maxage=900, stale-while-revalidate=3600"
      );
      return res.status(200).json(data);
    } catch (_) {
      // ❌ Si ce n’est pas du JSON, on tente XML
      try {
        const xmlParsed = await parseStringPromise(text, { explicitArray: false });
        res.setHeader(
          "Cache-Control",
          "s-maxage=900, stale-while-revalidate=3600"
        );
        return res.status(200).json(xmlParsed);
      } catch (xmlErr) {
        console.error("Réponse Effinity invalide:", text.slice(0, 300));
        return res.status(502).json({
          error: "Réponse Effinity invalide",
          preview: text.slice(0, 300),
        });
      }
    }
  } catch (e) {
    console.error("Erreur /api/effinity:", e);
    return res
      .status(500)
      .json({ error: "Impossible de contacter Effinity", details: String(e) });
  }
}

