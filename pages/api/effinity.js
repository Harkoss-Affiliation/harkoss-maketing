import fetch from "node-fetch";

export default async function handler(req, res) {
  const key = process.env.EFFINITY_KEY;
  if (!key) {
    return res.status(500).json({ error: "EFFINITY_KEY non configurée" });
  }

  try {
    // Flux JSON standardisé Effinity
    const url = `https://apiv2.effiliation.com/apiv2/productfeeds.json?key=${encodeURIComponent(key)}`;
    const r = await fetch(url);

    if (!r.ok) {
      throw new Error(`Effinity erreur HTTP ${r.status}`);
    }

    const data = await r.json();

    // Normalisation des produits
    const products = (data?.products || data?.items || data?.data || []).map(p => ({
      id: p.id || p.sku || Math.random().toString(36).slice(2),
      title: p.title || p.name || p.product_name || "Produit",
      price: parseFloat(p.price || p.prix || p.amount) || 0,
      image: p.image || p.image_url || "https://via.placeholder.com/200x200?text=No+Image",
      url: p.url || p.link || "#",
      commission: p.commission || p.commission_rate || null,
      category: p.category || "",
      merchant: p.merchant || p.merchant_name || "",
    }));

    res.status(200).json(products);
  } catch (err) {
    console.error("Erreur API Effinity:", err);
    res.status(502).json({ error: "Effinity fetch error", details: err.message });
  }
}
