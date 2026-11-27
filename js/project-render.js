// ===============================================================
// Builds case study content from a project's JSON sections.
// Shared by project.html (standalone page) and the overlay on
// projects.html (js/case-study.js). Needs js/project-data.js.
// ===============================================================

// ---------------------------------------------------------------
// One function per block type in the JSON
// ---------------------------------------------------------------
function captioned(media, caption) {
  return el('figure', { className: 'project-figure' }, media, caption ? el('figcaption', { className: 'label' }, caption) : null);
}

const BLOCKS = {
  paragraph: (b) => el('p', {}, b.text),

  bulletList: (b) => el('ul', { className: 'bullets' }, (b.items || []).map((item) => el('li', {}, item))),

  numberedList: (b) => el('ol', { className: 'numbers' }, (b.items || []).map((item) => el('li', {}, item))),

  image: (b) => captioned(imageOrPlaceholder(b.src, b.alt, 'project-media', 'Image'), b.caption),

  // Before / after: the "after" image sits on top and a slider reveals it
  // Before / after: drag to move the divider; glass grip follows the cursor
  // up/down the line; "Before"/"After" buttons slide it all the way across
  beforeAfter: (b) => {
    // Hidden range input keeps it usable with the keyboard / screen readers
    const range = el('input', {
      className: 'before-after__range visually-hidden',
      type: 'range',
      min: '0',
      max: '100',
      value: '50',
      'aria-label': 'Compare before and after',
    });
    const chevron = (dir) => el('span', { className: `before-after__chevron before-after__chevron--${dir}`, 'aria-hidden': 'true' });
    const grip = el('div', { className: 'before-after__grip', 'aria-hidden': 'true' },
      el('div', { className: 'before-after__grip-face' }, chevron('left'), chevron('right')));
    const beforeBtn = el('button', { className: 'before-after__tag before-after__tag--before', type: 'button', 'aria-label': 'Show the before image' }, 'Before');
    const afterBtn = el('button', { className: 'before-after__tag before-after__tag--after', type: 'button', 'aria-label': 'Show the after image' }, 'After');

    const compare = el(
      'div',
      { className: 'before-after', style: '--pos: 50%; --grip-y: 0px' },
      el('div', { className: 'before-after__layer before-after__before' },
        imageOrPlaceholder(b.before?.src, b.before?.alt, 'project-media', 'Before')),
      el('div', { className: 'before-after__layer before-after__after' },
        imageOrPlaceholder(b.after?.src, b.after?.alt, 'project-media', 'After')),
      el('div', { className: 'before-after__handle', 'aria-hidden': 'true' }),
      grip,
      beforeBtn,
      afterBtn,
      range
    );

    startBeforeAfter(compare, { range, grip, beforeBtn, afterBtn });
    return captioned(compare, b.caption);
  },

  // Slideshow: slides scroll sideways (expo-out); arrow buttons + autoplay.
  // One caption under the whole slideshow; it stays put while slides change.
  slideshow: (b) => {
    const slides = (b.images || []).map((img, i) =>
      el(
        'div',
        { className: 'slideshow__slide', 'aria-hidden': i === 0 ? 'false' : 'true' },
        imageOrPlaceholder(img.src, img.alt, 'project-media', `Slide ${i + 1}`)
      )
    );

    const track = el('div', { className: 'slideshow__track' }, slides);
    const prev = el('button', { className: 'slideshow__btn slideshow__btn--prev', type: 'button', 'aria-label': 'Previous slide' },
      el('span', { className: 'slideshow__chevron', 'aria-hidden': 'true' }));
    const next = el('button', { className: 'slideshow__btn slideshow__btn--next', type: 'button', 'aria-label': 'Next slide' },
      el('span', { className: 'slideshow__chevron', 'aria-hidden': 'true' }));

    const show = el(
      'div',
      { className: 'slideshow', 'aria-roledescription': 'slideshow' },
      el('div', { className: 'slideshow__viewport' }, track),
      slides.length > 1 ? [prev, next] : null
    );
    startSlideshow(show, track, slides, prev, next);
    return captioned(show, b.caption);
  },
};

