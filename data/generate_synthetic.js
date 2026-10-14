// Generates the two SYNTHETIC tables used by both prototypes.
//
// Nothing here is an estimate. Country, field, industry and occupation names
// are real categories; every count, salary and relationship attached to them
// is invented so the prototypes have something to draw. The affinity weights
// below were picked by hand only to make linked selections visibly do
// something — they are not drawn from any source.
//
// Deterministic: a fixed seed means rerunning produces identical CSVs.
//   node data/generate_synthetic.js

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SEED = 1710;
const COHORT_SIZE = 50000; // synthetic headcount, not a real cohort

const OUT = fileURLToPath(new URL('../static/data/', import.meta.url));

// mulberry32: small seeded PRNG so output is reproducible.
function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const rand = rng(SEED);
const jitter = (spread) => 1 + (rand() * 2 - 1) * spread;

const ORIGINS = ['India', 'China', 'South Korea', 'Nigeria', 'Brazil', 'Canada', 'All other countries'];
const DEGREES = ["Bachelor's", "Master's", 'Doctorate'];
const FIELDS = [
	'Computer & Information Sciences',
	'Engineering',
	'Business & Management',
	'Mathematics & Statistics',
	'Life & Health Sciences',
	'Social Sciences'
];

// Industry -> its occupations. Each occupation belongs to exactly one industry.
const INDUSTRIES = {
	Technology: ['Software developers', 'Data scientists', 'IT & network specialists'],
	'Finance & Insurance': ['Financial analysts', 'Actuaries & quantitative analysts', 'Accountants & auditors'],
	Manufacturing: ['Mechanical & industrial engineers', 'Electrical engineers', 'Production managers'],
	Healthcare: ['Clinical & laboratory researchers', 'Healthcare administrators'],
	'Higher Education & Research': ['Postsecondary teachers', 'Research scientists'],
	'Professional & Consulting Services': ['Management consultants', 'Economists & policy analysts'],
	'Other industries': ['Other occupations']
};

// Field -> industry weights (hand-picked, synthetic). Zero = no flow generated.
const FIELD_INDUSTRY = {
	'Computer & Information Sciences': [6, 2, 1, 0.5, 1, 1.5, 0.5],
	Engineering: [3, 0.5, 4, 0.5, 1.5, 1, 0.5],
	'Business & Management': [1.5, 4, 1, 0.8, 0, 3, 1],
	'Mathematics & Statistics': [2.5, 3, 0.3, 0.5, 1.5, 1, 0],
	'Life & Health Sciences': [0.3, 0, 1, 4, 3, 0.3, 0.7],
	'Social Sciences': [0.5, 1, 0, 0.8, 2, 2.5, 1.5]
};

// Occupations get a boost for their "home" field(s) within an industry.
const OCCUPATION_HOME = {
	'Software developers': ['Computer & Information Sciences', 'Engineering'],
	'Data scientists': ['Mathematics & Statistics', 'Computer & Information Sciences'],
	'IT & network specialists': ['Computer & Information Sciences'],
	'Financial analysts': ['Business & Management'],
	'Actuaries & quantitative analysts': ['Mathematics & Statistics'],
	'Accountants & auditors': ['Business & Management'],
	'Mechanical & industrial engineers': ['Engineering'],
	'Electrical engineers': ['Engineering'],
	'Production managers': ['Business & Management'],
	'Clinical & laboratory researchers': ['Life & Health Sciences'],
	'Healthcare administrators': ['Business & Management', 'Social Sciences'],
	'Postsecondary teachers': [],
	'Research scientists': ['Life & Health Sciences', 'Mathematics & Statistics'],
	'Management consultants': ['Business & Management'],
	'Economists & policy analysts': ['Social Sciences'],
	'Other occupations': []
};

// --- flows table ---------------------------------------------------------
// One row = a synthetic headcount for one (origin, degree, field, industry,
// occupation) combination. Rows are aggregates, never individuals.

const originWeight = ORIGINS.map(() => 0.5 + rand());
const degreeWeight = DEGREES.map((_, i) => [1, 1.6, 0.5][i] * jitter(0.2));
const industryNames = Object.keys(INDUSTRIES);

const cells = [];
ORIGINS.forEach((origin, oi) => {
	// Each origin gets its own random tilt across fields.
	const fieldTilt = FIELDS.map(() => 0.4 + rand() * 1.2);
	DEGREES.forEach((degree, di) => {
		FIELDS.forEach((field, fi) => {
			industryNames.forEach((industry, ii) => {
				const fiw = FIELD_INDUSTRY[field][ii];
				if (fiw === 0) return;
				for (const occupation of INDUSTRIES[industry]) {
					const home = OCCUPATION_HOME[occupation].includes(field) ? 3 : 1;
					const w = originWeight[oi] * degreeWeight[di] * fieldTilt[fi] * fiw * home * jitter(0.35);
					cells.push({ origin, degree_level: degree, field, industry, occupation, w });
				}
			});
		});
	});
});

const totalW = cells.reduce((s, c) => s + c.w, 0);
const flows = cells
	.map(({ w, ...c }) => ({ ...c, count: Math.round((w / totalW) * COHORT_SIZE) }))
	.filter((c) => c.count > 0);

// --- salaries table ------------------------------------------------------
// One row = a synthetic median salary for one (field, degree, group). This
// table has no origin, industry or occupation column, by design.

const BASE = {
	'Computer & Information Sciences': 82000,
	Engineering: 78000,
	'Business & Management': 64000,
	'Mathematics & Statistics': 72000,
	'Life & Health Sciences': 54000,
	'Social Sciences': 50000
};
const DEGREE_MULT = { "Bachelor's": 1, "Master's": 1.18, Doctorate: 1.38 };
const round500 = (v) => Math.round(v / 500) * 500;

const salaries = [];
for (const field of FIELDS) {
	for (const degree of DEGREES) {
		const domestic = round500(BASE[field] * DEGREE_MULT[degree] * jitter(0.06));
		const international = round500(domestic * jitter(0.09));
		salaries.push({ field, degree_level: degree, group: 'Domestic', median_salary: domestic });
		salaries.push({ field, degree_level: degree, group: 'International', median_salary: international });
	}
}

// --- write ---------------------------------------------------------------

function toCsv(rows) {
	const cols = Object.keys(rows[0]);
	const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
	return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}

writeFileSync(OUT + 'flows_synthetic.csv', toCsv(flows));
writeFileSync(OUT + 'salaries_synthetic.csv', toCsv(salaries));

const total = flows.reduce((s, r) => s + r.count, 0);
console.log(`flows_synthetic.csv: ${flows.length} rows, ${total} synthetic graduates`);
console.log(`salaries_synthetic.csv: ${salaries.length} rows`);
