import { error } from '@sveltejs/kit';
import { API_URL } from '$lib/config.js';

/** Load item detail from the API. */
export async function load({ params, fetch }) {
	const res = await fetch(`${API_URL}/api/items/${params.type}/${params.slug}`);
	if (res.status === 404) error(404, 'We have not catalogued that one yet.');
	if (!res.ok) error(502, 'Catalog API is unreachable.');

	const data = await res.json();
	const item = data.item;
	if (!item) error(404, 'We have not catalogued that one yet.');

	// Related titles of the same type (best-effort).
	let related = [];
	try {
		const listRes = await fetch(`${API_URL}/api/items?type=${params.type}&limit=48`);
		if (listRes.ok) {
			const list = await listRes.json();
			const shared = (other) =>
				(other.genres ?? []).filter((g) => (item.genres ?? []).includes(g)).length;
			related = (list.items ?? [])
				.filter((other) => other.id !== item.id && shared(other) > 0)
				.sort(
					(a, b) =>
						shared(b) - shared(a) || (b.externalScore ?? 0) - (a.externalScore ?? 0)
				)
				.slice(0, 8);
		}
	} catch {
		// Detail still works without related.
	}

	return { item, related, rating: data.rating ?? null };
}
