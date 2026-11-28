// ===============================================================
// TEST: ember-style particles behind the about page, with scroll parallax.
// To remove: delete this file and the 3 lines marked "TEST PARTICLES"
// in about.html.
// ===============================================================

// ---- Settings ---------------------------------------------------
// Look
const TP_SIZE_MIN = 5;             // px across
const TP_SIZE_MAX = 15;            // px across
const TP_BASE_LIGHTEN = 0.3;       // 0–1: base colour = accent mixed this much towards white
const TP_OPACITY = 1;             // fully solid (was a 0.35–0.85 range)

// Embers
const TP_COUNT = 45;               // particles per 1920×1080 area, spread over the whole screen
const TP_RISE_SPEED = { min: 0.3, max: 1 };   // starting upward speed (halved)
const TP_RISE_ACCEL = 0.3;         // they speed up as they rise, like heat carrying them (halved)
const TP_MAX_SPEED = 1.5;          // (halved)
const TP_WOBBLE = 18;              // px of side-to-side turbulence

// Cursor
const TP_CURSOR_PUSH_DISTANCE = 110; // px — how close before they move away
const TP_CURSOR_PUSH = 0.4;         // how strongly they move away (keep it light)
const TP_CURSOR_LIGHT_DISTANCE = 240; // px — range of the lighter glow (bigger = smoother falloff)
const TP_CURSOR_LIGHTEN = 1;        // 0–1: how light they get near the cursor (1 = white, for testing)
const TP_CURSOR_FADE = 1.2;         // seconds to ease in/out of the lighter colour

// Scroll
const TP_PARALLAX = 0.35;          // 0–1: how far the biggest particles move with the page
                                   // while scrolling (smaller ones move less = feel farther away)
const TP_PARALLAX_SMOOTHING = 0.2; // 0–1: share of the remaining shift applied each frame.
                                   // Lower = smoother but floatier, 1 = no smoothing (old behaviour)
// -----------------------------------------------------------------

(async () => {
  if (!window.tsParticles || typeof loadFull !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Accent colour from the SCSS ($color-primary → --color-primary)
  const accent =
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#0077ff';

  // Mix a hex colour towards white
  function lighten(hex, amount) {
    const n = parseInt(hex.replace('#', ''), 16);
    const mix = (c) => Math.round(c + (255 - c) * amount);
    const r = mix((n >> 16) & 255);
    const g = mix((n >> 8) & 255);
    const b = mix(n & 255);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }

  const baseColor = lighten(accent, TP_BASE_LIGHTEN);
  const glowColor = lighten(accent, TP_CURSOR_LIGHTEN);

  await loadFull(tsParticles);
  const container = await tsParticles.load({
    id: 'test-particles',
    options: {
      // Not tsParticles' own full-screen mode: that canvas resizes whenever a
      // phone's address bar slides in/out mid-scroll, and every resize rescales
      // all particle positions (they jump) and adds/removes particles.
      // The #test-particles box in about.html is fixed behind the page at
      // 100lvh (the tallest the screen gets), so its size never changes.
      fullScreen: { enable: false },
      background: { color: 'transparent' },
      fpsLimit: 60,
      detectRetina: true,

      particles: {
        // Spread over the whole screen; ones that float off the top come back in at the bottom
        number: { value: TP_COUNT, density: { enable: true, width: 1920, height: 1080 } },
        color: { value: baseColor },
        shape: { type: 'circle' },
        // tsParticles sizes are a radius, so halve the "px across" values
        size: { value: { min: TP_SIZE_MIN / 2, max: TP_SIZE_MAX / 2 } },

        // Steady opacity (no animation, so the cursor glow can't fight it and flicker)
        opacity: { value: TP_OPACITY },

        move: {
          enable: true,
          direction: 'top',
          speed: TP_RISE_SPEED,
          random: true,
          straight: false,
          // Upward "gravity" so they accelerate as they rise
          gravity: { enable: true, inverse: true, acceleration: TP_RISE_ACCEL, maxSpeed: TP_MAX_SPEED },
          outModes: { default: 'out' },
        },

        // Turbulence: side-to-side wobble while rising
        wobble: { enable: true, distance: TP_WOBBLE, speed: { min: -5, max: 5 } },
      },

      interactivity: {
        detectsOn: 'window', // page content sits on top, so listen on the whole window
        events: {
          onHover: { enable: true, mode: ['repulse', 'bubble'] },
        },
        modes: {
          repulse: {
            distance: TP_CURSOR_PUSH_DISTANCE,
            speed: TP_CURSOR_PUSH,
            factor: 20,
            easing: 'ease-out-quad',
          },
          // "bubble" here only changes colour: lighter the closer they are,
          // fading smoothly across TP_CURSOR_LIGHT_DISTANCE
          bubble: {
            distance: TP_CURSOR_LIGHT_DISTANCE,
            color: glowColor,
            duration: TP_CURSOR_FADE,
            mix: true,
          },
        },
      },
    },
  });

  // ---- Scroll parallax (driven by Lenis) ----------------------------
  // Each scroll step nudges the particles the same way as the page, scaled
  // by their size. Particles leaving the screen wrap to the other side.
  if (!container || typeof lenis === 'undefined' || typeof container.particles?.filter !== 'function') return;

  // Phones send scroll updates late and in bursts, which made the particles
  // hold still then hop. Instead of applying each scroll step at once, it's
  // added to a "still to move" amount that's eased out over the next frames.
  const maxRadius = TP_SIZE_MAX / 2;
  let lastScroll = lenis.scroll;
  let pending = 0;      // px of parallax shift not applied yet
  let running = false;

  const shiftParticles = (amount) => {
    container.particles
      .filter(() => true)
      .forEach((particle) => {
        const depth = particle.getRadius() / maxRadius; // 0.33 – 1
        particle.position.y -= amount * depth;
      });
  };

  const tick = () => {
    const step = Math.abs(pending) < 0.05 ? pending : pending * TP_PARALLAX_SMOOTHING;
    pending -= step;
    shiftParticles(step);
    if (pending !== 0) requestAnimationFrame(tick);
    else running = false;
  };

  lenis.on('scroll', ({ scroll }) => {
    const delta = scroll - lastScroll;
    lastScroll = scroll;
    if (!delta) return;

    pending += delta * TP_PARALLAX;
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  });
})();
