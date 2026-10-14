<script>
	import { resolve } from '$app/paths';
	import DataNotice from '#lib/DataNotice.svelte';
</script>

<svelte:head><title>International Graduates · Dashboard Prototypes</title></svelte:head>

<main>
	<h1>Where do international graduates work, and how does their pay compare?</h1>
	<p class="lede">
		Two coordinated-view prototypes for a policymaker audience, built on the same synthetic data with different
		entry points.
	</p>
	<DataNotice />

	<div class="cards">
		<a href="{resolve('/prototype-1')}/" class="card">
			<h2>Prototype 1 · Exploration-first</h2>
			<p>
				A large country → field → industry flow diagram leads. Select a country, field, industry or ribbon, and the
				linked employment and salary charts respond.
			</p>
		</a>
		<a href="{resolve('/prototype-2')}/" class="card">
			<h2>Prototype 2 · Comparison-first</h2>
			<p>
				The salary comparison and employment charts lead, with sorting and gap controls. A compact flow diagram
				gives context for any selection.
			</p>
		</a>
	</div>
</main>

<style>
	main {
		max-width: 900px;
		margin: 0 auto;
		padding: 40px 16px;
	}

	h1 {
		font-size: 1.6rem;
		margin: 0 0 8px;
	}

	.lede {
		color: var(--text-secondary);
		margin: 0 0 16px;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
		margin-top: 20px;
	}

	.card {
		display: block;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--surface-1);
		color: inherit;
		text-decoration: none;
	}

	.card:hover {
		border-color: var(--text-muted);
	}

	.card h2 {
		margin: 0 0 6px;
		font-size: 1.05rem;
	}

	.card p {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.875rem;
		line-height: 1.5;
	}
</style>
