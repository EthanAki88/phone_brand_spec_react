const path = require('path');
const fs = require('fs');
const express = require('express');
const { scanOutput, scanBrands, getDeviceSpecs, getDeviceImagePath, getDeviceImagePaths, buildFileIndex, readFileIndex, indexToDevices, indexToBrands, indexDeviceImagePaths } = require('./lib/output-data');

const outputDir = path.join(__dirname, 'database');
const app = express();
const PORT = process.env.PORT || 3000;
let cachedIndex = null;

function getIndexPath() {
  return path.join(outputDir, 'file-index.json');
}

async function loadIndexCache() {
  if (fs.existsSync(getIndexPath())) {
    cachedIndex = await readFileIndex(outputDir);
  } else {
    cachedIndex = null;
  }
}

/* API routes first so /api/* is never served as static files */
app.get('/api/ensure-index', async (_req, res) => {
  try {
    if (fs.existsSync(getIndexPath())) {
      await loadIndexCache();
      return res.json({ ok: true, existed: true });
    }
    const index = await buildFileIndex(outputDir);
    fs.writeFileSync(getIndexPath(), JSON.stringify(index, null, 2), 'utf8');
    await loadIndexCache();
    res.json({ ok: true, existed: false });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

app.get('/api/brands', async (_req, res) => {
  try {
    if (cachedIndex) return res.json(indexToBrands(cachedIndex));
    const brands = await scanBrands(outputDir);
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

app.get('/api/devices', async (req, res) => {
  try {
    const sort = req.query.sort || 'year';
    const filterBrand = (req.query.filterBrand || '').trim();
    let devices;

    if (cachedIndex) {
      devices = indexToDevices(cachedIndex, outputDir);
    } else {
      devices = await scanOutput(outputDir);
    }

    if (filterBrand) {
      const brand = filterBrand.toLowerCase();
      devices = devices.filter(
        (d) =>
          d.slug.toLowerCase().startsWith(brand + '_') ||
          d.slug.toLowerCase().startsWith(brand)
      );
    }

    if (sort === 'year') {
      devices.sort((a, b) => Number(b.year) - Number(a.year) || a.name.localeCompare(b.name));
    } else {
      devices.sort((a, b) => a.name.localeCompare(b.name));
    }

    res.json({ devices, total: devices.length });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

app.get('/api/device/:year/:slug/specs', async (req, res) => {
  try {
    const { year, slug } = req.params;
    const devicePath = path.join(outputDir, year, slug);
    const specs = await getDeviceSpecs(outputDir, devicePath);
    if (!specs) return res.status(404).json({ error: 'Not found' });
    res.json(specs);
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

async function handleDeviceImage(req, res) {
  try {
    const { year, slug } = req.params;
    const devicePath = path.join(outputDir, year, slug);
    const isList = req.path.endsWith('images');

    if (isList) {
      if (cachedIndex) {
        const paths = indexDeviceImagePaths(cachedIndex, outputDir, year, slug, { excludeThumbnail: true });
        if (paths.length) return res.json({ images: paths.map((p) => path.basename(p)) });
      }
      const paths = await getDeviceImagePaths(outputDir, devicePath, { excludeThumbnail: true });
      const images = paths.map((p) => path.basename(p));
      return res.json({ images });
    }

    const file = req.query.file;
    let imagePath;
    const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
    if (file) {
      const safeFile = path.basename(file);
      const ext = path.extname(safeFile).toLowerCase();
      if (!allowedExt.includes(ext)) return res.status(404).send('No image');
      imagePath = path.join(devicePath, safeFile);
      const fs = require('fs');
      if (!fs.existsSync(imagePath)) return res.status(404).send('No image');
    } else {
      imagePath = await getDeviceImagePath(outputDir, devicePath);
    }
    if (!imagePath) return res.status(404).send('No image');
    res.sendFile(imagePath);
  } catch (err) {
    res.status(500).send(String(err.message));
  }
}

app.get('/api/device/:year/:slug/images', handleDeviceImage);
app.get('/api/device/:year/:slug/image', handleDeviceImage);

app.get('/api/export-index', async (_req, res) => {
  try {
    const index = await buildFileIndex(outputDir);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="file-index.json"');
    res.send(JSON.stringify(index, null, 2));
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

app.use(express.static(path.join(__dirname, 'app')));

(async () => {
  await loadIndexCache();
  app.listen(PORT, () => {
    console.log(`Dev server: http://localhost:${PORT}`);
  });
})();
