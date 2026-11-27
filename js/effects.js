// Adds the edge-blur layers (see scss/_card.scss) to every glass element,
// so the HTML stays clean. Each element gets:
//   <div class="edge-blur"><div></div><div></div><div></div><div></div></div>
const EDGE_BLUR_LAYERS = 4;
const EDGE_BLUR_TARGETS = '.card, .nav__pill, .project-close';

// Call addEdgeBlur(container) after adding new cards to the page
function addEdgeBlur(root = document) {
  root.querySelectorAll(EDGE_BLUR_TARGETS).forEach((target) => {
    if (target.querySelector(':scope > .edge-blur')) return;

    const wrap = document.createElement('div');
    wrap.className = 'edge-blur';
    wrap.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < EDGE_BLUR_LAYERS; i++) {
      wrap.appendChild(document.createElement('div'));
    }
    target.prepend(wrap);
  });
}

addEdgeBlur();
