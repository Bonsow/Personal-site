// ===============================================================
// Case study overlay on projects.html
//
// Open:  1. background covers the page top → bottom (ease-in-out)
//        2. the nav morphs into the × button (top right, elastic)
//        3. content appears top → bottom with a small right → left sweep (ease-out)
// Close: 1. × morphs back into the nav
//        2. content fades away top → bottom (ease-in)
//        3. background sweeps away top → bottom (ease-in-out), revealing the list
//
// The URL follows along (projects.html?project=<id>), so the back button
// closes it and case studies can be shared / bookmarked.
// Needs: js/project-data.js, js/project-render.js, js/nav.js (main.js lenis)
// ===============================================================

// ---- Timing (ms) — tweak freely ---------------------------------
const CS_COVER_IN = 400;        // background covering the list
const CS_ITEM_IN = 350;         // each content item sweeping in
const CS_ITEM_IN_STAGGER = 45;  // delay between items, top → bottom
const CS_ITEM_SWEEP = 24;       // px the content slides in from the right
const CS_ITEM_OUT = 200;        // each content item fading out
const CS_ITEM_OUT_STAGGER = 25;
const CS_COVER_OUT = 400;       // background sweeping away
const CS_EASE_IN = 'cubic-bezier(0.55, 0, 1, 0.45)';
const CS_EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const CS_EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'; // background cover, both ways
// -----------------------------------------------------------------

const csRoot = document.getElementById('case-study');
const csBg = csRoot?.querySelector('.case-study__bg');
const csScroll = csRoot?.querySelector('.case-study__scroll');
const csContent = csRoot?.querySelector('.case-study__content');
const csTitle = document.getElementById('case-study-title');
const csDate = document.getElementById('case-study-date');
const csSections = document.getElementById('case-study-sections');
const csBackground = document.querySelectorAll('main, footer'); // list page, hidden from keyboard while open
const csReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let csOpenId = null;
let csPushedHistory = false; // did we add the history entry (so close = back)?
let csReturnFocus = null;
let csBusy = Promise.resolve();

// Smooth scrolling inside the overlay (the page's own Lenis is paused meanwhile)
const csLenis =
  csScroll && typeof Lenis !== 'undefined'
    ? new Lenis({ wrapper: csScroll, content: csContent, autoRaf: true, lerp: 0.2 })
    : null;
csLenis?.stop();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function animateItems(keyframes, { duration, stagger, easing }) {
  const items = [...csContent.querySelectorAll('.project__header > *, .project-section > *')];
  const animations = items.map((item, i) =>
    item.animate(keyframes, {
      duration: csReducedMotion ? 150 : duration,
      delay: csReducedMotion ? 0 : i * stagger,
      easing,
      fill: 'both',
    })
  );
  return Promise.all(animations.map((a) => a.finished));
}

function setNavCase(on) {
  const nav = document.querySelector('.nav');
  const home = document.querySelector('.nav__home');
  const links = document.querySelector('.nav__links');
  if (!nav || !home) return;

  if (on && typeof setNavCompact === 'function') setNavCompact(false);
  nav.classList.toggle('is-case', on);
  if (links) links.inert = on;
  home.setAttribute('aria-label', on ? 'Close project' : 'Home');
}

