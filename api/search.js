export default async function handler(req, res) {
  const { title } = req.query;
  
  if (!title) {
    return res.status(400).json({ error: 'Missing title parameter' });
  }

  // Extract first quoted title or first 80 chars
  let searchQuery = title;
  const quoted = title.match(/"([^"]{10,100})"/);
  if (quoted) searchQuery = quoted[1];
  else searchQuery = title.substring(0, 80);

  // Try Semantic Scholar
  try {
    const ssRes = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchQuery)}&limit=1&fields=externalIds,openAccessPdf,url`,
      { headers: { 'User-Agent': 'citation-checker/1.0' } }
    );
    if (ssRes.ok) {
      const data = await ssRes.json();
      if (data.data?.[0]) {
        const hit = data.data[0];
        if (hit.openAccessPdf?.url) {
          return res.json({ url: hit.openAccessPdf.url, source: 'Semantic Scholar' });
        }
        if (hit.externalIds?.DOI) {
          return res.json({ url: `https://doi.org/${hit.externalIds.DOI}`, source: 'Semantic Scholar' });
        }
      }
    }
  } catch (e) {
    console.log('SS error:', e.message);
  }

  // Try OpenAlex
  try {
    const oaRes = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(searchQuery)}&per-page=1`,
      { headers: { 'User-Agent': 'citation-checker/1.0' } }
    );
    if (oaRes.ok) {
      const data = await oaRes.json();
      if (data.results?.[0]) {
        const hit = data.results[0];
        if (hit.open_access?.oa_url) {
          return res.json({ url: hit.open_access.oa_url, source: 'OpenAlex' });
        }
        if (hit.doi) {
          const doiUrl = hit.doi.startsWith('http') ? hit.doi : `https://doi.org/${hit.doi}`;
          return res.json({ url: doiUrl, source: 'OpenAlex' });
        }
      }
    }
  } catch (e) {
    console.log('OA error:', e.message);
  }

  // Try CrossRef
  try {
    const crRes = await fetch(
      `https://api.crossref.org/works?query.title=${encodeURIComponent(searchQuery)}&rows=1`,
      { headers: { 'User-Agent': 'citation-checker/1.0' } }
    );
    if (crRes.ok) {
      const data = await crRes.json();
      if (data.message?.items?.[0]) {
        const hit = data.message.items[0];
        if (hit.URL) {
          return res.json({ url: hit.URL, source: 'CrossRef' });
        }
        if (hit.DOI) {
          return res.json({ url: `https://doi.org/${hit.DOI}`, source: 'CrossRef' });
        }
      }
    }
  } catch (e) {
    console.log('CR error:', e.message);
  }

  return res.json({ url: null, source: 'Not found' });
}
