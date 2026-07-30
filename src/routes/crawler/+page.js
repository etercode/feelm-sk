import { API_URL } from '$lib/config.js';

/**
 * Crawl progress, with a page of what has arrived so far.
 *
 * Both requests go out together: the summary is small and the titles are what
 * takes the time, so waiting on them in sequence would double the wait.
 */
export async function load({ url, fetch }) {
	const page = Number(url.searchParams.get('page') ?? 1);

	async function get(path) {
		try {
			const response = await fetch(`${API_URL}${path}`);
			if (!response.ok) {
				console.error(`crawler: ${path} returned ${response.status}`);
				return null;
			}
			return await response.json();
		} catch (error) {
			console.error(`crawler: ${path} failed —`, error);
			return null;
		}
	}

	const [status, recent] = await Promise.all([
		get('/api/crawl/status'),
		get(`/api/crawl/recent?page=${page}&limit=24`)
	]);

	return { status, recent, unreachable: status === null };
}
