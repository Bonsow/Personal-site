// Smooth scrolling
// lerp = how quickly the scroll catches up each frame (Lenis default is 0.1).
// Higher = snappier / less smoothing. 0.2 = about half the smoothing.
const lenis = new Lenis({ autoRaf: true, lerp: 0.2 });

// Home button: on the home page (href="#top") smooth-scroll back to the top.
// On other pages it's a normal link to index.html.
document.querySelector('.nav__home[href^="#"]')?.addEventListener('click', (e) => {
  e.preventDefault();
  lenis.scrollTo(0);
});

// ---------------------------------------------------------------
// Name sizing: makes the name exactly a set % of the screen width.
// Change these to adjust.
const NAME_WIDTH_DESKTOP = 0.5; // 50% of screen width at 1024px and up
const NAME_WIDTH_MOBILE = 0.9;  // 90% below that
const DESKTOP_BREAKPOINT = 1024;
// ---------------------------------------------------------------

const heroInner = document.querySelector('.hero__inner');
const heroName = document.querySelector('.hero__name-text');

function fitName() {
  if (!heroInner || !heroName) return;

  // Measure the name's real text width at a known size…
  heroInner.style.setProperty('--name-size', '100px');
  const range = document.createRange();
  range.selectNodeContents(heroName);
  const widthAt100 = range.getBoundingClientRect().width;
  if (!widthAt100) return;

  // …then scale it so it matches the target width exactly.
  const screenWidth = document.documentElement.clientWidth;
  const share = screenWidth >= DESKTOP_BREAKPOINT ? NAME_WIDTH_DESKTOP : NAME_WIDTH_MOBILE;
  const size = (100 * screenWidth * share) / widthAt100;

  heroInner.style.setProperty('--name-size', `${size}px`);
}

// ---------------------------------------------------------------
// Particles inside the name. Change these to adjust the look.
// (The blue behind them is $color-primary in _variables.scss.)
// Particle color comes from $color-background in _variables.scss
const PARTICLE_COLOR =
  getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim() || '#ffffff';
const PARTICLE_DENSITY = 300;   // particles per 1920×1080 area of canvas
const PARALLAX_SPEED = 0.5;     // particles scroll at 50% of page speed
// ---------------------------------------------------------------

// Phones/tablets have no hover, so the cursor push is off there. That also
// keeps the particles from listening to touches while you scroll.
const CAN_HOVER = window.matchMedia('(hover: hover)').matches;

async function initNameParticles() {
  if (!window.tsParticles) return;

  await loadSlim(tsParticles);
  await tsParticles.load({
    id: 'name-particles',
    options: {
      fullScreen: { enable: false },
      background: { color: 'transparent' },
      fpsLimit: 60,
      detectRetina: true,
      particles: {
        number: { value: PARTICLE_DENSITY, density: { enable: true, width: 1920, height: 1080 } },
        color: { value: PARTICLE_COLOR },
        size: { value: { min: 2, max: 8 } },
        opacity: { value: 1 },
        links: { enable: false },
        move: { enable: true, speed: 1.2, outModes: { default: 'bounce' } },
      },
      interactivity: {
        // Mouse: listen on the whole window (the text sits on top of the canvas).
        // Touch: only the canvas, which ignores touches (pointer-events: none).
        detectsOn: CAN_HOVER ? 'window' : 'canvas',
        events: { onHover: { enable: CAN_HOVER, mode: 'repulse' } },
        modes: { repulse: { distance: 100 } },
      },
    },
  });
}

// Wait for Outfit to load so we measure the right font, size the name,
// then start the particles inside it. Refit on resize.
// ---------------------------------------------------------------
// Letter mask: draws the name onto a canvas and uses it as a mask on the
// particle layer, so particles only show inside the letters (any background).
// ---------------------------------------------------------------
const heroTitle = document.querySelector('.hero__name');
const particleWindow = document.querySelector('.hero__particles');

function buildNameMask() {
  if (!heroTitle || !heroName || !particleWindow) return;

  const box = particleWindow.getBoundingClientRect();
  if (!box.width || !box.height) return;

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(box.width * dpr);
  canvas.height = Math.ceil(box.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const style = getComputedStyle(heroName);
  const fontSize = parseFloat(style.fontSize);
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 0.85;
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';

  heroName.querySelectorAll(':scope > span').forEach((line) => {
    const text = line.textContent.trim().toUpperCase();
    const range = document.createRange();
    range.selectNodeContents(line);
    const textBox = range.getBoundingClientRect();
    const lineBox = line.getBoundingClientRect();

    // Same maths CSS uses to place text inside a line box (half-leading)
    const m = ctx.measureText(text);
    const ascent = m.fontBoundingBoxAscent;
    const descent = m.fontBoundingBoxDescent;
    const baseline = lineBox.top - box.top + (lineHeight - (ascent + descent)) / 2 + ascent;

    ctx.fillText(text, textBox.left - box.left, baseline);
  });

  const url = `url(${canvas.toDataURL()})`;
  particleWindow.style.webkitMaskImage = url;
  particleWindow.style.maskImage = url;
  heroTitle.classList.add('is-masked');
}

document.fonts.ready.then(() => {
  fitName();
  buildNameMask();
  initNameParticles();
});

// Only refit when the width changes. Phone browsers fire "resize" whenever
// their toolbar slides in/out during a scroll, and re-measuring the name in
// the middle of a touch scroll made Safari jump back to the top.
let resizeFrame;
let lastWidth = document.documentElement.clientWidth;
window.addEventListener('resize', () => {
  const width = document.documentElement.clientWidth;
  if (width === lastWidth) return;
  lastWidth = width;
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    fitName();
    buildNameMask();
  });
});

// ---------------------------------------------------------------
// Parallax: as the page scrolls, push the particles back down by part of
// the scroll distance so they move slower than the name.
const particleCanvas = document.querySelector('.hero__particles-canvas');

function updateParallax(scroll) {
  if (!particleCanvas) return;
  const offset = scroll * (1 - PARALLAX_SPEED);
  particleCanvas.style.transform = `translate3d(0, ${offset}px, 0)`;
}

lenis.on('scroll', ({ scroll }) => updateParallax(scroll));
updateParallax(lenis.scroll);

