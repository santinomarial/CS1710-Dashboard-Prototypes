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

<svelte:head><title>Prototype 2 · Comparison-first</title></svelte:head>
<svelte:window onkeydown={(e) => e.key === 'Escape' && page.sel?.reset()} />

<main>
	<header>
		<a href={resolve('/')} class="back">← Both prototypes</a>
		<h1>Prototype 2 · Comparison-first</h1>
		<p class="question">
			How does international graduates' pay compare with domestic graduates in the same field and degree, and where
			do they work? Select a field row or an industry/occupation bar; the flow diagram below shows the context.
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
			<SalaryDumbbell {salaries} {flows} sel={page.sel} controls initialSort="gap" />
			<EmploymentBars {flows} sel={page.sel} {occupations} {occupationIndustry} />
		</div>

		<figure class="chart">
			<div class="chart-head">
				<h2>Context: country of origin → field → industry</h2>
				<span class="synthetic-tag">Synthetic</span>
			</div>
			<p class="caption">
				The solid part of each ribbon is the share matching the current selection. Hover for counts; click to select.
			</p>
			<OriginLegend />
			<FlowDiagram {flows} sel={page.sel} compact />
		</figure>
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
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		gap: 14px;
		align-items: start;
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
