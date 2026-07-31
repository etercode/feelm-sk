import { browser } from '$app/environment';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '$lib/auth/tokens.js';
import { API_URL } from '$lib/config.js';

export class ApiError extends Error {
	/** @param {number} status @param {any} body @param {string} [message] */
	constructor(status, body, message) {
		super(message ?? body?.message ?? body?.error ?? `Request failed (${status})`);
		this.status = status;
		this.body = body;
	}
}

const TIMEOUT_MS = 15000;

/** @param {Response} response */
async function parseJson(response) {
	const text = await response.text();
	if (!text) return null;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @param {boolean} [auth]
 */
async function request(path, options = {}, auth = false) {
	const headers = new Headers(options.headers);
	if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
		headers.set('Content-Type', 'application/json');
	}
	if (auth) {
		const token = getAccessToken();
		if (token) headers.set('Authorization', `Bearer ${token}`);
	}

	let response = await send(path, { ...options, headers });

	if (auth && response.status === 401 && (await tryRefresh())) {
		const token = getAccessToken();
		if (token) headers.set('Authorization', `Bearer ${token}`);
		response = await send(path, { ...options, headers });
	}

	if (!response.ok) {
		throw new ApiError(response.status, await parseJson(response));
	}

	if (response.status === 204) return null;
	return parseJson(response);
}

/** @param {string} path @param {RequestInit} options */
async function send(path, options) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		return await fetch(`${API_URL}${path}`, { ...options, signal: controller.signal });
	} catch (e) {
		if (e instanceof Error && e.name === 'AbortError') {
			throw new ApiError(504, {}, 'Request timed out');
		}
		throw new ApiError(503, {}, 'API is unreachable');
	} finally {
		clearTimeout(timer);
	}
}

let refreshing = /** @type {Promise<boolean> | null} */ (null);

function tryRefresh() {
	if (!browser) return Promise.resolve(false);
	if (refreshing) return refreshing;

	refreshing = (async () => {
		const refresh_token = getRefreshToken();
		if (!refresh_token) return false;
		try {
			const res = await send('/api/token/refresh', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refresh_token })
			});
			if (!res.ok) {
				clearTokens();
				return false;
			}
			saveTokens(await res.json());
			return true;
		} catch {
			clearTokens();
			return false;
		} finally {
			refreshing = null;
		}
	})();

	return refreshing;
}

/** @param {Record<string, any>} params */
function query(params) {
	const usp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === '') continue;
		// Repeat the key for lists: type=movie&type=book, which is what the
		// advanced filters send.
		if (Array.isArray(value)) {
			for (const entry of value) if (entry !== '' && entry !== null) usp.append(key, String(entry));
		} else {
			usp.set(key, String(value));
		}
	}
	const encoded = usp.toString();
	return encoded ? `?${encoded}` : '';
}

// ---- Auth ----------------------------------------------------------------

/** @param {{ username: string, password: string, name: string, tagline?: string }} data */
export function register(data) {
	return request('/api/register', { method: 'POST', body: JSON.stringify(data) });
}

/** @param {{ username: string, password: string }} data */
export async function login(data) {
	const tokens = await request('/api/login', { method: 'POST', body: JSON.stringify(data) });
	saveTokens(tokens);
	return tokens;
}

export async function logout() {
	try {
		await request('/api/logout', { method: 'POST' }, true);
	} finally {
		clearTokens();
	}
}

export function getMe() {
	return request('/api/me', {}, true);
}

// ---- Own account ---------------------------------------------------------

/**
 * The whole editable profile every time — a missing field means "cleared",
 * so partial saves are not a thing here.
 *
 * @param {{ name: string, tagline?: string|null, bio?: string|null, location?: string|null }} data
 */
export function updateProfile(data) {
	return request('/api/me', { method: 'PATCH', body: JSON.stringify(data) }, true);
}

/** @param {{ currentPassword: string, newPassword: string }} data */
export function changePassword(data) {
	return request('/api/me/password', { method: 'POST', body: JSON.stringify(data) }, true);
}

