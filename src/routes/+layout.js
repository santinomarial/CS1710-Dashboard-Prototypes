// Prerender every page to static HTML for GitHub Pages. With trailing slashes,
// each route becomes its own folder (prototype-1/index.html), so both URLs
// work directly and can be shared.
export const prerender = true;
export const trailingSlash = 'always';
