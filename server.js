import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

// Serve static files from the dist directory with cache headers
app.use('/assets', express.static(path.join(__dirname, 'dist', 'assets'), {
  maxAge: '1y',
  immutable: true,
  etag: true
}));

// Serve other static files (favicon, manifest, etc.) with normal caching
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1h',
  etag: true
}));

function httpGet(urlString) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      urlString,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
          'Accept-Encoding': 'identity',
          'User-Agent': 'hsocial/1.0',
        },
      },
      (resp) => {
        let data = '';
        resp.setEncoding('utf8');
        resp.on('data', (chunk) => {
          data += chunk;
        });
        resp.on('end', () => {
          resolve({ status: resp.statusCode || 0, body: data });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

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

    const { status, body } = await httpGet(url.toString());
    if (status < 200 || status >= 300) {
      return res.status(status || 502).type('text/plain').send(body || 'iTunes search failed');
    }
    res.type('application/json').send(body);
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

    const { status, body } = await httpGet(url.toString());
    if (status < 200 || status >= 300) {
      return res.status(status || 502).type('text/plain').send(body || 'iTunes lookup failed');
    }
    res.type('application/json').send(body);
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
    const { status, body } = await httpGet(url.toString());
    if (status < 200 || status >= 300) {
      return res.status(status || 502).type('text/plain').send(body || 'Top songs fetch failed');
    }
    res.type('application/json').send(body);
  } catch (e) {
    const message = e?.message ? String(e.message) : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Handle client-side routing - serve index.html for all non-API, non-static routes
app.get('*', (req, res) => {
  // Don't handle API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  // Serve index.html with no-cache headers
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
