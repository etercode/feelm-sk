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

		const results = await fetch(`${API_URL}/api/search?${params}`)
			.then((response) => (response.ok ? response.json() : null))
			.catch(() => null);

		return { type, results, unreachable: results === null };
	};
}
