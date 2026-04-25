export default async function handler(req, res) {
  const { title } = req.query;
  if (!title) return res.status(400).json({ error: 'Missing title' });
  try {
    const ss = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}&limit=1&fields=externalIds,openAccessPdf,url`);
    if (ss.ok) {
      const d = await ss.json();
      if (d.data?.[0]) {
        const h = d.data[0];
        if (h.openAccessPdf?.url) return res.json({ url: h.openAccessPdf.url, source: 'Semantic Scholar' });
        if (h.externalIds?.DOI) return res.json({ url: `https://doi.org/${h.externalIds.DOI}`, source: 'Semantic Scholar' });
      }
    }
  } catch (e) {}
  try {
    const oa = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(title)}&per-page=1`);
    if (oa.ok) {
      const d = await oa.json();
      if (d.results?.[0]) {
        const h = d.results[0];
        if (h.open_access?.oa_url) return res.json({ url: h.open_access.oa_url, source: 'OpenAlex' });
        if (h.doi) return res.json({ url: h.doi.startsWith('http') ? h.doi : `https://doi.org/${h.doi}`, source: 'OpenAlex' });
      }
    }
  } catch (e) {}
  try {
    const cr = await fetch(`https://api.crossref.org/works?query.title=${encodeURIComponent(title)}&rows=1`);
    if (cr.ok) {
      const d = await cr.json();
      if (d.message?.items?.[0]) {
        const h = d.message.items[0];
        if (h.URL) return res.json({ url: h.URL, source: 'CrossRef' });
        if (h.DOI) return res.json({ url: `https://doi.org/${h.DOI}`, source: 'CrossRef' });
      }
    }
  } catch (e) {}
  return res.json({ url: null, source: 'Not found' });
}
