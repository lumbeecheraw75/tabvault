const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { extractGPMeta } = require('./gpMeta');

const app = express();
const PORT = process.env.PORT || 3001;
const LIBRARY_PATH = process.env.LIBRARY_PATH || '/library';

app.use(cors());
app.use(express.json());

// Ensure library directory exists
if (!fs.existsSync(LIBRARY_PATH)) {
  fs.mkdirSync(LIBRARY_PATH, { recursive: true });
}

// Read or generate metadata sidecar for a file
function getFileMeta(filename) {
  const metaPath = path.join(LIBRARY_PATH, filename + '.meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch (e) {}
  }

  // Parse and cache
  const filePath = path.join(LIBRARY_PATH, filename);
  const meta = extractGPMeta(filePath);
  if (meta) {
    try {
      fs.writeFileSync(metaPath, JSON.stringify(meta));
    } catch (e) {}
    return meta;
  }
  return { title: '', artist: '', album: '' };
}

// Scan all files on startup and generate missing meta
function scanLibrary() {
  try {
    const files = fs.readdirSync(LIBRARY_PATH)
      .filter(f => /\.(gp|gp3|gp4|gp5|gpx|gp6|gp7)$/i.test(f));

    for (const f of files) {
      const metaPath = path.join(LIBRARY_PATH, f + '.meta.json');
      if (!fs.existsSync(metaPath)) {
        console.log(`Scanning metadata: ${f}`);
        getFileMeta(f);
      }
    }
    console.log(`Library scan complete: ${files.length} files`);
  } catch (e) {
    console.error('Library scan error:', e.message);
  }
}

// Multer config for GP file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, LIBRARY_PATH),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._\- ]/g, '_');
    cb(null, safe);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.gp', '.gp3', '.gp4', '.gp5', '.gpx', '.gp6', '.gp7'];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only Guitar Pro files are allowed'));
  }
});

// Scan for any files missing metadata sidecars
function scanMissing() {
  try {
    const files = fs.readdirSync(LIBRARY_PATH)
      .filter(f => /\.(gp|gp3|gp4|gp5|gpx|gp6|gp7)$/i.test(f));
    for (const f of files) {
      const metaPath = path.join(LIBRARY_PATH, f + '.meta.json');
      if (!fs.existsSync(metaPath)) {
        setImmediate(() => {
          console.log(`Scanning metadata: ${f}`);
          getFileMeta(f);
        });
      }
    }
  } catch (e) {}
}

// List all GP files in library with metadata
app.get('/api/library', (req, res) => {
  scanMissing();
  try {
    const files = fs.readdirSync(LIBRARY_PATH)
      .filter(f => /\.(gp|gp3|gp4|gp5|gpx|gp6|gp7)$/i.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(LIBRARY_PATH, f));
        const meta = getFileMeta(f);
        return {
          name: f,
          size: stat.size,
          modified: stat.mtime,
          title: meta.title || '',
          artist: meta.artist || '',
          album: meta.album || '',
        };
      })
      .sort((a, b) => {
        // Sort by title if available, otherwise filename
        const aName = a.title || a.name;
        const bName = b.title || b.name;
        return aName.localeCompare(bName);
      });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve a specific GP file
app.get('/api/file/:filename', (req, res) => {
  const filePath = path.join(LIBRARY_PATH, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  const resolved = path.resolve(filePath);
  const libraryResolved = path.resolve(LIBRARY_PATH);
  if (!resolved.startsWith(libraryResolved)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.sendFile(resolved);
});

// Upload a GP file and immediately extract metadata
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // Extract metadata right away
  const meta = getFileMeta(req.file.filename);
  res.json({
    name: req.file.filename,
    size: req.file.size,
    title: meta.title || '',
    artist: meta.artist || '',
    album: meta.album || '',
  });
});

// Update metadata for a file
app.post('/api/meta/:filename', (req, res) => {
  const filePath = path.join(LIBRARY_PATH, req.params.filename);
  const resolved = path.resolve(filePath);
  const libraryResolved = path.resolve(LIBRARY_PATH);
  if (!resolved.startsWith(libraryResolved)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  const { title, artist, album } = req.body;
  const meta = { title: title || '', artist: artist || '', album: album || '' };
  const metaPath = filePath + '.meta.json';
  fs.writeFileSync(metaPath, JSON.stringify(meta));
  res.json(meta);
});

// Delete a GP file and its metadata sidecar
app.delete('/api/file/:filename', (req, res) => {
  const filePath = path.join(LIBRARY_PATH, req.params.filename);
  const resolved = path.resolve(filePath);
  const libraryResolved = path.resolve(LIBRARY_PATH);
  if (!resolved.startsWith(libraryResolved)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  fs.unlinkSync(filePath);
  // Also delete meta sidecar if exists
  const metaPath = filePath + '.meta.json';
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
  res.json({ success: true });
});

// Serve frontend static files in production
app.use((req, res, next) => {
  if (req.path.endsWith('.mjs')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});
express.static.mime.define({ 'application/javascript': ['mjs'] });
app.use(express.static('/app/frontend/dist'));
app.get('*', (req, res) => {
  if (req.path.match(/\.(mjs|js|css|png|ico|svg|woff2?)$/)) {
    return res.status(404).send('Not found');
  }
  res.sendFile('/app/frontend/dist/index.html');
});

app.listen(PORT, () => {
  console.log(`GP Player server running on port ${PORT}`);
  console.log(`Library path: ${LIBRARY_PATH}`);
  // Scan library for metadata on startup
  scanLibrary();
});