/** @param {Blob} blob a square image, already cropped by the browser */
export function uploadAvatar(blob) {
	const form = new FormData();
	form.append('avatar', blob, 'avatar.jpg');

	return request('/api/me/avatar', { method: 'POST', body: form }, true);
}

export function deleteAvatar() {
	return request('/api/me/avatar', { method: 'DELETE' }, true);
}

// ---- Catalog -------------------------------------------------------------

/** @param {{ type?: string, q?: string, page?: number, limit?: number }} [params] */
export function listItems(params = {}) {
	return request(`/api/items${query(params)}`);
}

/**
 * Typo-tolerant search with optional "did you mean" suggestion.
 * @param {{ q: string, type?: string, limit?: number, offset?: number }} params
 */
export function search(params) {
	return request(`/api/search${query(params)}`);
}

/** Type-ahead: a few titles, matching people, and the spelling correction. */
export function searchSuggest(params) {
	return request(`/api/search/suggest${query(params)}`);
}

/** Genres, certifications, languages and the year span, for the filter panel. */
export function searchFilters() {
	return request('/api/search/filters');
}

export function listUpcoming() {
	return request('/api/upcoming');
}

/** @param {string} type @param {string} slug */
export function getItem(type, slug) {
	return request(`/api/items/${type}/${slug}`);
}

/** @param {string} type @param {string} slug */
export function getItemReviews(type, slug) {
	return request(`/api/items/${type}/${slug}/reviews`);
}

// ---- Shelf / reviews / social --------------------------------------------

export function getMyEntries() {
	return request('/api/me/entries', {}, true);
}

/**
 * @param {string} type
 * @param {string} slug
 * @param {{ status?: string, rating?: number, progress?: object, clear?: boolean }} data
 */
export function upsertEntry(type, slug, data) {
	return request(`/api/me/entries/${type}/${slug}`, {
		method: 'PUT',
		body: JSON.stringify(data)
	}, true);
}

/** @param {string} type @param {string} slug */
export function deleteEntry(type, slug) {
	return request(`/api/me/entries/${type}/${slug}`, { method: 'DELETE' }, true);
}

/**
 * @param {string} type
 * @param {string} slug
 * @param {{ rating: number, body: string }} data
 */
export function saveReview(type, slug, data) {
	return request(`/api/me/reviews/${type}/${slug}`, {
		method: 'PUT',
		body: JSON.stringify(data)
	}, true);
}

/** @param {string} type @param {string} slug */
export function deleteReview(type, slug) {
	return request(`/api/me/reviews/${type}/${slug}`, { method: 'DELETE' }, true);
}

/** @param {string} username */
export function toggleFollow(username) {
	return request(`/api/me/follows/${username}`, { method: 'POST' }, true);
}

/** @param {{ scope?: 'following' | 'everyone', limit?: number }} [params] */
export function getFeed(params = {}) {
	return request(`/api/me/feed${query(params)}`, {}, true);
}

/** @param {string} username */
export function getProfile(username) {
	return request(`/api/users/${username}`);
}

/**
 * One page of somebody's shelf. Filtering and paging are the server's job —
 * a shelf can run to thousands, so the browser never sees the whole thing.
 *
 * @param {string} username
 * @param {{ type?: string|null, status?: string|null, q?: string, sort?: string, page?: number, limit?: number }} [params]
 */
export function getUserEntries(username, params = {}) {
	return request(`/api/users/${username}/entries${query(params)}`);
}

/** @param {string} username */
export function getFollowers(username) {
	return request(`/api/users/${username}/followers`);
}

/** @param {string} username */
export function getFollowing(username) {
	return request(`/api/users/${username}/following`);
}

/** @param {string} type @param {string} slug */
export function markSeen(type, slug) {
	return request(`/api/me/seen/${type}/${slug}`, { method: 'POST' }, true);
}

export function catchUpSeen() {
	return request('/api/me/seen/catch-up', { method: 'POST' }, true);
}

export function listSeen() {
	return request('/api/me/seen', {}, true);
}
