<script>
	import { DEGREES, fmtCount, fmtPct, sum } from '#lib/data.js';
	import { KEY_LABEL } from '#lib/selection.svelte.js';

	/** Degree scope, active-selection chips, a running count, and reset. */
	let { sel, flows } = $props();

	let scopeTotal = $derived(sum(flows.filter((r) => sel.degree === 'All' || r.degree === sel.degree)));
	let matching = $derived(sum(flows.filter((r) => sel.matches(r))));
	let dirty = $derived(sel.degree !== 'All' || sel.active.length > 0);
</script>

<div class="bar">
	<div class="seg" role="group" aria-label="Degree level">
		{#each ['All', ...DEGREES] as d}
			<button aria-pressed={sel.degree === d} onclick={() => (sel.degree = d)}>{d === 'All' ? 'All degrees' : d}</button>
		{/each}
	</div>

	<div class="chips" aria-live="polite">
		{#each sel.active as key (key)}
			<span class="chip">
				<span class="k">{KEY_LABEL[key]}:</span>
				{sel[key]}
				<button aria-label="Clear {KEY_LABEL[key]}" onclick={() => sel.clear(key)}>✕</button>
			</span>
		{:else}
			<span class="hint">Click a chart element to select it · Esc or empty-area click clears</span>
		{/each}
	</div>

	<span class="count">
		{fmtCount(matching)} of {fmtCount(scopeTotal)} synthetic graduates ({fmtPct(matching, scopeTotal)})
	</span>

	<button class="reset" onclick={() => sel.reset()} disabled={!dirty}>Reset all</button>
</div>

<style>
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 14px;
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--surface-1);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		flex: 1;
		min-width: 200px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 4px 2px 8px;
		border: 1px solid var(--border);
		border-radius: 999px;
		font-size: 0.8125rem;
	}

	.chip .k {
		color: var(--text-muted);
	}

	.chip button {
		border: 0;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.75rem;
		padding: 2px 4px;
	}

	.hint,
	.count {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.count {
		font-variant-numeric: tabular-nums;
	}

	.reset {
		font: inherit;
		font-size: 0.8125rem;
		padding: 5px 12px;
		border-radius: 6px;
		border: 1px solid var(--text-primary);
		background: var(--text-primary);
		color: var(--surface-1);
		cursor: pointer;
	}

	.reset:disabled {
		opacity: 0.35;
		cursor: default;
	}
</style>
