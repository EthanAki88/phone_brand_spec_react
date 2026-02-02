const PER_PAGE = 50;
let allDevices = [];
let currentPage = 1;
let currentSort = 'year';
let currentBrand = '';
let currentSearch = '';

const isElectron = typeof window.api !== 'undefined';
const API_BASE = window.API_BASE || '';

const $ = (id) => document.getElementById(id);
const loading = $('loading');
const error = $('error');
const phoneList = $('phoneList');
const pagination = $('pagination');
const pageTitle = $('pageTitle');
const brandList = $('brandList');
const listView = $('listView');
const detailView = $('detailView');
const detailTitle = $('detailTitle');
const detailPhoto = $('detailPhoto');
const detailQuickSpecs = $('detailQuickSpecs');
const detailSpecsContent = $('detailSpecsContent');
const detailPicturesContent = $('detailPicturesContent');
const detailPicturesTitle = $('detailPicturesTitle');
const detailPicturesGallery = $('detailPicturesGallery');
const specsList = $('specs-list');
const backToList = $('backToList');
const picturesButton = $('picturesButton');
const specsButton = $('specsButton');
const picturesToTopBtn = $('picturesToTopBtn');
const searchInput = $('searchInput');
const exportIndexBtn = $('exportIndexBtn');
const updatingOverlay = $('updatingOverlay');

let currentDetailImagePaths = [];
let currentDetailName = '';
let currentDetailYear = '';
let currentDetailSlug = '';
let currentDetailDevicePath = '';

function setLoading(show) {
  loading.classList.toggle('hidden', !show);
  if (show) {
    error.classList.add('hidden');
    phoneList.innerHTML = '';
    pagination.innerHTML = '';
  }
}

function setError(msg) {
  loading.classList.add('hidden');
  error.textContent = msg;
  error.classList.remove('hidden');
}

function getListDisplayName(d) {
  if (!currentBrand || !d.name) return d.name;
  const brandPrefix = currentBrand.charAt(0).toUpperCase() + currentBrand.slice(1) + ' ';
  if (d.name.toLowerCase().startsWith(brandPrefix.toLowerCase())) {
    return d.name.slice(brandPrefix.length).trim() || d.name;
  }
  return d.name;
}

function getSpec(byCategory, category, specName) {
  const rows = byCategory[category];
  if (!rows) return null;
  const r = rows.find((x) => x.spec === specName);
  return r ? r.value : null;
}

const icons = {
  launched: '<span class="head-icon icon-launched" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>',
  body: '<span class="head-icon icon-mobile" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg></span>',
  os: '<span class="head-icon icon-os" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></span>',
  storage: '<span class="head-icon icon-sd" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="1"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="10" x2="18" y2="14"/></svg></span>',
  display: '<span class="head-icon icon-display" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span>',
  camera: '<span class="head-icon icon-camera" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>',
  cpu: '<span class="head-icon icon-cpu" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg></span>',
  battery: '<span class="head-icon icon-battery" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="18" height="12" rx="2"/><rect x="3" y="8" width="14" height="8" rx="1"/><line x1="20" y1="10" x2="20" y2="14"/></svg></span>',
  charging: '<span class="head-icon icon-charging" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>',
};

const specBriefIcons = ['launched', 'body', 'os', 'storage'];

