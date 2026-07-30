import { API_URL } from '$lib/config.js';

/**
 * The search page is driven entirely by the query string, so every result set —
 * filters, sort, page — is a link someone can share or reload into.
 */
export async function load({ url, fetch }) {
	const params = new URLSearchParams(url.search);
	if (!params.has('limit')) params.set('limit', '24');

	const [results, filters] = await Promise.all([
		fetch(`${API_URL}/api/search?${params}`)
			.then((response) => (response.ok ? response.json() : null))
			.catch(() => null),
		fetch(`${API_URL}/api/search/filters`)
			.then((response) => (response.ok ? response.json() : null))
			.catch(() => null)
	]);

	return {
		results,
		filters: filters ?? { genres: [], certifications: [], languages: [], years: {}, sorts: [] },
		unreachable: results === null
	};
}
