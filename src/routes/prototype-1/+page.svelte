<script>
	import { resolve } from '$app/paths';
	import { usePage } from '#lib/usePage.svelte.js';
	import DataNotice from '#lib/DataNotice.svelte';
	import SelectionBar from '#lib/SelectionBar.svelte';
	import FlowDiagram from '#lib/FlowDiagram.svelte';
	import OriginLegend from '#lib/OriginLegend.svelte';
	import EmploymentBars from '#lib/EmploymentBars.svelte';
	import SalaryDumbbell from '#lib/SalaryDumbbell.svelte';
	import Tooltip from '#lib/Tooltip.svelte';

	const page = usePage();
</script>

<svelte:head><title>Prototype 1 · Exploration-first</title></svelte:head>
<svelte:window onkeydown={(e) => e.key === 'Escape' && page.sel?.reset()} />

<main>
	<header>
		<a href={resolve('/')} class="back">← Both prototypes</a>
		<h1>Prototype 1 · Exploration-first</h1>
		<p class="question">
			Where do international graduates work, and how does their pay compare with domestic graduates in similar
			fields? Start from the flow diagram and select a country, field, industry or ribbon.
		</p>
	</header>

	<DataNotice />

	{#if page.error}
		<p class="status">Could not load the synthetic data: {page.error}</p>
	{:else if !page.data}
		<p class="status">Loading synthetic data…</p>
	{:else}
		{@const { flows, salaries, occupations, occupationIndustry } = page.data}
		<SelectionBar sel={page.sel} {flows} />

		<div class="grid">
			<figure class="chart flow">
				<div class="chart-head">
					<h2>From country of origin to field of study to industry</h2>
					<span class="synthetic-tag">Synthetic</span>
				</div>
				<p class="caption">
					Ribbon width = synthetic graduate count; color = country of origin. When something is selected, the solid part
					of each ribbon is the matching share and the faded part is the rest. Node sizes always show the full degree
					scope.
				</p>
				<OriginLegend />
				<FlowDiagram {flows} sel={page.sel} />
			</figure>

			<div class="side">
				<EmploymentBars {flows} sel={page.sel} {occupations} {occupationIndustry} compact />
				<SalaryDumbbell {salaries} {flows} sel={page.sel} compact />
			</div>
		</div>
	{/if}
</main>

<Tooltip tip={page.sel?.tip} />

<style>
	main {
		max-width: 1500px;
		margin: 0 auto;
		padding: 20px 16px 40px;
		display: grid;
		gap: 14px;
	}

	header h1 {
		margin: 4px 0 4px;
		font-size: 1.4rem;
	}

	.back {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.question {
		margin: 0;
		color: var(--text-secondary);
		max-width: 80ch;
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
		gap: 14px;
		align-items: start;
	}

	.side {
		display: grid;
		gap: 14px;
		min-width: 0;
	}

	@media (max-width: 1000px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.status {
		color: var(--text-secondary);
	}
</style>
