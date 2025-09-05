// pages/api/effinity.js
export default async function handler(req, res) {
  const key = process.env.EFFINITY_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  try {
    const r = await fetch(`https://apiv2.effiliation.com/apiv2/productfeeds.json?key=${encodeURIComponent(key)}`);
    if (!r.ok) return res.status(502).json({ error: 'Upstream error' });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Fetch failed' });
  }
}
