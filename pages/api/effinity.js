// pages/api/effinity.js
// Proxy securise : lit la cle depuis process.env.EFFINITY_KEY
export default async function handler(req, res) {
  try {
    const key = process.env.EFFINITY_KEY;
    if (!key) {
      return res.status(500).json({ error: "EFFINITY_KEY non configuree" });
    }

    // URL du flux Effinity
    const url = `https://apiv2.effiliation.com/apiv2/productfeeds.json?key=l9bApWf7Jea556N6ug3srcdIM476fKfi`;

    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await r.text(); // on lit toujours en texte brut

    // ✅ On essaie d'abord de parser en JSON
    try {
      const data = JSON.parse(text);
      res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
      return res.status(200).json(data);
    } catch (jsonErr) {
      // ❌ Si ce n'est pas du JSON, on renvoie le texte brut (probablement XML ou erreur HTML)
      console.error("Reponse Effinity non-JSON:", text.slice(0, 300));
      return res.status(502).json({
        error: "Reponse Effinity non-JSON",
        preview: text.slice(0, 300) // renvoie juste les 300 premiers caracteres
      });
    }
  } catch (e) {
    console.error("Erreur /api/effinity:", e);
    return res.status(500).json({ error: "Impossible de contacter Effinity", details: String(e) });
  }
}

