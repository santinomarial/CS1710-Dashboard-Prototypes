# Dashboard Prototypes (CS 1710)

## Stack
- SvelteKit 3 with `@sveltejs/adapter-static`, Svelte 5 runes (`$state`, `$derived`, `$props`, `onclick`), D3 v7, npm. `#lib` alias, D3 for scales/layout math, Svelte `{#each}` for marks.
- One app, two routes: `/prototype-1` (exploration-first) and `/prototype-2` (comparison-first). Each route creates its own `Selection`, so the two never share state.

## Data rules
- All data is synthetic (`data/generate_synthetic.js`, seed 1710). Keep the banner, the "Synthetic" tags and the tooltip label on every view.
- The flows and salaries tables are independent. Never filter or recompute salaries by origin, industry or occupation; highlight related fields from the flows table instead.
- Never average medians across degree levels or fields for display.
- Every percentage must show its denominator.

## Deployment
- GitHub Pages via `.github/workflows/deploy.yml`. `BASE_PATH` sets `paths.base`; links use `resolve()` and data uses `asset()` so both follow it.
- Every route is prerendered with trailing slashes (`src/routes/+layout.js`). Keep `static/.nojekyll`.

## Scope
- Assignment prototype, not production architecture.
