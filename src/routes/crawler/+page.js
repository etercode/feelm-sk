import { API_URL } from '$lib/config.js';

/**
 * Crawl progress, with a page of what has arrived so far.
 *
 * Both requests go out together: the summary is small and the titles are what
 * takes the time, so waiting on them in sequence would double the wait.
 */
export async function load({ url, fetch }) {
	const page = Number(url.searchParams.get('page') ?? 1);
	/*
	 * Movies, series and artwork are three separate jobs run by three separate
	 * commands, so the page tracks one at a time. Movies is the default because
	 * it is the crawl that ran first and the link people have bookmarked.
	 */
	const asked = url.searchParams.get('type');
	const type = ['series', 'images'].includes(asked) ? asked : 'movie';

	// Artwork has no queue table and no list of arrivals — the works table is
	// the queue — so there is nothing for the second request to fetch.
	const wantsRecent = type !== 'images';

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
		get(`/api/crawl/status?type=${type}`),
		wantsRecent ? get(`/api/crawl/recent?type=${type}&page=${page}&limit=24`) : null
	]);

	return { type, status, recent, unreachable: status === null };
}