// ---------------------------------------------------------------
// Slideshow behaviour — tweak freely
// ---------------------------------------------------------------
const SLIDESHOW_INTERVAL = 4000;        // ms each slide stays up before auto-advancing
const SLIDESHOW_SCROLL_DURATION = 900;  // ms for a slide to scroll across
const SLIDESHOW_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // expo-out
const SLIDESHOW_HOVER_GROW = 10;        // px a button grows while hovered (mouse only)
const SLIDESHOW_PRESS_GROW = 15;        // px a button grows while pressed
const SLIDESHOW_AUTO_GROW = 10;         // px the next button pulses on each auto-advance
const SLIDESHOW_BUTTON_DURATION = 600;  // ms for the grow / shrink
// Elastic-out (same curve as the nav's $ease-elastic)
const SLIDESHOW_ELASTIC = 'linear(0, 0.325, 0.601, 0.808, 0.945, 1.025, 1.061, 1.07, 1.063, 1.05, 1.034, 1.021, 1.011, 1.004, 1, 0.997, 0.997, 0.997, 0.998, 0.998, 0.999, 0.999, 1, 1, 1)';

// ---------------------------------------------------------------
// Shared button grow (slideshow arrows, before/after grip + buttons)
// ---------------------------------------------------------------
// Grow a button by `px` (0 = back to normal), elastic-out
function growTo(btn, px) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const m = getComputedStyle(btn).transform;
  const from = m && m !== 'none' ? new DOMMatrixReadOnly(m).a : 1;
  const size = btn.offsetWidth || 1;
  btn.animate([{ transform: `scale(${from})` }, { transform: `scale(${(size + px) / size})` }], {
    duration: reduced ? 0 : SLIDESHOW_BUTTON_DURATION,
    easing: SLIDESHOW_ELASTIC,
    fill: 'forwards',
  });
}

// Hover grows a little, press grows more, release settles back
function addGrowInteractions(target, face = target) {
  let hovered = false;
  target.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    hovered = true;
    growTo(face, SLIDESHOW_HOVER_GROW);
  });
  target.addEventListener('pointerleave', () => {
    hovered = false;
    growTo(face, 0);
  });
  target.addEventListener('pointerdown', () => growTo(face, SLIDESHOW_PRESS_GROW));
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) =>
    target.addEventListener(type, () => growTo(face, hovered ? SLIDESHOW_HOVER_GROW : 0))
  );
  target.addEventListener('click', (e) => {
    if (e.detail === 0) {
      // keyboard press: grow + shrink
      growTo(face, SLIDESHOW_PRESS_GROW);
      setTimeout(() => growTo(face, 0), SLIDESHOW_BUTTON_DURATION / 2);
    }
  });
}

function startSlideshow(show, track, slides, prevBtn, nextBtn) {
  const count = slides.length;
  if (count < 2) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  track.style.setProperty('--slide-duration', `${reduced ? 0 : SLIDESHOW_SCROLL_DURATION}ms`);
  track.style.setProperty('--slide-ease', SLIDESHOW_EASE);

  // A copy of the first slide at the end lets the last → first step keep
  // scrolling the same direction; once it lands we jump back to the real first.
  const loopClone = slides[0].cloneNode(true);
  loopClone.setAttribute('aria-hidden', 'true');
  loopClone.inert = true;
  track.append(loopClone);

  let index = 0;

  const place = (i, animate) => {
    track.classList.toggle('is-instant', !animate);
    track.style.transform = `translateX(${-i * 100}%)`;
    if (!animate) track.getBoundingClientRect(); // apply the jump before any next animation
  };

  const markCurrent = () => {
    const real = index % count;
    slides.forEach((slide, i) => slide.setAttribute('aria-hidden', i === real ? 'false' : 'true'));
  };

  const go = (step) => {
    if (step > 0 && index >= count) place((index = 0), false); // finish a pending loop jump
    if (step < 0 && index === 0) place((index = count), false); // jump to the copy, then scroll back
    index += step;
    place(index, true);
    markCurrent();
  };

  track.addEventListener('transitionend', (e) => {
    if (e.target === track && index >= count) place((index = 0), false);
  });

  // Auto-advance pulse: grow, then settle back (to hover size if hovered)
  const pulse = (btn, px) => {
    growTo(btn, px);
    setTimeout(() => growTo(btn, btn.matches(':hover') ? SLIDESHOW_HOVER_GROW : 0), SLIDESHOW_BUTTON_DURATION / 2);
  };

  // ---- Autoplay (restarts after every manual press) ----
  let hovering = false;
  let timer;
  const schedule = () => {
    clearTimeout(timer);
    if (reduced) return;
    timer = setTimeout(() => {
      if (!show.isConnected) return; // slideshow removed (e.g. case study closed)
      if (!hovering && !document.hidden) {
        go(1);
        pulse(nextBtn, SLIDESHOW_AUTO_GROW);
      }
      schedule();
    }, SLIDESHOW_INTERVAL);
  };
  show.addEventListener('pointerenter', () => (hovering = true));
  show.addEventListener('pointerleave', () => (hovering = false));

  // ---- Buttons: same hover / press grow as the before/after buttons ----
  [
    [prevBtn, -1],
    [nextBtn, 1],
  ].forEach(([btn, step]) => {
    addGrowInteractions(btn);
    btn.addEventListener('click', () => {
      go(step);
      schedule();
    });
  });

  place(0, false);
  schedule();
}