function buildSpotlightFeatures(specBrief, byCategory) {
  let html = '';
  if (specBrief.length) {
    html += '<li class="specs-brief pattern">';
    specBrief.forEach((r, i) => {
      const icon = specBriefIcons[i] ? icons[specBriefIcons[i]] : '';
      html += '<span class="specs-brief-accent">' + icon + '<span>' + escapeHtml(r.value) + '</span></span>';
      if (i < specBrief.length - 1) html += '<br>';
    });
    html += '</li>';
  }
  const displaySize = getSpec(byCategory, 'DISPLAY', 'Size');
  const displayRes = getSpec(byCategory, 'DISPLAY', 'Resolution');
  if (displaySize || displayRes) {
    const sizeMatch = displaySize && displaySize.match(/([\d.]+)\s*inches/);
    const sizeShort = sizeMatch ? sizeMatch[1] + '"' : (displaySize || '—');
    const resShort = displayRes ? displayRes.replace(/\s*\([^)]*\).*/, '').trim() : '—';
    html += '<li class="help accented help-display">' + icons.display + '<strong class="accent">' + escapeHtml(sizeShort) + '</strong></li>';
  }
  const camMain = getSpec(byCategory, 'MAIN CAMERA', 'Triple') || getSpec(byCategory, 'MAIN CAMERA', 'Dual') || getSpec(byCategory, 'MAIN CAMERA', 'Single');
  const camVideo = getSpec(byCategory, 'MAIN CAMERA', 'Video');
  if (camMain || camVideo) {
    const mpMatch = camMain && camMain.match(/(\d+)\s*MP/);
    const mpShort = mpMatch ? mpMatch[1] + ' MP' : (camMain ? camMain.substring(0, 25) : '—');
    html += '<li class="help accented help-camera">' + icons.camera + '<strong class="accent accent-camera">' + escapeHtml(mpShort) + '</strong></li>';
  }
  const memoryInternal = getSpec(byCategory, 'MEMORY', 'Internal');
  const chipset = getSpec(byCategory, 'PLATFORM', 'Chipset');
  if (memoryInternal || chipset) {
    let ramShort = '—';
    if (memoryInternal) {
      const ramMatches = memoryInternal.match(/(\d+)\s*GB\s*RAM/gi);
      if (ramMatches) {
        const nums = [...new Set(ramMatches.map((m) => m.match(/\d+/)[0]))];
        ramShort = nums.join('/') + ' GB RAM';
      } else {
        const gb = memoryInternal.match(/(\d+)\s*GB/);
        ramShort = gb ? gb[1] + ' GB RAM' : memoryInternal.substring(0, 30);
      }
    }
    const chipShort = chipset ? (chipset.length > 35 ? chipset.replace(/\s*\([^)]*\)/, '').trim().substring(0, 35) : chipset) : '—';
    html += '<li class="help accented help-expansion">' + icons.cpu + '<strong class="accent accent-expansion">' + escapeHtml(ramShort) + '</strong></li>';
  }
  const batteryType = getSpec(byCategory, 'BATTERY', 'Type');
  const batteryCharging = getSpec(byCategory, 'BATTERY', 'Charging');
  if (batteryType || batteryCharging) {
    const mAhMatch = batteryType && batteryType.match(/(\d+)\s*mAh/i);
    const mAhShort = mAhMatch ? mAhMatch[1] + ' mAh' : (batteryType || '—');
    const wMatch = batteryCharging && batteryCharging.match(/(\d+)\s*W/);
    const chargingShort = wMatch ? wMatch[1] + 'W' : (batteryCharging ? batteryCharging.substring(0, 30) : '—');
    html += '<li class="help accented help-battery">' + icons.battery + '<strong class="accent accent-battery">' + escapeHtml(mAhShort) + '</strong></li>';
  }
  return html;
}

function renderList() {
  const query = (currentSearch || '').trim().toLowerCase();
  const filtered = query
    ? allDevices.filter((d) => (d.name || '').toLowerCase().includes(query))
    : allDevices;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const start = (currentPage - 1) * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);

  phoneList.innerHTML = slice
    .map((d) => {
      const displayName = getListDisplayName(d);
      const hasImage = isElectron ? d.imagePath : true;
      const imgPart = hasImage
        ? `<img src="${escapeAttr(thumbnailImageSrc(d))}" alt="" loading="lazy">`
        : '<span class="maker-no-img"></span>';
      const title = escapeAttr(d.name + (d.year ? ' (' + d.year + ')' : ''));
      return `<li><a href="#" data-path="${escapeAttr(d.path || '')}" data-year="${escapeAttr(d.year)}" data-slug="${escapeAttr(d.slug)}" title="${title}">${imgPart}<strong><span>${escapeHtml(displayName)}</span></strong></a></li>`;
    })
    .join('');

  phoneList.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openDetail(a.dataset.path, a.dataset.year, a.dataset.slug);
    });
  });

  renderPagination(totalPages, total);
  loading.classList.add('hidden');
  error.classList.add('hidden');
}

function thumbnailImageSrc(d) {
  if (isElectron && d.imagePath) {
    return 'file:///' + d.imagePath.replace(/\\/g, '/');
  }
  return `${API_BASE}/api/device/${encodeURIComponent(d.year)}/${encodeURIComponent(d.slug)}/image`;
}

