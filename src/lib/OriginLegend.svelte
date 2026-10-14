<script>
	import { ORIGINS, originColor } from '#lib/data.js';
</script>

<div class="legend" aria-label="Ribbon color = country of origin">
	{#each ORIGINS as o}
		<span><i style:background={originColor(o)}></i>{o}</span>
	{/each}
</div>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}

	span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	i {
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}
</style>
