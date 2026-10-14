<script>
	import * as d3 from 'd3';
	import { ORIGINS, FIELDS, INDUSTRIES, originColor, fmtCount, fmtPct, sum } from '#lib/data.js';

	/**
	 * Parallel sets: origin -> field -> industry, from the synthetic flows table.
	 * The layout always shows the full degree scope as context. Clicked
	 * selections are drawn as a colored overlay inside each ribbon, so the
	 * highlighted width is the matching share of that ribbon — never a resize.
	 */
	let { flows, sel, compact = false } = $props();

	// The compact strip spans a full-width row, so it gets a wider canvas to keep text at ~1:1.
	let W = $derived(compact ? 1400 : 900);
	let H = $derived(compact ? 300 : 540);
	let M = $derived({ top: compact ? 26 : 34, right: compact ? 250 : 275, bottom: 8, left: compact ? 150 : 180 });
	const NW = 12; // node width

	let scoped = $derived(flows.filter((r) => sel.degree === 'All' || r.degree === sel.degree));
	let subset = $derived(scoped.filter((r) => sel.matches(r)));
	let total = $derived(sum(scoped));
	let anySel = $derived(sel.active.length > 0);

	// Matching count per node, so labels can read "matched of total" during a selection.
	let matched = $derived(new Map(['origin', 'field', 'industry'].map((k) => [k, d3.rollup(subset, sum, (r) => r[k])])));
	const matchOf = (n) => matched.get(n.key).get(n.cat) ?? 0;

	let layout = $derived.by(() => {
		if (total === 0) return null;
		const pad = compact ? 5 : 10;
		// Middle column sits left of center in the large view so field labels clear the industry nodes.
		const xs = [M.left, M.left + (W - M.right - NW - M.left) * (compact ? 0.5 : 0.36), W - M.right - NW];
		const innerH = H - M.top - M.bottom;

		const cols = [
			{ key: 'origin', cats: ORIGINS },
			{ key: 'field', cats: FIELDS },
			{ key: 'industry', cats: INDUSTRIES }
		].map((c) => {
			const totals = d3.rollup(scoped, sum, (r) => r[c.key]);
			return { ...c, totals, present: c.cats.filter((k) => (totals.get(k) ?? 0) > 0) };
		});

		// One scale for all three columns so equal counts get equal heights.
		const k = d3.min(cols, (c) => (innerH - pad * (c.present.length - 1)) / total);

		const nodes = [];
		const nodeY = cols.map(() => new Map());
		cols.forEach((c, ci) => {
			const used = total * k + pad * (c.present.length - 1);
			let y = M.top + (innerH - used) / 2;
			for (const cat of c.present) {
				const h = c.totals.get(cat) * k;
				nodeY[ci].set(cat, y);
				nodes.push({ key: c.key, cat, ci, x: xs[ci], y, h, count: c.totals.get(cat) });
				y += h + pad;
			}
		});

		const A = d3.rollup(scoped, sum, (r) => r.origin, (r) => r.field);
		const B = d3.rollup(scoped, sum, (r) => r.field, (r) => r.industry, (r) => r.origin);
		const hA = d3.rollup(subset, sum, (r) => r.origin, (r) => r.field);
		const hB = d3.rollup(subset, sum, (r) => r.field, (r) => r.industry, (r) => r.origin);
		const getA = (m, o, f) => m.get(o)?.get(f) ?? 0;
		const getB = (m, f, i, o) => m.get(f)?.get(i)?.get(o) ?? 0;

		// Stack ribbon ends inside each node in a fixed category order.
		const cursor = (ci) => new Map([...nodeY[ci]]);
		const oCur = cursor(0), fInCur = cursor(1), fOutCur = cursor(1), iCur = cursor(2);
		const startA = new Map(), endA = new Map(), startB = new Map(), endB = new Map();

		for (const o of ORIGINS) for (const f of FIELDS) {
			const w = getA(A, o, f) * k;
			if (!w) continue;
			startA.set(`${o}|${f}`, oCur.get(o));
			oCur.set(o, oCur.get(o) + w);
		}
		for (const f of FIELDS) for (const o of ORIGINS) {
			const w = getA(A, o, f) * k;
			if (!w) continue;
			endA.set(`${o}|${f}`, fInCur.get(f));
			fInCur.set(f, fInCur.get(f) + w);
		}
		for (const f of FIELDS) for (const i of INDUSTRIES) for (const o of ORIGINS) {
			const w = getB(B, f, i, o) * k;
			if (!w) continue;
			startB.set(`${o}|${f}|${i}`, fOutCur.get(f));
			fOutCur.set(f, fOutCur.get(f) + w);
		}
		for (const i of INDUSTRIES) for (const f of FIELDS) for (const o of ORIGINS) {
			const w = getB(B, f, i, o) * k;
			if (!w) continue;
			endB.set(`${o}|${f}|${i}`, iCur.get(i));
			iCur.set(i, iCur.get(i) + w);
		}

		const ribbons = [];
		for (const [key, y0] of startA) {
			const [o, f] = key.split('|');
			ribbons.push({
				seg: 'A', key, origin: o, field: f,
				x0: xs[0] + NW, y0, x1: xs[1], y1: endA.get(key),
				count: getA(A, o, f), hcount: getA(hA, o, f)
			});
		}
		for (const [key, y0] of startB) {
			const [o, f, i] = key.split('|');
			ribbons.push({
				seg: 'B', key, origin: o, field: f, industry: i,
				x0: xs[1] + NW, y0, x1: xs[2], y1: endB.get(key),
				count: getB(B, f, i, o), hcount: getB(hB, f, i, o)
			});
		}
		for (const r of ribbons) {
			r.w = r.count * k;
			r.hw = r.hcount * k;
		}

		const originTotals = cols[0].totals;
		const fieldTotals = cols[1].totals;
		const originFieldTotals = A;
		return { xs, nodes, ribbons, originTotals, fieldTotals, originFieldTotals };
	});

	// Hover is a predicate over flows rows; ribbons carrying any matching row stay lit.
	let hoverKeys = $derived.by(() => {
		const h = sel.hover;
		if (!h || !['origin', 'field', 'industry', 'occupation'].includes(h.key)) return null;
		const keys = new Set();
		for (const r of scoped) {
			if (r[h.key] !== h.value) continue;
			keys.add(`${r.origin}|${r.field}`);
			keys.add(`${r.origin}|${r.field}|${r.industry}`);
		}
		return keys;
	});

	function ribbonPath(x0, y0, x1, y1, w) {
		const xm = (x0 + x1) / 2;
		return `M${x0},${y0}C${xm},${y0} ${xm},${y1} ${x1},${y1}L${x1},${y1 + w}C${xm},${y1 + w} ${xm},${y0 + w} ${x0},${y0 + w}Z`;
	}

	function baseOpacity(r) {
		if (hoverKeys && !hoverKeys.has(r.key)) return 0.06;
		if (anySel) return 0.13;
		return hoverKeys ? 0.75 : 0.5;
	}

	function ribbonTip(event, r) {
		const scope = sel.degree === 'All' ? 'all degree levels' : sel.degree;
		const lines = [];
		let title;
		if (r.seg === 'A') {
			title = `${r.origin} → ${r.field}`;
			const oTot = layout.originTotals.get(r.origin);
			const fTot = layout.fieldTotals.get(r.field);
			lines.push(`${fmtCount(r.count)} synthetic graduates (${scope})`);
			lines.push(`${fmtPct(r.count, oTot)} of the ${fmtCount(oTot)} from ${r.origin}`);
			lines.push(`${fmtPct(r.count, fTot)} of the ${fmtCount(fTot)} in ${r.field}`);
		} else {
			title = `${r.field} → ${r.industry}`;
			const den = layout.originFieldTotals.get(r.origin)?.get(r.field) ?? 0;
			lines.push(`${fmtCount(r.count)} synthetic graduates from ${r.origin} (${scope})`);
			lines.push(`${fmtPct(r.count, den)} of the ${fmtCount(den)} from ${r.origin} in ${r.field}`);
		}
		if (anySel) lines.push(`Matching current selection: ${fmtCount(r.hcount)}`);
		lines.push('Click to select this pair');
		sel.hover = { key: 'origin', value: r.origin };
		sel.showTip(event, title, lines, 'flows table');
	}

	function nodeTip(event, n) {
		sel.hover = { key: n.key, value: n.cat };
		const scope = sel.degree === 'All' ? 'all degree levels' : sel.degree;
		const lines = [`${fmtCount(n.count)} synthetic graduates`, `${fmtPct(n.count, total)} of ${fmtCount(total)} in scope (${scope})`];
		if (anySel) lines.push(`Matching current selection: ${fmtCount(matchOf(n))} (${fmtPct(matchOf(n), n.count)} of this ${n.key})`);
		lines.push('Click to select');
		sel.showTip(event, n.cat, lines, 'flows table');
	}

	function ribbonClick(r) {
		if (r.seg === 'A') sel.setPair({ origin: r.origin, field: r.field });
		else sel.setPair({ field: r.field, industry: r.industry });
	}

	function onKey(event, n) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			sel.toggle(n.key, n.cat);
		}
	}

	const COL_TITLES = ['Country of origin', 'Field of study', 'Industry of employment'];
