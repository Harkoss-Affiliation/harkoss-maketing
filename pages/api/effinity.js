import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 6; // 6 heures

export default async function handler(req, res) {
  const key = process.env.EFFINITY_KEY;
  if (!key) {
    return res.status(500).json({ error: "EFFINITY_KEY non configurée" });
  }

  const now = Date.now();

  // ✅ Si le cache est encore valide
  if (cache && now - cacheTime < CACHE_DURATION) {
    console.log("→ Réponse envoyée depuis le cache");
    return res.status(200).json(cache);
  }

  try {
    const url = `https://apiv2.effiliation.com/apiv2/productfeeds.json?key=${encodeURIComponent(key)}`;
    const r = await fetch(url);
    const text = await r.text();

    let data;
    if (text.trim().startsWith("{")) {
      // JSON
      data = JSON.parse(text);
    } else if (text.trim().startsWith("<")) {
      // XML
      data = await parseStringPromise(text, { explicitArray: false, mergeAttrs: true });
    } else {
      return res.status(502).json({
        error: "Effinity response not JSON/XML",
        preview: text.substring(0, 200),
      });
    }

    // Extraction simplifiée des produits
    const list = Array.isArray(data?.products)
      ? data.products
      : data?.items || data?.data || [];

    const products = list.map(p => ({
      id: p.id || p.sku || Math.random().toString(36).slice(2),
      title: p.title || p.name || p.product_name || "Produit",
      price: parseFloat(p.price || p.prix || p.amount) || 0,
      image: p.image || p.image_url || "https://via.placeholder.com/200x200?text=No+Image",
      url: p.url || p.link || "#",
      commission: p.commission || p.commission_rate || null,
      category: p.category || "",
      merchant: p.merchant || p.merchant_name || "",
    }));

    console.log("Produits trouvés:", products.length);

    // ✅ Sauvegarde dans le cache
    cache = products;
    cacheTime = now;

    res.status(200).json(products);
  } catch (err) {
    console.error("Erreur API Effinity:", err);
    res.status(502).json({ error: "Effinity fetch error", details: err.message });
  }
}