// ---------------------------------------------------------------
// Open
// ---------------------------------------------------------------
function openCaseStudy(id, { push = true } = {}) {
  csBusy = csBusy.then(async () => {
    if (!csRoot || csOpenId === id) return;
    csOpenId = id;
    csReturnFocus = document.activeElement;

    if (push) {
      history.pushState({ caseStudy: id }, '', `?project=${encodeURIComponent(id)}`);
      csPushedHistory = true;
    }

    // Start loading straight away; the cover animation hides the wait
    const loading = loadProject(id);

    // Reset and show the overlay
    csTitle.textContent = '';
    csDate.textContent = '';
    csSections.replaceChildren();
    csRoot.hidden = false;
    csBackground.forEach((el) => (el.inert = true));
    if (typeof lenis !== 'undefined') lenis.stop();

    // 1 + 2: cover the page and morph the nav at the same time
    const cover = csBg.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
      duration: csReducedMotion ? 150 : CS_COVER_IN,
      easing: CS_EASE_IN_OUT,
      fill: 'forwards',
    });
    setNavCase(true);

    let project;
    try {
      [project] = await Promise.all([loading, cover.finished]);
    } catch (err) {
      console.error(err);
      await cover.finished.catch(() => {});
      csTitle.textContent = 'Project not found';
      csSections.replaceChildren(el('p', {}, 'This project couldn’t be loaded.'));
      project = null;
    }

    if (project) {
      document.title = `${project.title} — Spencer Anderson`;
      csTitle.textContent = project.title;
      csDate.textContent = formatProjectDate(project.date);
      csSections.replaceChildren(...(project.sections || []).map(renderSection));
    }

    csLenis?.start();
    csLenis?.scrollTo(0, { immediate: true });
    csLenis?.resize();
    csTitle.focus({ preventScroll: true });

    // 3: content sweeps in top → bottom
    await animateItems(
      [
        { opacity: 0, transform: `translateX(${CS_ITEM_SWEEP}px)` },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { duration: CS_ITEM_IN, stagger: CS_ITEM_IN_STAGGER, easing: CS_EASE_OUT }
    );
  });
  return csBusy;
}

// ---------------------------------------------------------------
// Close
// ---------------------------------------------------------------
function closeCaseStudy({ fromHistory = false } = {}) {
  // If we added the history entry, step back through it; the popstate
  // handler below then runs this again with fromHistory = true.
  if (!fromHistory && csPushedHistory) {
    history.back();
    return csBusy;
  }

  csBusy = csBusy.then(async () => {
    if (!csRoot || csOpenId === null) return;
    csOpenId = null;
    csPushedHistory = false;
    if (!fromHistory) history.replaceState(null, '', location.pathname);

    // Freeze the overlay where it is. Don't stop its Lenis yet: a stopped
    // Lenis gets "overflow: clip" from lenis.css, and that throws the overlay's
    // scroll position back to the top (the bug where closing from halfway
    // down jumped to the top first). Ignoring pointer input instead keeps
    // wheel / touch from scrolling it while it animates away.
    csRoot.style.pointerEvents = 'none';

    // 1: × morphs back into the nav
    setNavCase(false);

    // 2: content fades away top → bottom
    await animateItems([{ opacity: 1 }, { opacity: 0 }], {
      duration: CS_ITEM_OUT,
      stagger: CS_ITEM_OUT_STAGGER,
      easing: CS_EASE_IN,
    });

    // 3: background sweeps away top → bottom, revealing the list
    await csBg.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(100% 0 0 0)' }], {
      duration: csReducedMotion ? 150 : CS_COVER_OUT,
      easing: CS_EASE_IN_OUT,
      fill: 'forwards',
    }).finished;

    csRoot.hidden = true;
    csRoot.style.pointerEvents = '';
    csLenis?.stop(); // safe now: it's hidden, and the next open scrolls to the top anyway
    csSections.replaceChildren(); // also stops slideshows
    document.title = 'Projects — Spencer Anderson';
    csBackground.forEach((el) => (el.inert = false));
    if (typeof lenis !== 'undefined') lenis.start();
    csReturnFocus?.focus?.({ preventScroll: true });
  });
  return csBusy;
}

// ---------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------

// Project cards open the overlay (Ctrl/⌘-click or middle-click still opens
// the standalone page in a new tab)
document.getElementById('project-list')?.addEventListener('click', (e) => {
  const card = e.target.closest('a.project-card');
  if (!card || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const id = new URL(card.href, location.href).searchParams.get('id');
  if (!id) return;
  e.preventDefault();
  openCaseStudy(id);
});

// While open, the nav's HOME pill is the × button
document.querySelector('.nav__home')?.addEventListener(
  'click',
  (e) => {
    if (csOpenId === null) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    closeCaseStudy();
  },
  { capture: true }
);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && csOpenId !== null) closeCaseStudy();
});

// Back / forward buttons
window.addEventListener('popstate', () => {
  const id = new URLSearchParams(location.search).get('project');
  if (id) {
    csPushedHistory = false;
    openCaseStudy(id, { push: false });
  } else if (csOpenId !== null) {
    closeCaseStudy({ fromHistory: true });
  }
});

// Opened from a shared link: projects.html?project=<id>
const csStartId = new URLSearchParams(location.search).get('project');
if (csStartId) openCaseStudy(csStartId, { push: false });
