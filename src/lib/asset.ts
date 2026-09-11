/**
 * Resolve a file from public/ against the app's base URL.
 * Dev/local build → '/logo.png'
 * GitHub Pages    → '/scitech-learning/logo.png'
 * (plain absolute paths like '/logo.png' break on the Pages subpath)
 */
export const asset = (path: string): string => {
  const base = import.meta.env.BASE_URL || '/';
  return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
};
