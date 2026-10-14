<script>
	/** Floating tooltip driven by `sel.tip`. Every tooltip carries the synthetic label. */
	let { tip } = $props();

	let innerWidth = $state(1200);
	let innerHeight = $state(800);
	let height = $state(0);
	// Keep the tooltip on screen: shift left near the right edge, flip above near the bottom.
	let left = $derived(tip ? Math.min(tip.x + 14, innerWidth - 300) : 0);
	let top = $derived(tip ? (tip.y + 14 + height > innerHeight ? tip.y - height - 10 : tip.y + 14) : 0);
</script>

<svelte:window bind:innerWidth bind:innerHeight />

{#if tip}
	<div class="tooltip" style:left="{left}px" style:top="{top}px" role="tooltip" bind:clientHeight={height}>
		<div class="tag-row"><span class="synthetic-tag">Synthetic · illustrative only</span></div>
		<strong>{tip.title}</strong>
		{#each tip.lines as line}
			<div>{line}</div>
		{/each}
		<div class="source">Source: generated {tip.source} — not real data</div>
	</div>
{/if}

<style>
	.tooltip {
		position: fixed;
		z-index: 10;
		max-width: 290px;
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface-1);
		color: var(--text-primary);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		font-size: 0.75rem;
		line-height: 1.45;
		pointer-events: none;
	}

	.tag-row {
		margin-bottom: 4px;
	}

	strong {
		display: block;
		font-size: 0.8125rem;
		margin-bottom: 2px;
	}

	.source {
		margin-top: 4px;
		color: var(--text-muted);
	}
</style>
