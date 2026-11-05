// Loads Google Fonts stylesheets only for the family actually selected.
// The default app font is the system font stack, so a fresh install makes no
// font requests at all during startup.
const FONT_QUERIES = {
  Inter: 'Inter:wght@100..900',
  Roboto: 'Roboto:wght@100;300;400;500;700;900',
  Lato: 'Lato:wght@100;300;400;700',
  Montserrat: 'Montserrat:wght@100..900',
  'Open Sans': 'Open Sans:wght@300..800',
  Oswald: 'Oswald:wght@200..700',
  'Playfair Display': 'Playfair Display:ital,wght@0,400..900;1,400..900',
  Raleway: 'Raleway:wght@100..900',
};

const loadedFamilies = new Set();

export function ensureFontFamilyLoaded(family) {
  if (typeof document === 'undefined') return;
  if (!family || family === 'sans' || loadedFamilies.has(family)) return;

  const query = FONT_QUERIES[family];
  if (!query) return;

  loadedFamilies.add(family);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${query.replace(/ /g, '+')}&display=swap`;
  link.dataset.appFont = family;
  link.addEventListener('error', () => {
    loadedFamilies.delete(family);
    link.remove();
  });
  document.head.appendChild(link);
}
