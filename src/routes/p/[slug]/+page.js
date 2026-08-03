import { error } from '@sveltejs/kit';
import { API_URL } from '$lib/config.js';

/**
 * One person and everything they are credited on.
 *
 * A load function rather than an effect, because none of it is about the
 * signed-in viewer — a filmography is the same for everyone, so it can be
 * rendered on the server and arrive as HTML.
 */
export async function load({ params, fetch }) {
	let response;

	try {
		response = await fetch(`${API_URL}/api/people/${encodeURIComponent(params.slug)}`);
	} catch (e) {
		console.error('person: request failed —', e);
		error(503, 'The catalog API is unreachable.');
	}

	if (response.status === 404) error(404, 'No one by that name.');
	if (!response.ok) error(response.status, 'Could not load that person.');

	return await response.json();
}
