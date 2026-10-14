import { onMount } from 'svelte';
import { loadData } from '#lib/data.js';
import { Selection } from '#lib/selection.svelte.js';

/** Shared page boot: each route loads its own copy of the data and its own Selection. */
export function usePage() {
	const page = $state({ data: null, sel: null, error: null });

	onMount(async () => {
		try {
			const data = await loadData();
			page.sel = new Selection(data.occupationIndustry);
			page.data = data;
		} catch (error) {
			page.error = error instanceof Error ? error.message : String(error);
		}
	});

	return page;
}