// ---------------------------------------------------------------
// Before / after behaviour — tweak freely
// ---------------------------------------------------------------
const BA_GRIP_RANGE = 0.25;        // grip can move this far above/below the middle
                                   // (0.25 = stays within the middle half of the photo)
const BA_GRIP_PULL = 0.5;          // grip only goes this fraction of the way to the cursor,
                                   // like it's being pulled back to the middle (1 = all the way)
const BA_GRIP_STIFFNESS = 0.05;    // 0–1: how quickly the grip chases its target (lower = gentler)
const BA_GRIP_DAMPING = 0.74;      // 0–1: higher = more elastic overshoot (0.74 ≈ 4% overshoot, 0.68 = none)
const BA_GRIP_SQUASH = 0.04;       // how much thinner per px/frame of movement
const BA_GRIP_SQUASH_MAX = 0.35;   // never thinner than 65% of its width
const BA_SLIDE_DURATION = 900;     // ms for the Before/After buttons to slide the divider
// Divider follow: eases in and out with no bounce. Lower stiffness = slower and softer.
// Keep damping at or below ~0.68 for this stiffness, or it starts to overshoot.
const BA_DIVIDER_STIFFNESS = 0.05; // 0–1: how hard the divider is pulled towards the cursor
const BA_DIVIDER_DAMPING = 0.66;   // 0–1: higher = faster settle, but too high adds bounce
// Hover / press / grow timing reuse the SLIDESHOW_* values above.

