import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/api/itunes/search', async (req, res) => {
  try {
    const term = typeof req.query.term === 'string' ? req.query.term : '';
    const limit = typeof req.query.limit === 'string' ? req.query.limit : '20';
    const country = typeof req.query.country === 'string' ? req.query.country : 'US';
    const entity = typeof req.query.entity === 'string' ? req.query.entity : 'song';

    const url = new URL('https://itunes.apple.com/search');
    url.searchParams.set('term', term);
    url.searchParams.set('limit', limit);
    url.searchParams.set('country', country);
    url.searchParams.set('entity', entity);

    const resp = await fetch(url.toString());
    const text = await resp.text();
    if (!resp.ok) {
      return res.status(resp.status).type('text/plain').send(text || 'iTunes search failed');
    }
    res.type('application/json').send(text);
  } catch (e) {
    const message = e?.message ? String(e.message) : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.get('/api/itunes/lookup', async (req, res) => {
  try {
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    const country = typeof req.query.country === 'string' ? req.query.country : 'US';

    const url = new URL('https://itunes.apple.com/lookup');
    url.searchParams.set('id', id);
    url.searchParams.set('country', country);

    const resp = await fetch(url.toString());
    const text = await resp.text();
    if (!resp.ok) {
      return res.status(resp.status).type('text/plain').send(text || 'iTunes lookup failed');
    }
    res.type('application/json').send(text);
  } catch (e) {
    const message = e?.message ? String(e.message) : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.get('/api/itunes/top', async (req, res) => {
  try {
    const rawLimit = typeof req.query.limit === 'string' ? req.query.limit : '50';
    const limit = Math.max(1, Math.min(100, Number.parseInt(rawLimit, 10) || 50));
    const country = typeof req.query.country === 'string' ? req.query.country : 'us';

    const url = new URL(`https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/${limit}/songs.json`);
    const resp = await fetch(url.toString());
    const text = await resp.text();
    if (!resp.ok) {
      return res.status(resp.status).type('text/plain').send(text || 'Top songs fetch failed');
    }
    res.type('application/json').send(text);
  } catch (e) {
    const message = e?.message ? String(e.message) : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Handle client-side routing - serve index.html for all non-API, non-static routes
app.get('*', (req, res) => {
  // Don't handle static files
  if (req.path.includes('.')) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Don't handle API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
