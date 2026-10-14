<script>
	import * as d3 from 'd3';
	import { FIELDS, FIELD_SHORT, DEGREES, DEGREE_SHORT, fmtCount, fmtPct, fmtUsd, sum } from '#lib/data.js';
	import { KEY_LABEL } from '#lib/selection.svelte.js';

	/**
	 * International vs. domestic synthetic median salary by field and degree.
	 *
	 * The salary table only has field, degree level and group. So:
	 *  - degree and field selections apply directly (they are columns here);
	 *  - origin, industry and occupation selections CANNOT change a salary.
	 *    Instead, the Share column (from the separate flows table) shows how the
	 *    selected group is spread across fields, and fields with none are dimmed.
	 * Medians are never averaged across degree levels.
	 */
	let { salaries, flows, sel, compact = false, controls = false, initialSort = 'field' } = $props();

	// initialSort is only a starting value; later changes come from the Sort control.
	// svelte-ignore state_referenced_locally
	let sortBy = $state(initialSort);
	let gapUnit = $state('pct');

	let lookup = $derived(new Map(salaries.map((d) => [`${d.field}|${d.degree}|${d.group}`, d.median])));
	let degrees = $derived(sel.degree === 'All' ? DEGREES : [sel.degree]);

	// Share of the current flows selection by field (field itself not applied, so every row has a share).
	let shareBase = $derived(flows.filter((r) => sel.matches(r, ['field'])));
	let shareDen = $derived(sum(shareBase));
	let shareByField = $derived(d3.rollup(shareBase, sum, (r) => r.field));

	// Selections the salary table cannot be filtered by.
	let unsupported = $derived(sel.active.filter((k) => k !== 'field'));

	let groups = $derived.by(() => {
		const gs = FIELDS.map((field) => {
			const rows = degrees.map((degree) => {
				const intl = lookup.get(`${field}|${degree}|International`);
				const dom = lookup.get(`${field}|${degree}|Domestic`);
				return { field, degree, intl, dom, gap: intl - dom, gapPct: (intl - dom) / dom };
			});
			return {
				field,
				rows,
				share: shareByField.get(field) ?? 0,
				// Sort keys only; never displayed as a combined salary.
				meanGapPct: d3.mean(rows, (r) => r.gapPct),
				meanDom: d3.mean(rows, (r) => r.dom)
			};
		});
		if (sortBy === 'gap') gs.sort((a, b) => a.meanGapPct - b.meanGapPct);
		if (sortBy === 'domestic') gs.sort((a, b) => b.meanDom - a.meanDom);
		return gs;
	});

	// Compact mode uses a narrower canvas so text stays legible in a side column.
	let W = $derived(compact ? 540 : 760);
	let LABEL_W = $derived(compact ? 128 : 200);
	let DEG_W = $derived(compact ? 40 : 46);
	let GAP_W = $derived(compact ? 56 : 74);
	let SHARE_W = $derived(compact ? 48 : 64);
	let rowH = $derived(compact ? 16 : 22);
	let groupGap = $derived(degrees.length > 1 ? (compact ? 6 : 10) : 0);
	const TOP = 22;
	const AXIS_H = 22;

	// Domain from the whole salary table, so the axis stays put as filters change.
	let x = $derived(
		d3.scaleLinear()
			.domain(d3.extent(salaries, (d) => d.median))
			.nice()
			.range([LABEL_W + DEG_W + 8, W - GAP_W - SHARE_W - 16])
	);

	let placed = $derived.by(() => {
		let y = TOP;
		return groups.map((g) => {
			const out = { ...g, y, h: g.rows.length * rowH };
			y += out.h + groupGap;
			return out;
		});
	});
	let H = $derived((placed.at(-1)?.y ?? TOP) + (placed.at(-1)?.h ?? 0) + AXIS_H);

	const fmtK = (v) => `$${Math.round(v / 1000)}k`;
	const fmtGap = (r, unit) =>
		unit === 'pct'
			? `${r.gapPct >= 0 ? '+' : '−'}${Math.abs(r.gapPct * 100).toFixed(1)}%`
			: `${r.gap >= 0 ? '+' : '−'}${fmtUsd(Math.abs(r.gap))}`;

	function groupOpacity(g) {
		if (sel.field) return sel.field === g.field ? 1 : 0.3;
		if (unsupported.length && g.share === 0) return 0.3;
		return 1;
	}

	function tip(event, g, r) {
		sel.hover = { key: 'field', value: g.field };
		const lines = [
			`International median: ${fmtUsd(r.intl)}`,
			`Domestic median: ${fmtUsd(r.dom)}`,
			`Gap: ${fmtGap(r, 'usd')} (${fmtGap(r, 'pct')} of domestic median)`
		];
		if (unsupported.length) {
			lines.push(`Not filtered by ${unsupported.map((k) => KEY_LABEL[k].toLowerCase()).join(', ')}: salary table has no such column`);
		}
		lines.push(`Share of selection in this field: ${fmtPct(g.share, shareDen)} (${fmtCount(g.share)} of ${fmtCount(shareDen)}, flows table)`);
		lines.push('Click to select field');
		sel.showTip(event, `${g.field} · ${r.degree}`, lines, 'salary table');
	}

	function onKey(event, g) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			sel.toggle('field', g.field);
		}
	}
</script>

