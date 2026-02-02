const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const outputData = require('./lib/output-data');

let mainWindow;
let outputDir;
let cachedIndex = null;

/* When packaged: find folder that contains the exe (win-unpacked). Then database goes inside it. */
function getDatabaseDir() {
  if (!app.isPackaged) {
    return path.join(__dirname, 'database');
  }
  /* Packaged: app runs from resources/app.asar; the folder user sees is parent of resources */
  const appPath = app.getAppPath();
  const resourcesDir = path.dirname(appPath);       /* .../resources */
  const appRootDir = path.dirname(resourcesDir);    /* .../win-unpacked (folder with exe) */
  const dbPath = path.join(appRootDir, 'database');
  return dbPath;
}

function createWindow() {
  const iconPath = path.join(__dirname, 'app', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('app/index.html');
}

app.whenReady().then(async () => {
  outputDir = getDatabaseDir();
  await loadIndexCache();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('getDatabasePath', () => outputDir || getDatabaseDir());

function getIndexPath() {
  const dir = outputDir || getDatabaseDir();
  return path.join(dir, 'file-index.json');
}

async function loadIndexCache() {
  const dir = outputDir || getDatabaseDir();
  if (fs.existsSync(getIndexPath())) {
    cachedIndex = await outputData.readFileIndex(dir);
  } else {
    cachedIndex = null;
  }
}

ipcMain.handle('hasIndex', async () => {
  try {
    return fs.existsSync(getIndexPath());
  } catch {
    return false;
  }
});

ipcMain.handle('buildAndSaveIndex', async () => {
  try {
    const dir = outputDir || getDatabaseDir();
    const index = await outputData.buildFileIndex(dir);
    const json = JSON.stringify(index, null, 2);
    fs.writeFileSync(path.join(dir, 'file-index.json'), json, 'utf8');
    await loadIndexCache();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.message) };
  }
});

ipcMain.handle('getBrands', async () => {
  const dir = outputDir || getDatabaseDir();
  if (cachedIndex) return outputData.indexToBrands(cachedIndex);
  return outputData.scanBrands(dir);
});

ipcMain.handle('getDevices', async (_, options = {}) => {
  const { sort = 'year', filterBrand = '' } = options;
  const dir = outputDir || getDatabaseDir();
  let devices;

  if (cachedIndex) {
    devices = outputData.indexToDevices(cachedIndex, dir);
  } else {
    devices = await outputData.scanOutput(dir);
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

  return { devices, total: devices.length };
});

ipcMain.handle('getDeviceSpecs', async (_, devicePath) =>
  outputData.getDeviceSpecs(outputDir || getDatabaseDir(), devicePath)
);

ipcMain.handle('getDeviceImage', async (_, devicePath) => {
  const dir = outputDir || getDatabaseDir();
  if (cachedIndex) {
    const parts = path.relative(dir, devicePath).split(path.sep);
    if (parts.length >= 2) {
      const [year, slug] = parts;
      const device = cachedIndex.devices.find((d) => String(d.year) === year && String(d.slug) === slug);
      if (device && Array.isArray(device.images) && device.images.length) {
        const thumb = device.images.find((f) => path.basename(f).toLowerCase() === 'thumbnail.jpg');
        const first = thumb || device.images[0];
        return path.join(dir, year, slug, path.basename(first));
      }
    }
  }
  return outputData.getDeviceImagePath(dir, devicePath);
});

ipcMain.handle('getDeviceImages', async (_, devicePath) => {
  const dir = outputDir || getDatabaseDir();
  if (cachedIndex) {
    const parts = path.relative(dir, devicePath).split(path.sep);
    if (parts.length >= 2) {
      const [year, slug] = parts;
      const paths = outputData.indexDeviceImagePaths(cachedIndex, dir, year, slug, {});
      if (paths.length) return paths;
    }
  }
  return outputData.getDeviceImagePaths(dir, devicePath);
});

ipcMain.handle('getDeviceImagesByYearSlug', async (_, year, slug) => {
  const dir = outputDir || getDatabaseDir();
  if (cachedIndex) {
    const paths = outputData.indexDeviceImagePaths(cachedIndex, dir, String(year), String(slug), { excludeThumbnail: true });
    if (paths.length) return paths;
  }
  const devicePath = path.join(dir, String(year), String(slug));
  return outputData.getDeviceImagePaths(dir, devicePath, { excludeThumbnail: true });
});

ipcMain.handle('exportFileIndex', async () => {
  try {
    const dbDir = outputDir || getDatabaseDir();
    const index = await outputData.buildFileIndex(dbDir);
    const json = JSON.stringify(index, null, 2);
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow || null, {
      title: 'Save index',
      defaultPath: path.join(dbDir, 'file-index.json'),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    fs.writeFileSync(filePath, json, 'utf8');
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: String(err.message) };
  }
});
