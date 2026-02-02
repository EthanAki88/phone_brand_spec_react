const path = require('path');
const fs = require('fs').promises;

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || c === '\n') {
      result.push(current.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
      current = '';
    } else {
      current += c;
    }
  }
  if (current) result.push(current.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
  return result;
}

async function getDeviceName(outputDir, devicePath) {
  try {
    const entries = await fs.readdir(devicePath);
    const specsFile = entries.find((e) => e.endsWith('_specs.csv'));
    if (!specsFile) return null;
    const content = await fs.readFile(path.join(devicePath, specsFile), 'utf8');
    const firstLine = content.split('\n')[0].trim();
    return firstLine || null;
  } catch {
    return null;
  }
}

async function scanOutput(outputDir) {
  const devices = [];
  try {
    const years = await fs.readdir(outputDir);
    const yearDirs = years.filter((y) => /^\d{4}$/.test(y));
    yearDirs.sort((a, b) => Number(b) - Number(a));

    for (const year of yearDirs) {
      const yearPath = path.join(outputDir, year);
      const stat = await fs.stat(yearPath).catch(() => null);
      if (!stat?.isDirectory()) continue;

      const slugs = await fs.readdir(yearPath);
      for (const slug of slugs) {
        const devicePath = path.join(yearPath, slug);
        const s = await fs.stat(devicePath).catch(() => null);
        if (!s?.isDirectory()) continue;

        const name = await getDeviceName(outputDir, devicePath);
        const imagePath = await getDeviceImagePath(outputDir, devicePath);
        devices.push({
          year,
          slug,
          name: name || slug.replace(/_/g, ' '),
          path: devicePath,
          imagePath: imagePath || null,
        });
      }
    }
  } catch (err) {
    console.error('Scan error:', err);
  }
  return devices;
}

async function scanBrands(outputDir) {
  const countByBrand = new Map();
  try {
    const years = await fs.readdir(outputDir);
    const yearDirs = years.filter((y) => /^\d{4}$/.test(y));
    for (const year of yearDirs) {
      const yearPath = path.join(outputDir, year);
      const stat = await fs.stat(yearPath).catch(() => null);
      if (!stat?.isDirectory()) continue;
      const slugs = await fs.readdir(yearPath);
      for (const slug of slugs) {
        const devicePath = path.join(yearPath, slug);
        const s = await fs.stat(devicePath).catch(() => null);
        if (!s?.isDirectory()) continue;
        const part = slug.split('_')[0];
        if (part) {
          const brand = part.toLowerCase();
          countByBrand.set(brand, (countByBrand.get(brand) || 0) + 1);
        }
      }
    }
  } catch (err) {
    console.error('Scan brands error:', err);
  }
  /* Sort by item count descending, then by name */
  return Array.from(countByBrand.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([brand]) => brand);
}

async function getDeviceSpecs(outputDir, devicePath) {
  try {
    const entries = await fs.readdir(devicePath);
    const specsFile = entries.find((e) => e.endsWith('_specs.csv'));
    if (!specsFile) return null;
    const content = await fs.readFile(path.join(devicePath, specsFile), 'utf8');
    const lines = content.split('\n').filter((l) => l.trim());
    const name = lines[0];
    const rows = [];
    for (let i = 2; i < lines.length; i++) {
      const parts = parseCSVLine(lines[i]);
      if (parts.length >= 3) rows.push({ category: parts[0], spec: parts[1], value: parts[2] });
    }
    return { name, specs: rows };
  } catch {
    return null;
  }
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];

