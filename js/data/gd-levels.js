// ===============================================================
// Geometry Dash levels shown on the About page
// ---------------------------------------------------------------
// Edit, add, remove or reorder levels here; the page updates on refresh.
// Each level is one { ... } block, separated by commas.
//
//   name        – level title
//   enjoyment   – GDDL enjoyment score (out of 10)
//   downloads   – number of downloads (commas are added automatically)
//   rank        – difficulty rank
//   preview     – path to a video (.webm / .mp4) or image (.gif / .png / .jpg)
//                 e.g. 'media/About_me_media/Pipe_dream_preview.webm'
//                 For a fallback, list several videos and the browser plays the
//                 first one it supports: ['media/.../clip.webm', 'media/.../clip.mp4']
//                 Leave as '' to show the "Animated Preview" placeholder.
// ===============================================================

const GD_LEVELS = [
  {
    name: 'Pipe Dream',
    enjoyment: 9,
    downloads: 275000,
    rank: 2800,
    preview: 'media/About_me_media/Pipe_dream_preview.webm',
  },
  {
    name: 'From the start',
    enjoyment: 8,
    downloads: 232000,
    rank: 2000,
    preview: 'media/About_me_media/From_the_start_Preview.webm',
  },
  {
    name: 'Purgatory',
    enjoyment: 7,
    downloads: 116000,
    rank: 2200,
    preview: 'media/About_me_media/Purgatory_preview.webm',
  },
];