function escapeAttr(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderPagination(totalPages, total) {
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  const items = [];
  items.push(
    currentPage <= 1
      ? '<span class="disabled">◄</span>'
      : `<a href="#" data-page="${currentPage - 1}">◄</a>`
  );

  const showPages = 9;
  let from = Math.max(1, currentPage - Math.floor(showPages / 2));
  let to = Math.min(totalPages, from + showPages - 1);
  if (to - from + 1 < showPages) from = Math.max(1, to - showPages + 1);

  for (let i = from; i <= to; i++) {
    if (i === currentPage) {
      items.push(`<span class="current">${i}</span>`);
    } else {
      items.push(`<a href="#" data-page="${i}">${i}</a>`);
    }
  }

  items.push(
    currentPage >= totalPages
      ? '<span class="disabled">►</span>'
      : `<a href="#" data-page="${currentPage + 1}">►</a>`
  );

  pagination.innerHTML = items.join('');

  pagination.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = Number(a.dataset.page);
      renderList();
    });
  });
}

function showList() {
  listView.classList.remove('hidden');
  detailView.classList.add('hidden');
}

function openDetail(devicePath, year, slug) {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  listView.classList.add('hidden');
  detailView.classList.remove('hidden');
  detailTitle.textContent = 'Loading…';
  detailPhoto.innerHTML = '';
  detailQuickSpecs.innerHTML = '';
  detailPicturesGallery.innerHTML = '';
  specsList.innerHTML = '';
  if (detailSpecsContent) detailSpecsContent.classList.remove('hidden');
  if (detailPicturesContent) detailPicturesContent.classList.add('hidden');

  const loadData = isElectron && devicePath
    ? Promise.all([
        window.api.getDeviceSpecs(devicePath),
        window.api.getDeviceImage(devicePath),
        window.api.getDeviceImages(devicePath),
      ]).then(([specs, imagePath, imagePaths]) => ({ specs, imagePath, imagePaths: imagePaths || [] }))
    : Promise.all([
        fetch(`${API_BASE}/api/device/${encodeURIComponent(year)}/${encodeURIComponent(slug)}/specs`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_BASE}/api/device/${encodeURIComponent(year)}/${encodeURIComponent(slug)}/images`).then((r) => (r.ok ? r.json() : { images: [] })),
      ]).then(([specs, res]) => {
        if (!specs) return { specs: null, imagePath: null, imagePaths: [] };
        const imageFiles = Array.isArray(res && res.images) ? res.images : [];
        /* Main image: same URL as list (server picks first image) */
        const imagePath = `${API_BASE}/api/device/${encodeURIComponent(year)}/${encodeURIComponent(slug)}/image`;
        /* Gallery: use full list from /images so picture view shows all images */
        const imagePaths = imageFiles.length
          ? imageFiles.map((f) => `${API_BASE}/api/device/${encodeURIComponent(year)}/${encodeURIComponent(slug)}/image?file=${encodeURIComponent(f)}`)
          : [imagePath];
        return { specs, imagePath, imagePaths };
      });

  loadData.then(({ specs, imagePath, imagePaths }) => {
    if (!specs) {
      detailTitle.textContent = 'No specs found.';
      return;
    }

    let imagePathsList = imagePaths || [];
    if (imagePath && imagePathsList.length === 0) {
      imagePathsList = [imagePath];
    }
    if (imagePathsList.length > 0 && !imagePath) {
      imagePath = imagePathsList[0];
    }

    const specBrief = (specs.specs || []).filter((r) => r.category === 'Specs Brief');
    const specTables = (specs.specs || []).filter((r) => r.category !== 'Specs Brief');
    const byCategory = {};
    specTables.forEach((row) => {
      if (!byCategory[row.category]) byCategory[row.category] = [];
      byCategory[row.category].push(row);
    });

    detailTitle.textContent = specs.name;
    currentDetailName = specs.name;
    currentDetailYear = year || '';
    currentDetailSlug = slug || '';
    currentDetailDevicePath = devicePath || '';
    currentDetailImagePaths = imagePathsList;

    if (imagePath) {
      const imgSrc = isElectron ? 'file:///' + imagePath.replace(/\\/g, '/') : imagePath;
      const altText = specs.name + '\nMORE PICTURES';
      const link = imagePathsList.length ? '<a href="#" id="mainPhotoLink"><img alt="' + escapeAttr(altText) + '" src="' + escapeAttr(imgSrc) + '" id="detailMainImg"></a>' : '<img alt="' + escapeAttr(specs.name) + '" src="' + escapeAttr(imgSrc) + '" id="detailMainImg">';
      detailPhoto.innerHTML = link;
      const mainPhotoLink = document.getElementById('mainPhotoLink');
      if (mainPhotoLink) mainPhotoLink.addEventListener('click', (e) => { e.preventDefault(); showPicturesView(); });
      const mainImg = document.getElementById('detailMainImg');
      if (mainImg) {
        mainImg.onerror = function () {
          detailPhoto.innerHTML = '<span class="photo-placeholder">No image</span>';
        };
      }
    } else {
      detailPhoto.innerHTML = '<span class="photo-placeholder">No image</span>';
    }

    if (imagePathsList.length > 0 && picturesButton) {
      picturesButton.classList.remove('hidden');
      picturesButton.onclick = (e) => { e.preventDefault(); showPicturesView(); };
    } else {
      if (picturesButton) picturesButton.classList.add('hidden');
    }

    const spotlight = buildSpotlightFeatures(specBrief, byCategory);
    detailQuickSpecs.innerHTML = spotlight;

    let tablesHtml = '';
    Object.keys(byCategory).forEach((cat) => {
      const rows = byCategory[cat];
      tablesHtml += `<table cellspacing="0"><tbody>`;
      rows.forEach((row, i) => {
        if (i === 0) {
          tablesHtml += `<tr><th rowspan="${rows.length}" scope="row">${escapeHtml(cat)}</th><td class="ttl">${escapeHtml(row.spec)}</td><td class="nfo">${escapeHtml(row.value)}</td></tr>`;
        } else {
          tablesHtml += `<tr><td class="ttl">${escapeHtml(row.spec)}</td><td class="nfo">${escapeHtml(row.value)}</td></tr>`;
        }
      });
      tablesHtml += `</tbody></table>`;
    });
    specsList.innerHTML = tablesHtml;
  });
}

function showPicturesView() {
  if (!detailSpecsContent || !detailPicturesContent) return;
  detailSpecsContent.classList.add('hidden');
  detailPicturesContent.classList.remove('hidden');
  if (detailPicturesTitle) detailPicturesTitle.textContent = currentDetailName + ' pictures';

  function renderGallery(paths) {
    if (!detailPicturesGallery) return;
    const list = Array.isArray(paths) ? paths : [];
    detailPicturesGallery.innerHTML = list.length
      ? list
          .map((src, i) => {
            const s = isElectron ? 'file:///' + String(src).replace(/\\/g, '/') : src;
            return `<div class="pictures-gallery-item"><img src="${escapeAttr(s)}" alt="${escapeAttr(currentDetailName)} ${i + 1}" loading="lazy"></div>`;
          })
          .join('')
      : '';
  }

  /* Always load full image list when opening picture view so gallery shows all images in folder */
  if (isElectron && currentDetailYear && currentDetailSlug) {
    window.api.getDeviceImagesByYearSlug(currentDetailYear, currentDetailSlug).then((paths) => {
      const list = Array.isArray(paths) ? paths : [];
      currentDetailImagePaths = list;
      renderGallery(list);
    }).catch(() => renderGallery(currentDetailImagePaths));
  } else if (!isElectron && currentDetailYear && currentDetailSlug) {
    fetch(`${API_BASE}/api/device/${encodeURIComponent(currentDetailYear)}/${encodeURIComponent(currentDetailSlug)}/images`)
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((res) => {
        const imageFiles = Array.isArray(res && res.images) ? res.images : [];
        currentDetailImagePaths = imageFiles.length
          ? imageFiles.map((f) =>
              `${API_BASE}/api/device/${encodeURIComponent(currentDetailYear)}/${encodeURIComponent(currentDetailSlug)}/image?file=${encodeURIComponent(f)}`
            )
          : currentDetailImagePaths;
        renderGallery(currentDetailImagePaths);
      })
      .catch(() => renderGallery(currentDetailImagePaths));
  } else {
    renderGallery(currentDetailImagePaths);
  }
}

function showSpecsView() {
  if (!detailSpecsContent || !detailPicturesContent) return;
  detailPicturesContent.classList.add('hidden');
  detailSpecsContent.classList.remove('hidden');
}

if (backToList) backToList.addEventListener('click', (e) => { e.preventDefault(); showList(); });
if (specsButton) specsButton.addEventListener('click', (e) => { e.preventDefault(); showSpecsView(); });
if (picturesToTopBtn) picturesToTopBtn.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

function handleExportIndexClick(e) {
  const btn = e.target.closest('#exportIndexBtn');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  btn.disabled = true;
  (async () => {
    try {
      if (typeof window.api !== 'undefined' && typeof window.api.exportFileIndex === 'function') {
        const result = await window.api.exportFileIndex();
        if (result && result.ok) {
          alert('Index saved to:\n' + result.filePath);
        } else if (result && !result.canceled && result.error) {
          alert('Update failed: ' + result.error);
        }
      } else {
        const base = window.API_BASE || '';
        const res = await fetch(base + '/api/export-index');
        if (!res.ok) throw new Error(res.statusText);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'file-index.json';
        a.click();
        URL.revokeObjectURL(url);
        alert('Index downloaded.');
      }
    } catch (err) {
      alert('Update failed: ' + (err && err.message ? err.message : String(err)));
    } finally {
      btn.disabled = false;
    }
  })();
}

const contentEl = document.querySelector('.content');
if (contentEl) contentEl.addEventListener('click', handleExportIndexClick);

function updateTitle() {
  const brandLabel = currentBrand
    ? (currentBrand.charAt(0).toUpperCase() + currentBrand.slice(1)) + ' '
    : '';
  pageTitle.textContent = brandLabel + 'phones';
}

async function loadDevices() {
  setLoading(true);
  updateTitle();
  try {
    const payload = isElectron
      ? await window.api.getDevices({ sort: currentSort, filterBrand: currentBrand })
      : await fetch(
          `${API_BASE}/api/devices?sort=${encodeURIComponent(currentSort)}&filterBrand=${encodeURIComponent(currentBrand)}`
        ).then((r) => r.json());
    const { devices } = payload;
    allDevices = devices;
    currentPage = 1;
    if (allDevices.length === 0) {
      const msg = 'No devices found. Check that the database folder contains year/device folders with *_specs.csv.';
      setError(msg);
      if (isElectron && window.api.getDatabasePath) {
        window.api.getDatabasePath().then((p) => {
          if (p) setError(msg + ' Looking at: ' + p);
        }).catch(() => {});
      }
    } else {
      renderList();
    }
  } catch (err) {
    setError('Failed to load devices: ' + (err && err.message ? err.message : String(err)));
  }
}

document.querySelectorAll('.sort-link[data-sort]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    currentSort = link.dataset.sort;
    document.querySelectorAll('.sort-link[data-sort]').forEach((l) => l.classList.remove('active'));
    link.classList.add('active');
    loadDevices();
  });
});

if (searchInput) {
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    currentSearch = searchInput.value;
    currentPage = 1;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => renderList(), 150);
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      currentSearch = '';
      currentPage = 1;
      renderList();
      searchInput.blur();
    }
  });
}

function setBrand(brand) {
  /* When on detail or picture view, switch back to list so the brand filter is visible */
  if (detailView && !detailView.classList.contains('hidden')) {
    showList();
  }
  currentBrand = brand;
  brandList.querySelectorAll('a').forEach((a) => {
    a.classList.toggle('active', a.dataset.brand === brand);
  });
  loadDevices();
}

async function loadBrands() {
  try {
    const brands = isElectron
      ? await window.api.getBrands()
      : await fetch(`${API_BASE}/api/brands`).then((r) => r.json());
    brandList.innerHTML =
      '<li><a href="#" class="active" data-brand="">All brands</a></li>' +
      brands
        .map(
          (b) =>
            `<li><a href="#" data-brand="${escapeAttr(b)}">${escapeHtml(b.charAt(0).toUpperCase() + b.slice(1))}</a></li>`
        )
        .join('');
    brandList.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        setBrand(a.dataset.brand);
      });
    });
  } catch (err) {
    brandList.innerHTML = '<li class="hint">Failed to load brands</li>';
  }
}

async function ensureIndexThenLoad() {
  if (typeof window.api !== 'undefined' && typeof window.api.hasIndex === 'function' && typeof window.api.buildAndSaveIndex === 'function') {
    const hasIndex = await window.api.hasIndex();
    if (!hasIndex && updatingOverlay) {
      updatingOverlay.classList.remove('hidden');
      try {
        await window.api.buildAndSaveIndex();
      } finally {
        updatingOverlay.classList.add('hidden');
      }
    }
  } else {
    if (updatingOverlay) updatingOverlay.classList.remove('hidden');
    try {
      const base = window.API_BASE || '';
      await fetch(base + '/api/ensure-index');
    } finally {
      if (updatingOverlay) updatingOverlay.classList.add('hidden');
    }
  }
  await loadBrands();
  loadDevices();
}

ensureIndexThenLoad();
