// Uses the `lenis` instance created in main.js (load this file after main.js)

// ---------------------------------------------------------------
// Nav scroll animation: nudges the nav up/down based on Lenis's scroll
// velocity. A spring makes it lag behind, build up to full displacement,
// then bounce gently back into place when scrolling stops.
const NAV_STRENGTH = 1;     // how much velocity moves the nav (flip the sign to reverse direction)
const NAV_MAX_SHIFT = 10;   // max movement in px
const NAV_STIFFNESS = 0.15; // spring pull, 0–1: lower = slower to reach the target
const NAV_DAMPING = 0.5;   // 0–1: lower = settles faster, higher = more bounce
// ---------------------------------------------------------------

const nav = document.querySelector('.nav');
let navShift = 0; // current position (px)
let navSpeed = 0; // current spring velocity

function animateNav() {
  if (nav) {
    const target = Math.max(-NAV_MAX_SHIFT, Math.min(NAV_MAX_SHIFT, -lenis.velocity * NAV_STRENGTH));

    // Spring: accelerate toward the target, then lose some speed each frame
    navSpeed += (target - navShift) * NAV_STIFFNESS;
    navSpeed *= NAV_DAMPING;
    navShift += navSpeed;

    if (Math.abs(navShift) < 0.01 && Math.abs(navSpeed) < 0.01) {
      navShift = 0;
      navSpeed = 0;
    }
    nav.style.transform = `translate3d(0, ${navShift.toFixed(2)}px, 0)`;
  }
  requestAnimationFrame(animateNav);
}

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  requestAnimationFrame(animateNav);
}

// ---------------------------------------------------------------
// Compact nav: when scrolling down, the HOME pill morphs into a small
// centered "Spencer Anderson" pill and the links pill slides to the center
// and shrinks away. Scrolling up, or tapping the small pill, expands it again.
const NAV_COMPACT_AFTER = 120;  // never shrink in the first 120px of the page
const NAV_SHRINK_DISTANCE = 30; // px scrolled down before it shrinks
const NAV_EXPAND_DISTANCE = 10; // px scrolled up before it expands
// ---------------------------------------------------------------

const navHome = document.querySelector('.nav__home');
const navLinks = document.querySelector('.nav__links');
let navIsCompact = false;
let scrollAnchor = 0; // where the current scroll direction started

// Measure the sizes the CSS animates between (re-run on resize).
// Labels may be mid-scale, so their scale is divided back out.
function naturalWidth(el) {
  const scale = parseFloat(getComputedStyle(el).scale) || 1;
  return el.getBoundingClientRect().width / scale;
}

function measureNav() {
  if (!nav || !navHome || !navLinks) return;
  const full = navHome.querySelector('.nav__label--full');
  const compact = navHome.querySelector('.nav__label--compact');
  if (!full || !compact) return;

  const homeStyle = getComputedStyle(navHome);
  const fullPadX = parseFloat(homeStyle.paddingLeft) + parseFloat(homeStyle.paddingRight);
  const compactPadX = (parseFloat(getComputedStyle(nav).getPropertyValue('--compact-pad-x')) || 20) * 2;

  const fullWidth = Math.ceil(naturalWidth(full) + fullPadX);
  const compactWidth = Math.ceil(naturalWidth(compact) + compactPadX);

  // Distance that moves the links pill's center to the nav's center
  const linksShift = navLinks.offsetWidth / 2 - nav.offsetWidth / 2;

  nav.style.setProperty('--home-full-w', `${fullWidth}px`);
  nav.style.setProperty('--home-compact-w', `${compactWidth}px`);
  // Distance that moves the links pill's center onto the × button (case study overlay)
  const closeWidth = parseFloat(getComputedStyle(nav).getPropertyValue('--close-w')) || 72;
  const linksShiftClose = navLinks.offsetWidth / 2 - closeWidth / 2;

  nav.style.setProperty('--links-shift', `${linksShift}px`);
  nav.style.setProperty('--links-shift-close', `${linksShiftClose}px`);
  nav.classList.add('is-measured');
}

function setNavCompact(compact) {
  if (!nav || compact === navIsCompact) return;
  navIsCompact = compact;
  nav.classList.toggle('is-compact', compact);

  // Hidden links can't be clicked / tabbed to; HOME's label matches what it shows
  if (navLinks) navLinks.inert = compact;
  navHome?.setAttribute('aria-label', compact ? 'Spencer Anderson, show navigation' : 'Home');
}

lenis.on('scroll', ({ scroll }) => {
  if (scroll <= NAV_COMPACT_AFTER) {
    setNavCompact(false);
    scrollAnchor = scroll;
    return;
  }

  const moved = scroll - scrollAnchor;
  if (moved > NAV_SHRINK_DISTANCE) {
    setNavCompact(true);
    scrollAnchor = scroll;
  } else if (moved < -NAV_EXPAND_DISTANCE) {
    setNavCompact(false);
    scrollAnchor = scroll;
  }

  // Keep the anchor at the furthest point in the current direction
  if (navIsCompact ? scroll > scrollAnchor : scroll < scrollAnchor) {
    scrollAnchor = scroll;
  }
});

// Tapping the small pill only expands the nav (it doesn't follow the link).
// Capture phase so this runs before the Home scroll-to-top in main.js.
navHome?.addEventListener(
  'click',
  (e) => {
    if (!navIsCompact) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    setNavCompact(false);
    scrollAnchor = lenis.scroll;
  },
  { capture: true }
);

document.fonts.ready.then(measureNav);
let navResizeFrame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(navResizeFrame);
  navResizeFrame = requestAnimationFrame(measureNav);
});
