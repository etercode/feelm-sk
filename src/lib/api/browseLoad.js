import { API_URL } from '$lib/config.js';

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
		if (!params.has('limit')) params.set('limit', '30');
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

		const endpoint = `${API_URL}/api/search?${params}`;
		let results = null;
		let filters = null;

		/*
		 * The page degrades to "the catalog is unreachable" whatever went wrong,
		 * but the reason is logged rather than swallowed. A silent catch here
		 * once turned a specific, findable failure into a blank page with no
		 * explanation anywhere — on the server or in the browser console.
		 */
		// Side by side: the filter lists do not depend on the results, so
		// waiting for one before asking for the other only adds latency.
		const [listing, options] = await Promise.allSettled([
			fetch(endpoint),
			fetch(`${API_URL}/api/search/filters`)
		]);

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

		// The filter bar is worth having even if this one fails; it just falls
		// back to sorting, which needs no list from anybody.
		try {
			if (options.status === 'fulfilled' && options.value.ok) {
				filters = await options.value.json();
			}
		} catch (error) {
			console.error(`browse ${type}: filters failed —`, error);
		}

		return { type, results, filters, unreachable: results === null };
	};
}
