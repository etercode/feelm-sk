export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8092';

/**
 * Resolves an uploaded file's stored path against the host that serves it.
 *
 * Uploads live on the API host under /media — the volume nginx already serves.
 * In production the API shares feelm.org with the site, so this comes out
 * same-origin; in development the API is on its own port, and the prefix is
 * what makes the image load at all.
 *
 * @param {string | null | undefined} path
 * @returns {string | null}
 */
export function mediaUrl(path) {
	if (!path) return null;

	return /^(https?:)?\/\//.test(path) ? path : `${API_URL}${path}`;
}