</script>

<svg viewBox="0 0 {W} {H}" role="img" aria-label="Parallel sets of synthetic graduates from country of origin to field of study to industry">
	<!-- Empty-area click clears clicked selections. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<rect width={W} height={H} fill="transparent" onclick={() => sel.clearSelections()} />

	{#if layout}
		{#each layout.xs as x, i}
			<text
				x={i === 0 ? x + NW : i === 2 ? x : x + NW / 2}
				y={compact ? 14 : 18}
				text-anchor={i === 0 ? 'end' : i === 2 ? 'start' : 'middle'}
				class="col-title">{COL_TITLES[i]}</text
			>
		{/each}

		<g>
			{#each layout.ribbons as r (r.key)}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<path
					d={ribbonPath(r.x0, r.y0, r.x1, r.y1, r.w)}
					style:fill={originColor(r.origin)}
					opacity={baseOpacity(r)}
					class="ribbon"
					onmousemove={(e) => ribbonTip(e, r)}
					onmouseleave={() => sel.hideTip()}
					onclick={(e) => { ribbonClick(r); ribbonTip(e, r); }}
				/>
			{/each}
		</g>

		{#if anySel && subset.length === 0}
			<text x={W / 2} y={H - 4} text-anchor="middle" class="empty halo">
				No synthetic graduates match this combination of selections.
			</text>
		{/if}

		{#if anySel}
			<g pointer-events="none">
				{#each layout.ribbons as r (r.key)}
					{#if r.hw > 0}
						<path
							d={ribbonPath(r.x0, r.y0, r.x1, r.y1, r.hw)}
							style:fill={originColor(r.origin)}
							opacity={hoverKeys && !hoverKeys.has(r.key) ? 0.25 : 0.85}
						/>
					{/if}
				{/each}
			</g>
		{/if}

		{#each layout.nodes as n (n.key + n.cat)}
			{@const selected = sel[n.key] === n.cat}
			<g
				role="button"
				tabindex="0"
				aria-label="{n.cat}: {fmtCount(n.count)} synthetic graduates. Select."
				aria-pressed={selected}
				class="node"
				onclick={(e) => { sel.toggle(n.key, n.cat); nodeTip(e, n); }}
				onkeydown={(e) => onKey(e, n)}
				onmousemove={(e) => nodeTip(e, n)}
				onmouseleave={() => sel.hideTip()}
			>
				<rect
					x={n.x}
					y={n.y}
					width={NW}
					height={Math.max(n.h, 1)}
					rx="2"
					style:fill={selected ? 'var(--text-primary)' : 'var(--node)'}
				/>
				<!-- Wider invisible hit target than the node itself. -->
				<rect x={n.x - 6} y={n.y - 2} width={NW + 12} height={n.h + 4} fill="transparent" />
				<text
					x={n.ci === 0 ? n.x - 6 : n.x + NW + 6}
					y={n.y + n.h / 2}
					dy="0.35em"
					text-anchor={n.ci === 0 ? 'end' : 'start'}
					class="label halo"
					class:selected
					class:nomatch={anySel && matchOf(n) === 0}
					font-size="12"
				>
					{n.cat}{#if anySel}<tspan class="count" dx="5">{fmtCount(matchOf(n))}{compact || n.ci === 1 ? '' : ` of ${fmtCount(n.count)}`}</tspan
						>{:else if !compact}<tspan class="count" dx="5">{fmtCount(n.count)}</tspan>{/if}
				</text>
			</g>
		{/each}
	{:else}
		<text x={W / 2} y={H / 2} text-anchor="middle" class="empty">No synthetic records match.</text>
	{/if}
</svg>

<style>
	.col-title {
		fill: var(--text-muted);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.ribbon {
		cursor: pointer;
		transition: opacity 120ms;
	}

	.node {
		cursor: pointer;
		outline: none;
	}

	.node:focus-visible rect:first-child {
		stroke: var(--origin-1);
		stroke-width: 2;
	}

	.label {
		fill: var(--text-primary);
	}

	.label.nomatch {
		fill: var(--text-muted);
	}

	.label.selected {
		font-weight: 700;
	}

	.count {
		fill: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.empty {
		fill: var(--text-muted);
		font-size: 13px;
	}
</style>
