# SMART PHONE (GSMArena Viewer)

Electron desktop app to browse a GSMArena-style phone list from a local database. View devices by brand and year, with specs and images.

## Requirements

- **Node.js** (v14 or later)
- **npm**

## Setup

```bash
npm install
```

## Running the app

**Electron (desktop):**

```bash
npm start
```

The app looks for a `database` folder in the project root (when not packaged). Create it and add your phone data (see Database structure below).

**Development server (web API):**

```bash
npm run dev
```

Starts an Express server (default port 3000) that serves the same data from a `database` folder. Useful for testing the API or a web frontend.

## Database structure

Place your data in a folder named `database` (next to the app when developing, or inside the packaged app folder when distributed).

Expected layout:

```
database/
├── file-index.json          (optional; generated on first load)
├── 2024/
│   └── BrandName/
│       └── device-slug/
│           ├── device-slug_specs.csv
│           └── images/
│               └── *.jpg, *.png, ...
├── 2023/
│   └── ...
```

- **Years**: folders named `YYYY` (e.g. `2024`, `2023`).
- **Brands**: one folder per brand under each year.
- **Devices**: one folder per device under each brand. Each device folder should contain:
  - A CSV file named `*_specs.csv` (e.g. `galaxy-s24_specs.csv`) with device specs.
  - An `images/` folder with device images.

The app can build `file-index.json` automatically on first run to speed up loading.

## Building for Windows

```bash
npm run build
```

Or use the batch script:

```bash
build-windows.bat
```

Output is in `dist\win-unpacked`. **Put the `database` folder inside that folder** so the packaged app can find it.

## Scripts

| Script   | Command        | Description                    |
|----------|----------------|--------------------------------|
| Start    | `npm start`    | Run the Electron app           |
| Dev      | `npm run dev`  | Run the Express dev server     |
| Build    | `npm run build`| Build Windows app with electron-builder |

## License

MIT
