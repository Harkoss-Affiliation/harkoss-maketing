// pages/api/effinity.js
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 heures
let cache = null;
let lastFetch = 0;

function extractItemsFromParsed(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;

  // Cas courants
  if (parsed.products && parsed.products.product) {
    const p = parsed.products.product;
    return Array.isArray(p) ? p : [p];
  }
  if (parsed.items && parsed.items.item) {
    const p = parsed.items.item;
    return Array.isArray(p) ? p : [p];
  }
  if (parsed.rows && parsed.rows.row) {
    const p = parsed.rows.row;
    return Array.isArray(p) ? p : [p];
  }
  if (parsed.rss && parsed.rss.channel && parsed.rss.channel.item) {
    const p = parsed.rss.channel.item;
    return Array.isArray(p) ? p : [p];
  }
  if (parsed.catalogue && parsed.catalogue.product) {
    const p = parsed.catalogue.product;
    return Array.isArray(p) ? p : [p];
  }

  // fallback: chercher la première array d'objets profonde
  function search(o) {
    if (Array.isArray(o) && o.length && typeof o[0] === "object") return o;
    if (typeof o === "object") {
      for (const v of Object.values(o)) {
        const res = search(v);
        if (res) return res;
      }
    }
    return null;
  }
  const res = search(parsed);
  return res || [];
}

export default async function handler(req, res) {
  const now = Date.now();
  if (cache && (now - lastFetch < CACHE_TTL)) {
    return res.status(200).json(cache);
  }

  const key = process.env.EFFINITY_KEY;
  if (!key) {
    return res.status(500).json({ error: "EFFINITY_KEY non configurée" });
  }

  try {
    // On force la version XML (plus fiable côté Effinity)
    const url = `https://apiv2.effiliation.com/apiv2/productfeeds.xml?key=${encodeURIComponent(key)}`;
    const r = await fetch(url, { headers: { Accept: "application/xml, text/xml, */*" } });

    // upstream non ok -> renvoyer code et body pour le debug
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("Effinity upstream non ok:", r.status, text);
      return res.status(502).json({ error: "Effinity upstream error", status: r.status, bodyPreview: text.substr(0, 1000) });
    }

    const text = await r.text();

    // Parfois Effinity renvoie un JSON d'erreur en texte -> on tente JSON d'abord
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const maybeJson = JSON.parse(trimmed);
        const arr = maybeJson.products || maybeJson.items || maybeJson.data || maybeJson;
        cache = Array.isArray(arr) ? arr : [arr];
        lastFetch = now;
        return res.status(200).json(cache);
      } catch (e) {
        // pas JSON -> continuer le parsing XML
      }
    }

    // parse XML via xml2js
    const parsed = await parseStringPromise(text, { explicitArray: false, mergeAttrs: true, trim: true });
    const items = extractItemsFromParsed(parsed) || [];

    // Sauvegarder cache (tableau d'items)
    cache = items;
    lastFetch = now;

    return res.status(200).json(items);
  } catch (e) {
    console.error("Erreur API Effinity:", e);
    return res.status(500).json({ error: "Effinity fetch error", details: String(e) });
  }
}
