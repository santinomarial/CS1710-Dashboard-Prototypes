<script>
	import * as d3 from 'd3';
	import { INDUSTRIES, fmtCount, fmtPct, sum } from '#lib/data.js';

	/**
	 * Employment counts computed from the same flows table as the flow diagram,
	 * so filtering here is a true recount. The chart never filters by its own
	 * dimension: it keeps every bar and highlights the selected one.
	 */
	let { flows, sel, occupations, occupationIndustry, compact = false } = $props();

	let mode = $state('industry');

	// Industry view ignores industry/occupation; occupation view still respects
	// a chosen industry so it lists only that industry's occupations.
	let ignore = $derived(mode === 'industry' ? ['industry', 'occupation'] : ['occupation']);
	let base = $derived(flows.filter((r) => sel.matches(r, ignore)));
	let denominator = $derived(sum(base));

	let items = $derived.by(() => {
		const counts = d3.rollup(base, sum, (r) => r[mode]);
		const cats =
			mode === 'industry'
				? INDUSTRIES
				: occupations.filter((o) => !sel.industry || occupationIndustry.get(o) === sel.industry);
		return cats
			.map((cat) => ({ cat, count: counts.get(cat) ?? 0 }))
			.sort((a, b) => b.count - a.count || cats.indexOf(a.cat) - cats.indexOf(b.cat));
	});

	let selectedValue = $derived(sel[mode]);

	const W = 560;
	const LABEL_W = 210;
	const VALUE_W = 110;
	let rowH = $derived(compact ? 19 : 24);
	let H = $derived(items.length * rowH + 4);
	let x = $derived(
		d3.scaleLinear()
			.domain([0, d3.max(items, (d) => d.count) || 1])
			.range([0, W - LABEL_W - VALUE_W])
	);

	function tip(event, d) {
		sel.hover = { key: mode, value: d.cat };
		const lines = [
			`${fmtCount(d.count)} synthetic graduates`,
			`${fmtPct(d.count, denominator)} of ${fmtCount(denominator)} in scope`,
			`Scope: ${sel.describe(ignore)}`
		];
		if (mode === 'occupation') lines.unshift(`Industry: ${occupationIndustry.get(d.cat)}`);
		lines.push('Click to select');
		sel.showTip(event, d.cat, lines, 'flows table');
	}

	function onKey(event, d) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			sel.toggle(mode, d.cat);
		}
	}
</script>

<figure class="chart">
	<div class="chart-head">
		<h2>Where they work</h2>
		<div class="seg" role="group" aria-label="Group employment by">
			<button aria-pressed={mode === 'industry'} onclick={() => (mode = 'industry')}>Industry</button>
			<button aria-pressed={mode === 'occupation'} onclick={() => (mode = 'occupation')}>Occupation</button>
		</div>
	</div>
	<p class="caption">
		Share of <strong>{fmtCount(denominator)}</strong> synthetic international graduates in scope:
		{sel.describe(ignore)}.
		{#if mode === 'occupation' && sel.industry}Showing occupations within {sel.industry}.{/if}
		<span class="synthetic-tag">Synthetic</span>
	</p>

	{#if denominator === 0}
		<p class="empty">No synthetic records match the current selection.</p>
	{:else}
		<svg viewBox="0 0 {W} {H}" role="img" aria-label="Bar chart of synthetic graduates by {mode}">
			{#each items as d, i (d.cat)}
				{@const y = i * rowH}
				{@const isSel = selectedValue === d.cat}
				{@const dim = selectedValue !== null && !isSel}
				<g
					role="button"
					tabindex="0"
					aria-pressed={isSel}
					aria-label="{d.cat}: {fmtCount(d.count)}, {fmtPct(d.count, denominator)}. Select."
					class="row"
					opacity={dim ? 0.4 : 1}
					onclick={(e) => { sel.toggle(mode, d.cat); tip(e, d); }}
					onkeydown={(e) => onKey(e, d)}
					onmousemove={(e) => tip(e, d)}
					onmouseleave={() => sel.hideTip()}
				>
					<rect class="hit" x="0" {y} width={W} height={rowH} />
					<text x={LABEL_W - 8} y={y + rowH / 2} dy="0.35em" text-anchor="end" class="label" class:bold={isSel}
						font-size={compact ? 11 : 12}>{d.cat}</text
					>
					<rect
						x={LABEL_W}
						y={y + rowH * 0.18}
						width={Math.max(x(d.count), d.count > 0 ? 2 : 0)}
						height={rowH * 0.64}
						rx="3"
						style:fill={isSel ? 'var(--bar-selected)' : 'var(--bar)'}
					/>
					<text x={LABEL_W + x(d.count) + 6} y={y + rowH / 2} dy="0.35em" class="value" font-size={compact ? 10.5 : 11.5}>
						{fmtCount(d.count)} · {fmtPct(d.count, denominator)}
					</text>
				</g>
			{/each}
		</svg>
	{/if}
</figure>

<style>
	.row {
		cursor: pointer;
		outline: none;
	}

	.hit {
		fill: transparent;
	}

	.row:hover .hit,
	.row:focus-visible .hit {
		fill: var(--hover-wash);
	}

	.label {
		fill: var(--text-primary);
	}

	.bold {
		font-weight: 700;
	}

	.value {
		fill: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.empty {
		color: var(--text-muted);
		font-size: 0.875rem;
	}
</style>
