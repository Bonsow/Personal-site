// ---------------------------------------------------------------
// Geometry Dash levels — built from js/data/gd-levels.js
// ---------------------------------------------------------------
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

const VIDEO_TYPES = { webm: 'video/webm', mp4: 'video/mp4', mov: 'video/quicktime' };

// Builds a <video>, <img> or placeholder depending on the file(s) given
function previewHtml(level) {
  const files = [].concat(level.preview || []).filter(Boolean);
  if (!files.length) return '<div class="placeholder level__preview">Animated Preview</div>';

  const ext = (file) => file.split('.').pop().toLowerCase();
  const videos = files.filter((f) => VIDEO_TYPES[ext(f)]);

  if (videos.length) {
    // Muted + playsinline so browsers allow autoplay. preload="none": nothing
    // downloads until the card is opened (see setOpen below).
    const sources = videos
      .map((f) => `<source src="${escapeHtml(f)}" type="${VIDEO_TYPES[ext(f)]}" />`)
      .join('');
    return `<video class="level__preview" muted loop playsinline preload="none" tabindex="0" aria-label="${escapeHtml(level.name)} preview, click to pause or play">${sources}</video>`;
  }

  return `<img class="level__preview" src="${escapeHtml(files[0])}" alt="${escapeHtml(level.name)} preview" loading="lazy" />`;
}

function renderGdLevels() {
  const list = document.getElementById('gd-levels');
  if (!list || typeof GD_LEVELS === 'undefined') return;

  list.innerHTML = GD_LEVELS.map((level) => {
    const preview = previewHtml(level);
    const downloads = Number(level.downloads).toLocaleString('en-US');

    return `
      <li class="level">
        ${preview}
        <div>
          <h2>${escapeHtml(level.name)}</h2>
          <ul class="bullets label">
            <li>GDDL enjoyment: ${escapeHtml(level.enjoyment)}/10</li>
            <li>${escapeHtml(downloads)} downloads</li>
            <li>Difficulty rank: #${escapeHtml(level.rank)}</li>
          </ul>
        </div>
      </li>`;
  }).join('');
}

renderGdLevels();

// ---------------------------------------------------------------
// When a card opens, smooth-scroll so its top sits just below the nav.
// ---------------------------------------------------------------
const CARD_SCROLL_GAP = 20;        // space between the nav and the card (px)
const CARD_SCROLL_DURATION = 2;  // seconds the scroll takes: lower = faster, higher = slower

function scrollCardIntoView(card) {
  if (typeof lenis === 'undefined') return;

  const navPill = document.querySelector('.nav__pill');
  const navBottom = navPill ? navPill.getBoundingClientRect().bottom : 0;
  const offset = -(navBottom + CARD_SCROLL_GAP);

  lenis.scrollTo(card, { offset, duration: CARD_SCROLL_DURATION });

  // Cards near the bottom of the page may not have enough room to reach the
  // top until they've finished expanding, so try again once they have.
  const details = card.querySelector('.fun-card__details');
  details?.addEventListener(
    'transitionend',
    () => {
      lenis.resize();
      lenis.scrollTo(card, { offset, duration: CARD_SCROLL_DURATION });
    },
    { once: true }
  );
}

// Expandable "What I make for fun" cards.
// - Closed: clicking anywhere on the card opens it.
// - Open: clicking the top row (icon, title, ×) closes it; the content below doesn't.
// Each card works on its own, so both can be open at once.
document.querySelectorAll('.fun-card').forEach((card) => {
  const header = card.querySelector('.fun-card__header');
  const button = card.querySelector('.fun-card__toggle');
  const details = button && document.getElementById(button.getAttribute('aria-controls'));
  if (!header || !button || !details) return;

  function setOpen(open) {
    card.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    details.inert = !open; // closed content can't be tabbed into

    if (open) {
      buildMediaIn(details); // first open: create sliders/slideshows (starts their downloads)
      scrollCardIntoView(card);
    }

    // Play preview videos only while the card is open
    // (videos the visitor paused themselves stay paused)
    details.querySelectorAll('video').forEach((video) => {
      if (open && !video.dataset.userPaused) {
        video.play().catch(() => {}); // ignore if the browser blocks it
      } else {
        video.pause();
      }
    });
  }

  card.addEventListener('click', (e) => {
    const isOpen = card.classList.contains('is-open');
    if (!isOpen) {
      setOpen(true);
    } else if (header.contains(e.target)) {
      setOpen(false);
    }
  });
});

// ---------------------------------------------------------------
// Click (or Enter/Space) on a preview video to pause / play it
// ---------------------------------------------------------------
function toggleVideo(video) {
  if (video.paused) {
    delete video.dataset.userPaused;
    video.play().catch(() => {});
  } else {
    video.dataset.userPaused = 'true';
    video.pause();
  }
}

document.querySelectorAll('video.level__preview').forEach((video) => {
  // Dim the video only when the visitor paused it
  video.addEventListener('play', () => video.classList.remove('is-paused'));
  video.addEventListener('pause', () => video.classList.toggle('is-paused', !!video.dataset.userPaused));

  video.addEventListener('click', () => toggleVideo(video));
  video.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleVideo(video);
    }
  });
});

// ---------------------------------------------------------------
// Media spots: before/after sliders and slideshows (same ones the case
// studies use, from js/project-render.js).
//   Before/after: data-before-after + data-before / data-after image paths
//                 (and optional data-before-alt / data-after-alt / data-caption)
//   Slideshow:    data-slideshow + data-images="a.webp, b.webp, …"
//                 and optional data-alts="Alt A | Alt B | …" in the same order
//
// Spots inside a closed fun card aren't built until the card is first
// opened, so their images don't download for visitors who never open it.
// ---------------------------------------------------------------
function buildMediaSpot(spot) {
  if (typeof BLOCKS === 'undefined') return;
  const d = spot.dataset;

  if ('beforeAfter' in d) {
    spot.replaceWith(
      BLOCKS.beforeAfter({
        before: { src: d.before, alt: d.beforeAlt },
        after: { src: d.after, alt: d.afterAlt },
        caption: d.caption,
      })
    );
  } else if ('slideshow' in d) {
    const srcs = (d.images || '').split(',').map((src) => src.trim()).filter(Boolean);
    const alts = (d.alts || '').split('|').map((alt) => alt.trim());
    spot.replaceWith(BLOCKS.slideshow({ images: srcs.map((src, i) => ({ src, alt: alts[i] || '' })) }));
  }
}

// Build every media spot inside `root` (used when a fun card opens)
function buildMediaIn(root) {
  root.querySelectorAll('[data-before-after], [data-slideshow]').forEach(buildMediaSpot);
}

// Spots that aren't inside a fun card's hidden content are built right away
document.querySelectorAll('[data-before-after], [data-slideshow]').forEach((spot) => {
  if (!spot.closest('.fun-card__details')) buildMediaSpot(spot);
});
