// Per-page interaction state. Each route creates its own instance, so the two
// prototypes never share selections.

export const KEYS = ['origin', 'field', 'industry', 'occupation'];

export const KEY_LABEL = {
	origin: 'Origin',
	field: 'Field',
	industry: 'Industry',
	occupation: 'Occupation'
};

export class Selection {
	/** 'All' or one degree level. Scopes every view, since both tables have this column. */
	degree = $state('All');
	origin = $state(null);
	field = $state(null);
	industry = $state(null);
	occupation = $state(null);

	/** Transient {key, value}; changes emphasis only, never totals. */
	hover = $state(null);
	/** Transient tooltip {x, y, title, lines, source}. */
	tip = $state(null);

	constructor(occupationIndustry) {
		this.occupationIndustry = occupationIndustry;
	}

	/** Click the same value again to clear it. */
	toggle(key, value) {
		const next = this[key] === value ? null : value;
		this[key] = next;
		// An occupation implies its industry; a different industry clears the occupation.
		if (key === 'occupation' && next) this.industry = this.occupationIndustry.get(next);
		if (key === 'industry' && this.occupation && this.occupationIndustry.get(this.occupation) !== next) {
			this.occupation = null;
		}
	}

	/** Select several keys at once (ribbon clicks). Clicking the same pair again clears it. */
	setPair(pair) {
		const same = Object.entries(pair).every(([k, v]) => this[k] === v);
		for (const [k, v] of Object.entries(pair)) this[k] = same ? null : v;
		if (pair.industry !== undefined && this.occupation && this.occupationIndustry.get(this.occupation) !== this.industry) {
			this.occupation = null;
		}
	}

	clear(key) {
		this[key] = null;
		if (key === 'industry') this.occupation = null;
	}

	/** Clears clicked selections but keeps the degree scope (empty-area clicks). */
	clearSelections() {
		for (const k of KEYS) this[k] = null;
	}

	reset() {
		this.degree = 'All';
		this.clearSelections();
		this.hover = null;
		this.tip = null;
	}

	get active() {
		return KEYS.filter((k) => this[k] !== null);
	}

	/**
	 * Does a flows row match the current selection? `ignore` lists keys a view
	 * should not filter itself by (a bar chart keeps all its bars visible and
	 * highlights the chosen one instead).
	 */
	matches(row, ignore = []) {
		if (this.degree !== 'All' && row.degree !== this.degree) return false;
		for (const k of KEYS) {
			if (ignore.includes(k) || this[k] === null) continue;
			if (row[k] !== this[k]) return false;
		}
		return true;
	}

	/** Plain-language scope of the current selection, for denominators. */
	describe(ignore = []) {
		const parts = [this.degree === 'All' ? 'all degree levels' : this.degree];
		for (const k of KEYS) if (!ignore.includes(k) && this[k] !== null) parts.push(this[k]);
		return parts.join(' · ');
	}

	isHovered(key, value) {
		return this.hover?.key === key && this.hover?.value === value;
	}

	showTip(event, title, lines, source) {
		this.tip = { x: event.clientX, y: event.clientY, title, lines, source };
	}

	hideTip() {
		this.tip = null;
		this.hover = null;
	}
}
