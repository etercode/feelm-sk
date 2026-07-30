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

		const endpoint = `${API_URL}/api/search?${params}`;
		let results = null;

		/*
		 * The page degrades to "the catalog is unreachable" whatever went wrong,
		 * but the reason is logged rather than swallowed. A silent catch here
		 * once turned a specific, findable failure into a blank page with no
		 * explanation anywhere — on the server or in the browser console.
		 */
		try {
			const response = await fetch(endpoint);
			if (!response.ok) {
				console.error(`browse ${type}: ${endpoint} returned ${response.status}`);
			} else {
				results = await response.json();
			}
		} catch (error) {
			console.error(`browse ${type}: ${endpoint} failed —`, error);
		}

		return { type, results, unreachable: results === null };
	};
}