function isImageFile(name) {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const THUMBNAIL_FILENAME = 'thumbnail.jpg';

async function getDeviceImagePath(outputDir, devicePath) {
  try {
    const paths = await getDeviceImagePaths(outputDir, devicePath);
    if (!paths.length) return null;
    const thumb = paths.find((p) => path.basename(p).toLowerCase() === THUMBNAIL_FILENAME);
    return thumb || paths[0];
  } catch {
    return null;
  }
}

async function getDeviceImagePaths(outputDir, devicePath, options = {}) {
  try {
    const entries = await fs.readdir(devicePath);
    let imageFiles = entries.filter((e) => isImageFile(e));
    if (options.excludeThumbnail) {
      imageFiles = imageFiles.filter((f) => path.basename(f).toLowerCase() !== THUMBNAIL_FILENAME);
    }
    const paths = imageFiles.map((f) => path.join(devicePath, f));
    const stats = await Promise.all(paths.map((p) => fs.stat(p).catch(() => null)));
    const withMtime = paths.map((p, i) => ({ path: p, mtime: stats[i] ? stats[i].mtimeMs : 0 }));
    withMtime.sort((a, b) => a.mtime - b.mtime);
    return withMtime.map((x) => x.path);
  } catch {
    return [];
  }
}

async function buildFileIndex(outputDir) {
  const devices = [];
  try {
    const years = await fs.readdir(outputDir);
    const yearDirs = years.filter((y) => /^\d{4}$/.test(y));
    yearDirs.sort((a, b) => Number(b) - Number(a));

    for (const year of yearDirs) {
      const yearPath = path.join(outputDir, year);
      const stat = await fs.stat(yearPath).catch(() => null);
      if (!stat?.isDirectory()) continue;

      const slugs = await fs.readdir(yearPath);
      for (const slug of slugs) {
        const devicePath = path.join(yearPath, slug);
        const s = await fs.stat(devicePath).catch(() => null);
        if (!s?.isDirectory()) continue;

        const name = await getDeviceName(outputDir, devicePath);
        const imagePaths = await getDeviceImagePaths(outputDir, devicePath);
        const images = imagePaths.map((p) => path.basename(p));

        devices.push({
          year,
          slug,
          name: name || slug.replace(/_/g, ' '),
          images,
        });
      }
    }
  } catch (err) {
    console.error('Build file index error:', err);
  }

  return {
    generatedAt: new Date().toISOString(),
    deviceCount: devices.length,
    devices,
  };
}

async function readFileIndex(outputDir) {
  try {
    const indexPath = path.join(outputDir, 'file-index.json');
    const content = await fs.readFile(indexPath, 'utf8');
    const index = JSON.parse(content);
    if (index && Array.isArray(index.devices)) return index;
  } catch {
    /* file missing or invalid */
  }
  return null;
}

/** Convert index devices to same shape as scanOutput for getDevices */
function indexToDevices(index, outputDir) {
  if (!index || !Array.isArray(index.devices)) return [];
  return index.devices.map((d) => {
    const devicePath = path.join(outputDir, d.year, d.slug);
    const images = Array.isArray(d.images) ? d.images : [];
    const thumb = images.find((f) => String(f).toLowerCase() === 'thumbnail.jpg');
    const firstImage = thumb || (images.length ? images[0] : null);
    const imagePath = firstImage ? path.join(devicePath, path.basename(firstImage)) : null;
    return {
      year: d.year,
      slug: d.slug,
      name: d.name || d.slug.replace(/_/g, ' '),
      path: devicePath,
      imagePath,
    };
  });
}

/** Derive brands from index (same order as scanBrands: by count desc, then name) */
function indexToBrands(index) {
  if (!index || !Array.isArray(index.devices)) return [];
  const countByBrand = new Map();
  for (const d of index.devices) {
    const part = (d.slug || '').split('_')[0];
    if (part) {
      const brand = part.toLowerCase();
      countByBrand.set(brand, (countByBrand.get(brand) || 0) + 1);
    }
  }
  return Array.from(countByBrand.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([brand]) => brand);
}

/** Get image paths for a device from index (exclude thumbnail), or empty if not found */
function indexDeviceImagePaths(index, outputDir, year, slug, options = {}) {
  if (!index || !Array.isArray(index.devices)) return [];
  const device = index.devices.find((d) => String(d.year) === String(year) && String(d.slug) === String(slug));
  if (!device || !Array.isArray(device.images)) return [];
  let list = device.images;
  if (options.excludeThumbnail) {
    const thumb = 'thumbnail.jpg';
    list = list.filter((f) => path.basename(f).toLowerCase() !== thumb);
  }
  const dir = path.join(outputDir, year, slug);
  return list.map((f) => path.join(dir, path.basename(f)));
}

module.exports = {
  scanOutput,
  scanBrands,
  getDeviceSpecs,
  getDeviceImagePath,
  getDeviceImagePaths,
  buildFileIndex,
  readFileIndex,
  indexToDevices,
  indexToBrands,
  indexDeviceImagePaths,
};
