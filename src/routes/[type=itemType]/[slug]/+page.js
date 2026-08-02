import { error } from '@sveltejs/kit';
import { API_URL } from '$lib/config.js';

/**
 * Load item detail from the API.
 *
 * Both requests go out together. "Related" used to be worked out here in the
 * browser: fetch 48 titles of the same type — 22 KB — and keep whichever shared
 * a genre with this one. That searched 48 rows out of seven hundred thousand,
 * so it really meant "also popular", and it could not start until the detail
 * response had arrived, because it needed the item's genres. The server knows
 * the genres without being told, so the two are independent now, and the answer
 * comes from the whole catalog instead of one page of it.
 */
export async function load({ params, fetch }) {
	const base = `${API_URL}/api/items/${params.type}/${params.slug}`;

	const [detail, relatedResponse] = await Promise.allSettled([
		fetch(base),
		fetch(`${base}/related?limit=8`)
	]);

	if (detail.status === 'rejected') error(502, 'Catalog API is unreachable.');
	const res = detail.value;
	if (res.status === 404) error(404, 'We have not catalogued that one yet.');
	if (!res.ok) error(502, 'Catalog API is unreachable.');

	const data = await res.json();
	const item = data.item;
	if (!item) error(404, 'We have not catalogued that one yet.');

	// The page is worth showing without this.
	let related = [];
	if (relatedResponse.status === 'fulfilled' && relatedResponse.value.ok) {
		try {
			related = (await relatedResponse.value.json()).items ?? [];
		} catch (e) {
			console.error(`detail ${params.slug}: related failed —`, e);
		}
	}

	return {
		item,
		related,
		// The rest of the series, in story order. Answered by the API rather
		// than assembled from whatever the front page had cached.
		collection: data.collection ?? [],
		rating: data.rating ?? null
	};
}
