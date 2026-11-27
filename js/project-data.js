// ===============================================================
// Shared helpers for the projects pages: loading the JSON files,
// formatting dates and building elements safely.
// Data lives in js/data/projects/ (see the "Projects JSON guide").
// ===============================================================

const PROJECTS_DIR = 'js/data/projects/';
const PROJECT_ID_PATTERN = /^[a-z0-9-]+$/; // ids are lowercase-with-dashes

const projectCache = new Map();

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Couldn't load ${url} (${res.status})`);
  return res.json();
}

// Loads one project file by id
function loadProject(id) {
  if (!PROJECT_ID_PATTERN.test(id)) {
    return Promise.reject(new Error(`"${id}" isn't a valid project id`));
  }
  if (!projectCache.has(id)) {
    projectCache.set(id, fetchJson(`${PROJECTS_DIR}${id}.json`));
  }
  return projectCache.get(id);
}

// Loads every project listed in index.json, newest first
async function loadAllProjects() {
  const index = await fetchJson(`${PROJECTS_DIR}index.json`);
  const ids = index.projects || [];
  const projects = await Promise.all(ids.map(loadProject));
  return projects.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// "2026-02-18" → "02/18/2026", "2026-02" → "02/2026"
function formatProjectDate(date) {
  const [year, month, day] = String(date || '').split('-');
  if (year && month && day) return `${month}/${day}/${year}`;
  if (year && month) return `${month}/${year}`;
  return year || '';
}

// Small element builder: el('p', { className: 'label' }, 'text', childEl, …)
// Text is always inserted as text (never HTML), so JSON content is safe.
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'className' || key === 'textContent' || key === 'href' || key === 'src' || key === 'alt') {
      node[key] = value;
    } else {
      node.setAttribute(key, value);
    }
  });
  children.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

// An <img> that turns into a labeled placeholder box if the file is missing
function imageOrPlaceholder(src, alt, className, placeholderText) {
  const placeholder = () => el('div', { className: `placeholder ${className}` }, placeholderText || alt || 'Image');
  if (!src) return placeholder();

  const img = el('img', { className, src, alt: alt || '', loading: 'lazy' });
  img.addEventListener('error', () => img.replaceWith(placeholder()), { once: true });
  return img;
}
