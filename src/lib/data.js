import * as d3 from 'd3';
import { asset } from '$app/paths';

// Category orders are fixed so positions and colors never depend on rank.
export const ORIGINS = ['India', 'China', 'South Korea', 'Nigeria', 'Brazil', 'Canada', 'All other countries'];
export const DEGREES = ["Bachelor's", "Master's", 'Doctorate'];
export const DEGREE_SHORT = { "Bachelor's": 'BA/BS', "Master's": 'MA/MS', Doctorate: 'PhD' };
export const FIELDS = [
	'Computer & Information Sciences',
	'Engineering',
	'Business & Management',
	'Mathematics & Statistics',
	'Life & Health Sciences',
	'Social Sciences'
];
export const FIELD_SHORT = {
	'Computer & Information Sciences': 'Computer & Info. Sci.',
	Engineering: 'Engineering',
	'Business & Management': 'Business & Mgmt.',
	'Mathematics & Statistics': 'Math & Statistics',
	'Life & Health Sciences': 'Life & Health Sci.',
	'Social Sciences': 'Social Sciences'
};
export const INDUSTRIES = [
	'Technology',
	'Finance & Insurance',
	'Manufacturing',
	'Healthcare',
	'Higher Education & Research',
	'Professional & Consulting Services',
	'Other industries'
];

/** CSS variable carrying each origin's ribbon color (defined in app.css). */
export const originColor = (origin) => `var(--origin-${ORIGINS.indexOf(origin) + 1})`;

export const fmtCount = d3.format(',');
export const fmtPct = (num, den) => (den > 0 ? `${d3.format('.1f')((num / den) * 100)}%` : '—');
export const fmtUsd = d3.format('$,.0f');

/** Loads both synthetic tables. They are independent: no row in one corresponds to a row in the other. */
export async function loadData() {
	const [flows, salaries] = await Promise.all([
		d3.csv(asset('data/flows_synthetic.csv'), (d) => ({
			origin: d.origin,
			degree: d.degree_level,
			field: d.field,
			industry: d.industry,
			occupation: d.occupation,
			count: +d.count
		})),
		d3.csv(asset('data/salaries_synthetic.csv'), (d) => ({
			field: d.field,
			degree: d.degree_level,
			group: d.group,
			median: +d.median_salary
		}))
	]);

	// Occupation -> parent industry, read from the data rather than assumed.
	const occupationIndustry = new Map(flows.map((d) => [d.occupation, d.industry]));
	const occupations = INDUSTRIES.flatMap((ind) =>
		[...new Set(flows.filter((d) => d.industry === ind).map((d) => d.occupation))]
	);

	return { flows, salaries, occupationIndustry, occupations };
}

export const sum = (rows) => d3.sum(rows, (d) => d.count);