<figure class="chart">
	<div class="chart-head">
		<h2>How pay compares in the same field and degree</h2>
		{#if controls}
			<div class="controls">
				<label>
					Sort
					<select bind:value={sortBy}>
						<option value="field">Field (fixed order)</option>
						<option value="gap">Gap, most negative first</option>
						<option value="domestic">Domestic median, highest first</option>
					</select>
				</label>
				<div class="seg" role="group" aria-label="Show gap as">
					<button aria-pressed={gapUnit === 'pct'} onclick={() => (gapUnit = 'pct')}>Gap %</button>
					<button aria-pressed={gapUnit === 'usd'} onclick={() => (gapUnit = 'usd')}>Gap $</button>
				</div>
			</div>
		{/if}
	</div>
	<p class="caption">
		Synthetic median salary by group. Gap = international − domestic{gapUnit === 'pct' ? ', as % of the domestic median' : ''}.
		{#if sortBy !== 'field' && degrees.length > 1}Fields ordered by the average across the shown degree levels; each row is its own median.{/if}
		<span class="synthetic-tag">Synthetic</span>
	</p>

	<div class="legend" aria-hidden="true">
		<span><svg width="12" height="12"><circle cx="6" cy="6" r="5" style:fill="var(--intl)" /></svg> International</span>
		<span><svg width="12" height="12"><circle cx="6" cy="6" r="4" style:fill="var(--surface-1)" style:stroke="var(--domestic)" stroke-width="2" /></svg> Domestic</span>
	</div>

	<svg viewBox="0 0 {W} {H}" role="img" aria-label="Dumbbell chart of synthetic median salaries, international versus domestic">
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<rect width={W} height={H} fill="transparent" onclick={() => sel.clearSelections()} />

		<text x={W - GAP_W - SHARE_W} y="10" class="colhead" text-anchor="start">Gap</text>
		<text x={W} y="10" class="colhead" text-anchor="end">Share*</text>

		{#each x.ticks(compact ? 4 : 6) as t}
			<line x1={x(t)} x2={x(t)} y1={TOP - 4} y2={H - AXIS_H + 2} class="grid" />
			<text x={x(t)} y={H - 6} text-anchor="middle" class="tick">{fmtK(t)}</text>
		{/each}

		{#each placed as g (g.field)}
			{@const isSel = sel.field === g.field}
			<g
				role="button"
				tabindex="0"
				aria-pressed={isSel}
				aria-label="{g.field}. Select field."
				class="group"
				opacity={groupOpacity(g)}
				onclick={() => sel.toggle('field', g.field)}
				onkeydown={(e) => onKey(e, g)}
			>
				<rect class="hit" class:hovered={sel.isHovered('field', g.field)} x="0" y={g.y - 2} width={W} height={g.h + 4} rx="4" />
				<text x="4" y={g.y + rowH / 2} dy="0.35em" class="field" class:bold={isSel} font-size={compact ? 11 : 12}>{compact ? FIELD_SHORT[g.field] : g.field}</text>
				<text x={W} y={g.y + rowH / 2} dy="0.35em" text-anchor="end" class="num">{fmtPct(g.share, shareDen)}</text>

				{#each g.rows as r, i (r.degree)}
					{@const y = g.y + i * rowH + rowH / 2}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<g onmousemove={(e) => tip(e, g, r)} onmouseleave={() => sel.hideTip()}>
						<rect x={LABEL_W} y={y - rowH / 2} width={W - LABEL_W - SHARE_W} height={rowH} fill="transparent" />
						<text x={LABEL_W + DEG_W} {y} dy="0.35em" text-anchor="end" class="deg">{DEGREE_SHORT[r.degree]}</text>
						<line x1={x(r.dom)} x2={x(r.intl)} y1={y} y2={y} class="bar" />
						<circle cx={x(r.dom)} cy={y} r={compact ? 3.5 : 4.5} style:fill="var(--surface-1)" style:stroke="var(--domestic)" stroke-width="2" />
						<circle cx={x(r.intl)} cy={y} r={compact ? 4 : 5} style:fill="var(--intl)" />
						<text x={W - GAP_W - SHARE_W} {y} dy="0.35em" class="num">{fmtGap(r, gapUnit)}</text>
					</g>
				{/each}
			</g>
		{/each}
	</svg>

	<p class="note">
		*Share = % of the <strong>{fmtCount(shareDen)}</strong> synthetic graduates in scope ({sel.describe(['field'])}) who are in each
		field, from the separate flows table.
		{#if unsupported.length}
			<strong>Salaries are not recalculated for the selected {unsupported.map((k) => KEY_LABEL[k].toLowerCase()).join(' / ')}</strong>:
			the synthetic salary table has only field, degree level and group, and does not describe the same individuals as the flows
			table. Fields where the selected group has no graduates are dimmed.
		{/if}
	</p>
</figure>

<style>
	.controls {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.legend {
		display: flex;
		gap: 16px;
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin-bottom: 4px;
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.legend svg {
		width: 12px;
		display: inline;
	}

	.group {
		cursor: pointer;
		outline: none;
	}

	.hit {
		fill: transparent;
	}

	.hit.hovered,
	.group:focus-visible .hit {
		fill: var(--hover-wash);
	}

	.field {
		fill: var(--text-primary);
	}

	.bold {
		font-weight: 700;
	}

	.deg,
	.colhead {
		fill: var(--text-muted);
		font-size: 10.5px;
	}

	.colhead {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.num {
		fill: var(--text-secondary);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}

	.grid {
		stroke: var(--gridline);
	}

	.tick {
		fill: var(--text-muted);
		font-size: 10.5px;
		font-variant-numeric: tabular-nums;
	}

	.bar {
		stroke: var(--axis);
		stroke-width: 2;
	}
</style>
