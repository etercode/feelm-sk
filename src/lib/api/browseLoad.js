import { API_URL } from '$lib/config.js';

/**
 * The filter lists, fetched once rather than on every navigation.
 *
 * Changing a genre or a sort re-runs this load, and it was asking for the
 * lists again each time — the same nineteen genres and four decades, to
 * rebuild dropdowns that had not changed. They only move when the crawler adds
 * something, so an hour is a generous ceiling.
 *
 * Module scope, so on the server one copy is shared by everyone. That is fine
 * for this: it is the same public answer for every visitor, and it holds no
 * user's data.
 *
 * @type {{ at: number, value: any } | null}
 */
let cachedFilters = null;
const FILTERS_TTL = 60 * 60 * 1000;

/** @param {typeof globalThis.fetch} fetch */
async function loadFilters(fetch) {
	if (cachedFilters && Date.now() - cachedFilters.at < FILTERS_TTL) {
		return cachedFilters.value;
	}

	try {
		const response = await fetch(`${API_URL}/api/search/filters`);
		if (!response.ok) return cachedFilters?.value ?? null;
		const value = await response.json();
		cachedFilters = { at: Date.now(), value };
		return value;
	} catch (error) {
		console.error('browse: filters failed —', error);
		// A stale list beats no list; the dropdowns still work.
		return cachedFilters?.value ?? null;
	}
}

/**
 * Load function shared by the four browse pages.
 *
 * They used to pull the first hundred titles of a type and filter them in the
 * browser, which quietly became a lie as soon as the crawler passed a hundred.
 * Now the server does the filtering, sorting and paging — the same query the
 * search page uses, with the type pinned.
 */
export function browseLoad(type) {
	return async ({ url, fetch }) => {
		const params = new URLSearchParams(url.search);
		params.set('type', type);
		// Ten rows of seven at the widest breakpoint the poster grid uses.
		// Narrower ones fit fewer per row, so it is more rows rather than fewer
		// titles — the page is a wall either way.
		if (!params.has('limit')) params.set('limit', '70');
		if (!params.has('sort')) params.set('sort', 'popularity');
		/*
		 * No facets. They were two of the three seconds this page took to
		 * answer: counting every genre across seven hundred thousand titles, on
		 * every request, to put a number beside each chip. The filters below
		 * name the genres without claiming how many are in each, and the lists
		 * they need come from /api/search/filters — one small query the shape of
		 * which does not change with the catalogue.
		 */
		params.set('facets', '0');
		/*
		 * And no total. Counting how many of seven hundred thousand rows match
		 * is about half the work of a listing, and this page does not print the
		 * number. The response says whether there is a page after this one,
		 * which is all the pager needs.
		 */
		params.set('total', '0');

		const endpoint = `${API_URL}/api/search?${params}`;
		let results = null;
		let filters = null;

		/*
		 * The page degrades to "the catalog is unreachable" whatever went wrong,
		 * but the reason is logged rather than swallowed. A silent catch here
		 * once turned a specific, findable failure into a blank page with no
		 * explanation anywhere — on the server or in the browser console.
		 */
		// Side by side: the lists do not depend on the results, and after the
		// first visit loadFilters answers from memory anyway.
		const [listing, options] = await Promise.allSettled([fetch(endpoint), loadFilters(fetch)]);

		try {
			if (listing.status === 'rejected') throw listing.reason;
			if (!listing.value.ok) {
				console.error(`browse ${type}: ${endpoint} returned ${listing.value.status}`);
			} else {
				results = await listing.value.json();
			}
		} catch (error) {
			console.error(`browse ${type}: ${endpoint} failed —`, error);
		}

		// The filter bar is worth having even if this fails; it falls back to
		// sorting, which needs no list from anybody.
		if (options.status === 'fulfilled') filters = options.value;

		return { type, results, filters, unreachable: results === null };
	};
}
