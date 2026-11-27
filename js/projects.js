// Projects list page: one card per project in js/data/projects/index.json
// (uses helpers from js/project-data.js)

// Foreground parallax on the card thumbnails: they move this much faster
// than the page while scrolling (0.05 = 5%). 0 turns it off.
const THUMB_PARALLAX = 0.01;

// Scroll feedback on the thumbnails (same spring as the nav): they get nudged
// by how fast you're scrolling, then spring back when you stop.
const THUMB_SPRING_STRENGTH = 2;     // how much scroll speed moves them (negative = other direction)
const THUMB_SPRING_MAX_SHIFT = 10;   // max movement in px
const THUMB_SPRING_STIFFNESS = 0.15; // 0–1: lower = slower to reach full displacement
const THUMB_SPRING_DAMPING = 0.25;    // 0–1: lower = settles faster, higher = more bounce
const THUMB_SPRING_STAGGER = 10;     // ms of delay per 50px down the screen: thumbnails at the
                                     // top react first, lower ones later (0 = all together).
                                     // Per-distance, so it feels the same on any screen size.
const THUMB_SPRING_WIDTH = 5;       // px: the spring also squeezes the thumbnails' width — at full
                                     // displacement they're this many px narrower (0 = off).
                                     // Pixels, so desktop and mobile thumbnails squeeze the same amount.

function projectCard(project) {
  const url = `project.html?id=${encodeURIComponent(project.id)}`;

  return el(
    'li',
    {},
    el(
      'a',
      { className: 'card project-card', href: url },
      imageOrPlaceholder(project.cover, '', 'project-card__thumb', ' '),
      el(
        'div',
        { className: 'project-card__body' },
        el('h2', { className: 'project-card__title' }, project.title),
        el('p', { className: 'label project-card__date' }, formatProjectDate(project.date)),
        el('p', { className: 'project-card__desc' }, project.description),
        el('span', { className: 'label project-card__more' }, 'View full project ', el('span', { 'aria-hidden': 'true' }, '⟶'))
      )
    )
  );
}

async function renderProjectList() {
  const list = document.getElementById('project-list');
  if (!list) return;

  try {
    const projects = await loadAllProjects();
    list.replaceChildren(...projects.map(projectCard));

    // Give the new cards their edge blur (see js/effects.js)
    if (typeof addEdgeBlur === 'function') addEdgeBlur(list);

    startThumbParallax(list);
    startThumbSpring(list);
  } catch (err) {
    console.error(err);
    list.replaceChildren(
      el('li', { className: 'project-list__error' }, 'Projects couldn’t be loaded. Open the site through Live Server and check the JSON files for typos.')
    );
  }
}

// ---------------------------------------------------------------
// Thumbnail parallax: each thumbnail is shifted by THUMB_PARALLAX × its
// card's distance from the middle of the screen. As you scroll, that makes
// it travel slightly faster than the card — a subtle "foreground" layer.
// ---------------------------------------------------------------
function startThumbParallax(list) {
  if (!THUMB_PARALLAX || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const update = () => {
    const middle = window.innerHeight / 2;
    list.querySelectorAll('.project-card').forEach((card) => {
      const thumb = card.querySelector('.project-card__thumb');
      if (!thumb) return;
      // Measure the card (not the thumbnail) so the shift doesn't feed back into itself
      const rect = card.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - middle) * THUMB_PARALLAX;
      thumb.style.translate = `0 ${offset.toFixed(2)}px`;
    });
  };

  if (typeof lenis !== 'undefined') lenis.on('scroll', update);
  window.addEventListener('resize', update);
  update();
}

// ---------------------------------------------------------------
// Thumbnail scroll feedback: a spring driven by Lenis's scroll velocity,
// like the nav (js/nav.js). Each thumbnail has its own spring and reads the
// scroll speed from slightly in the past — THUMB_SPRING_STAGGER ms for every
// 50px it is down the screen — so the motion ripples from the top down.
// Uses transform, so it stacks with the parallax above (which uses translate).
// ---------------------------------------------------------------
function startThumbSpring(list) {
  if (typeof lenis === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const history = []; // recent { time, velocity } samples
  const springs = new WeakMap(); // thumbnail → { shift, speed }

  // Scroll speed as it was `msAgo` milliseconds ago
  const velocityAt = (now, msAgo) => {
    const when = now - msAgo;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].time <= when) return history[i].velocity;
    }
    return history.length ? history[0].velocity : 0;
  };

  const tick = (now) => {
    const screenHeight = window.innerHeight || 1;
    const maxDelay = (screenHeight / 50) * THUMB_SPRING_STAGGER; // bottom of the screen

    history.push({ time: now, velocity: lenis.velocity });
    while (history.length && history[0].time < now - maxDelay - 100) history.shift();

    list.querySelectorAll('.project-card').forEach((card) => {
      const thumb = card.querySelector('.project-card__thumb');
      if (!thumb) return;

      // How far down the screen the card is (px), kept within the screen
      const rect = card.getBoundingClientRect();
      const y = Math.min(screenHeight, Math.max(0, rect.top + rect.height / 2));

      const velocity = velocityAt(now, (y / 50) * THUMB_SPRING_STAGGER);
      const target = Math.max(
        -THUMB_SPRING_MAX_SHIFT,
        Math.min(THUMB_SPRING_MAX_SHIFT, -velocity * THUMB_SPRING_STRENGTH)
      );

      const spring = springs.get(thumb) || { shift: 0, speed: 0 };
      spring.speed += (target - spring.shift) * THUMB_SPRING_STIFFNESS;
      spring.speed *= THUMB_SPRING_DAMPING;
      spring.shift += spring.speed;
      if (Math.abs(spring.shift) < 0.01 && Math.abs(spring.speed) < 0.01) {
        spring.shift = 0;
        spring.speed = 0;
      }
      springs.set(thumb, spring);

      // Width follows the same spring: the further it's pushed, the narrower it gets.
      // offsetWidth is the real width (unaffected by the transform itself).
      const squeezePx = (Math.abs(spring.shift) / THUMB_SPRING_MAX_SHIFT) * THUMB_SPRING_WIDTH;
      const scaleX = thumb.offsetWidth ? 1 - squeezePx / thumb.offsetWidth : 1;
      const value = `translate3d(0, ${spring.shift.toFixed(2)}px, 0) scaleX(${scaleX.toFixed(4)})`;
      if (thumb.style.transform !== value) thumb.style.transform = value;
    });

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

renderProjectList();
