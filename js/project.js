// Standalone case study page: project.html?id=<project id>
// (rendering lives in js/project-render.js, loading in js/project-data.js)

// ---------------------------------------------------------------
// Page
// ---------------------------------------------------------------
async function renderProject() {
  const title = document.getElementById('project-title');
  const date = document.getElementById('project-date');
  const sections = document.getElementById('project-sections');
  const id = new URLSearchParams(location.search).get('id') || '';

  try {
    const project = await loadProject(id);
    document.title = `${project.title} — Spencer Anderson`;
    title.textContent = project.title;
    date.textContent = formatProjectDate(project.date);
    sections.replaceChildren(...(project.sections || []).map(renderSection));
  } catch (err) {
    console.error(err);
    title.textContent = 'Project not found';
    date.textContent = '';
    sections.replaceChildren(el('p', {}, 'This project couldn’t be loaded. ', el('a', { href: 'projects.html' }, 'See all projects')));
  }
}

// Close (×): go back if we came from the projects list (keeps your scroll
// position), otherwise open the list.
document.querySelector('.project-close')?.addEventListener('click', (e) => {
  const cameFromList = document.referrer && new URL(document.referrer).pathname.endsWith('/projects.html');
  if (cameFromList && history.length > 1) {
    e.preventDefault();
    history.back();
  }
});

renderProject();