function startBeforeAfter(compare, { range, grip, beforeBtn, afterBtn }) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const face = grip.querySelector('.before-after__grip-face');
  let pos = 50; // divider, % from the left

  const setPos = (value) => {
    pos = Math.max(0, Math.min(100, value));
    compare.style.setProperty('--pos', `${pos}%`);
    range.value = String(Math.round(pos));
  };

  // ---- Divider: drag anywhere on the photo (or the grip) ----
  let dragging = false;
  let slideAnim = null;
  const posFromEvent = (e) => {
    const r = compare.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * 100;
  };

  // Spring: while you're dragging, the divider is constantly pulled towards the cursor
  let divTarget = pos;
  let divSpeed = 0;
  let divRunning = false;
  const divTick = () => {
    divSpeed += (divTarget - pos) * BA_DIVIDER_STIFFNESS;
    divSpeed *= BA_DIVIDER_DAMPING;
    if (Math.abs(divTarget - pos) < 0.02 && Math.abs(divSpeed) < 0.02) {
      setPos(divTarget);
      divSpeed = 0;
      divRunning = false;
      return;
    }
    setPos(pos + divSpeed);
    requestAnimationFrame(divTick);
  };
  const pullTo = (target) => {
    cancelAnimationFrame(slideAnim); // a drag takes over from a Before/After slide
    divTarget = Math.max(0, Math.min(100, target));
    if (reduced) return setPos(divTarget);
    if (!divRunning) {
      divRunning = true;
      requestAnimationFrame(divTick);
    }
  };

  compare.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.before-after__tag') || e.button !== 0) return;
    dragging = true;
    // Capture on the grip if that's what was grabbed, so it keeps its pressed size
    (e.target.closest('.before-after__grip') || compare).setPointerCapture(e.pointerId);
    pullTo(posFromEvent(e));
  });
  compare.addEventListener('pointermove', (e) => {
    if (dragging) pullTo(posFromEvent(e));
  });
  ['pointerup', 'pointercancel'].forEach((type) => compare.addEventListener(type, () => (dragging = false)));

  // Keyboard (arrow keys on the hidden range input)
  range.addEventListener('input', () => {
    divTarget = Number(range.value);
    setPos(divTarget);
  });

  // ---- Before / After buttons slide the divider all the way (expo-out) ----
  function slideTo(target, ms = BA_SLIDE_DURATION) {
    cancelAnimationFrame(slideAnim);
    target = Math.max(0, Math.min(100, target));
    divTarget = target; // so the spring doesn't pull it back afterwards
    divSpeed = 0;
    const start = pos;
    const t0 = performance.now();
    const duration = reduced ? 1 : ms;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // expo-out
      setPos(start + (target - start) * eased);
      if (t < 1) slideAnim = requestAnimationFrame(step);
    };
    slideAnim = requestAnimationFrame(step);
  }
  beforeBtn.addEventListener('click', () => slideTo(100)); // whole before image
  afterBtn.addEventListener('click', () => slideTo(0)); // whole after image
  addGrowInteractions(beforeBtn);
  addGrowInteractions(afterBtn);

  // ---- Grip: grows on hover/press, follows the cursor up/down ----
  addGrowInteractions(grip, face);

  let gripY = 0; // px from the middle
  let gripSpeed = 0;
  let gripTarget = 0;
  let running = false;

  const tick = () => {
    gripSpeed += (gripTarget - gripY) * BA_GRIP_STIFFNESS;
    gripSpeed *= BA_GRIP_DAMPING;
    gripY += gripSpeed;

    const squash = Math.min(BA_GRIP_SQUASH_MAX, Math.abs(gripSpeed) * BA_GRIP_SQUASH);
    compare.style.setProperty('--grip-y', `${gripY.toFixed(2)}px`);
    grip.style.scale = `${(1 - squash).toFixed(3)} 1`;

    if (Math.abs(gripTarget - gripY) < 0.1 && Math.abs(gripSpeed) < 0.1) {
      gripY = gripTarget;
      compare.style.setProperty('--grip-y', `${gripY}px`);
      grip.style.scale = '';
      running = false;
      return;
    }
    requestAnimationFrame(tick);
  };
  const follow = (target) => {
    gripTarget = target;
    if (reduced) {
      gripY = target;
      compare.style.setProperty('--grip-y', `${target}px`);
      return;
    }
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  };

  compare.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' && !dragging) return;
    const r = compare.getBoundingClientRect();
    const fromMiddle = e.clientY - (r.top + r.height / 2);
    const limit = r.height * BA_GRIP_RANGE;
    follow(Math.max(-limit, Math.min(limit, fromMiddle * BA_GRIP_PULL)));
  });
  compare.addEventListener('pointerleave', () => {
    if (!dragging) follow(0); // drift back to the middle
  });
  ['pointerup', 'pointercancel'].forEach((type) =>
    compare.addEventListener(type, (e) => {
      if (e.pointerType === 'touch') follow(0);
    })
  );
}

function renderBlock(block) {
  const render = BLOCKS[block?.type];
  if (!render) {
    console.warn('Unknown block type in project JSON:', block);
    return null;
  }
  return render(block);
}

function renderSection(section) {
  return el(
    'section',
    { className: 'project-section' },
    section.header ? el('h3', { className: 'project-section__header' }, section.header) : null,
    (section.blocks || []).map(renderBlock)
  );
}

