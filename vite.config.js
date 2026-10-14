import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// GitHub Pages serves this project from https://<user>.github.io/CS1710-Dashboard-Prototypes/.
// The deploy workflow sets BASE_PATH to that subpath; local dev and preview leave it empty.
const base = process.env.BASE_PATH ?? '';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Every route is prerendered to static HTML (see src/routes/+layout.js).
			// 404.html lets GitHub Pages show SvelteKit's error page for unknown paths.
			adapter: adapter({ fallback: '404.html' }),

			paths: { base }
		})
	]
});
