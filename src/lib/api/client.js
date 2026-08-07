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

/**
 * Trades a Google ID token for our own token pair. The response is the same
 * shape /api/login returns, plus the user.
 *
 * @param {string} credential the ID token Google handed the browser
 */
export async function loginWithGoogle(credential) {
	const tokens = await request('/api/auth/google', {
		method: 'POST',
		body: JSON.stringify({ credential })
	});
	saveTokens(tokens);
	return tokens;
}

export function getMe() {
	return request('/api/me', {}, true);
}

/**
 * Changes the handle a Google-created account was given. Allowed once.
 *
 * @param {string} username
 */
export function chooseUsername(username) {
	return request('/api/me/username', { method: 'POST', body: JSON.stringify({ username }) }, true);
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

/**
 * Language and timezone, on their own endpoint.
 *
 * Separate from updateProfile because a language change should not have to
 * re-post a display name, a tagline and a bio it never touched — and because
 * the API requires a name on that shape, which the language dropdown has no
 * business supplying.
 *
 * @param {{ locale: string, timezone: string }} data
 */
export function updatePreferences(data) {
	return request('/api/me/preferences', { method: 'PATCH', body: JSON.stringify(data) }, true);
}

/** @param {{ currentPassword: string, newPassword: string }} data */
export function changePassword(data) {
	return request('/api/me/password', { method: 'POST', body: JSON.stringify(data) }, true);
}

/**
 * Close the signed-in account. Every token it holds dies with it, so nothing
 * authenticated works after this returns.
 */
export function deleteAccount() {
	return request('/api/me', { method: 'DELETE' }, true);
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

/**
 * Everything the front page draws, in one request: a popularity rail per type
 * that has anything in it, plus the release queue. Replaces five calls, two of
 * which were always empty — the server is the only side that knows a type
 * holds nothing.
 */
export function getHome() {
	return request('/api/home');
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

/**
 * The front of a profile: five short shelves and a summary of taste, in one
 * response. Five calls to `getUserEntries` would fetch the same genre and
 * rating rows five times over — see ProfileOverviewController.
 *
 * @param {string} username
 */
export function getUserOverview(username) {
	return request(`/api/users/${username}/overview`);
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

// ---- Feedback -------------------------------------------------------------
//
// A person's own reports. Everything is scoped to the caller server-side, so
// there is no id to pass beyond the one being changed.

export function listFeedback(params = {}) {
	return request(`/api/feedback?${new URLSearchParams(params)}`, {}, true);
}

export function createFeedback(body, category) {
	return request('/api/feedback', { method: 'POST', body: JSON.stringify({ body, category }) }, true);
}

export function updateFeedback(id, patch) {
	return request(`/api/feedback/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, true);
}

export function deleteFeedback(id) {
	return request(`/api/feedback/${id}`, { method: 'DELETE' }, true);
}

/**
 * One screenshot per call, so a rejected image does not take the others with
 * it. `file` is a File or a Blob — a paste gives the latter.
 */
export function addFeedbackImage(id, file) {
	const form = new FormData();
	form.append('image', file, file.name ?? 'screenshot.png');

	return request(`/api/feedback/${id}/images`, { method: 'POST', body: form }, true);
}

export function removeFeedbackImage(id, imageId) {
	return request(`/api/feedback/${id}/images/${imageId}`, { method: 'DELETE' }, true);
}

// ---- Admin ---------------------------------------------------------------
//
// Everything here needs at least ROLE_MODERATOR, and the ones that change a
// role or remove an account need ROLE_ADMIN. The server decides; the front end
// only hides what it knows will be refused.

export function adminOverview() {
	return request('/api/admin/overview', {}, true);
}

/** Where notifications go. The bot token comes back as a hint, never in full. */
export function adminTelegram() {
	return request('/api/admin/settings/telegram', {}, true);
}

/** @param {{ token?: string, clearToken?: boolean, chat?: string, enabled?: boolean, events?: Record<string, boolean> }} data */
export function adminSaveTelegram(data) {
	return request('/api/admin/settings/telegram', { method: 'PATCH', body: JSON.stringify(data) }, true);
}

/** Chats that have messaged the bot — a bot cannot start a conversation. */
export function adminTelegramChats() {
	return request('/api/admin/settings/telegram/chats', { method: 'POST' }, true);
}

export function adminTelegramTest() {
	return request('/api/admin/settings/telegram/test', { method: 'POST' }, true);
}

/** @param {{ q?: string, role?: string, status?: string, sort?: string, page?: number, limit?: number }} [params] */
export function adminUsers(params = {}) {
	return request(`/api/admin/users${query(params)}`, {}, true);
}

/** @param {number} id */
export function adminUser(id) {
	return request(`/api/admin/users/${id}`, {}, true);
}

/** @param {Record<string, any>} data */
export function adminCreateUser(data) {
	return request('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }, true);
}

/**
 * Only the fields being changed — anything left out is untouched, which is why
 * this is a PATCH and the profile endpoint is not.
 *
 * @param {number} id
 * @param {Record<string, any>} data
 */
export function adminUpdateUser(id, data) {
	return request(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, true);
}

/** @param {number} id @param {string} password */
export function adminSetPassword(id, password) {
	return request(
		`/api/admin/users/${id}/password`,
		{ method: 'POST', body: JSON.stringify({ password }) },
		true
	);
}

/** @param {number} id */
export function adminDeleteAvatar(id) {
	return request(`/api/admin/users/${id}/avatar`, { method: 'DELETE' }, true);
}

/** Soft delete: the row stays, and restore brings it back. @param {number} id */
export function adminDeleteUser(id) {
	return request(`/api/admin/users/${id}`, { method: 'DELETE' }, true);
}

/** @param {number} id */
export function adminRestoreUser(id) {
	return request(`/api/admin/users/${id}/restore`, { method: 'POST' }, true);
}

/** @param {{ q?: string, user?: string, type?: string, rating?: string, edited?: string, sort?: string, page?: number, limit?: number }} [params] */
export function adminReviews(params = {}) {
	return request(`/api/admin/reviews${query(params)}`, {}, true);
}

/** The one with the wording history; list rows leave it out. @param {number} id */
export function adminReview(id) {
	return request(`/api/admin/reviews/${id}`, {}, true);
}

/**
 * Send only what is changing — the other field keeps whatever it said, and an
 * edit that changes nothing does not write a history entry.
 *
 * @param {number} id
 * @param {{ rating?: number, body?: string }} data
 */
export function adminUpdateReview(id, data) {
	return request(`/api/admin/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, true);
}

/** Hard delete: the review and its history go together. @param {number} id */
export function adminDeleteReview(id) {
	return request(`/api/admin/reviews/${id}`, { method: 'DELETE' }, true);
}

/** @param {{ q?: string, type?: string, status?: string, missing?: string, genre?: string, yearFrom?: number, yearTo?: number, sort?: string, page?: number, limit?: number }} [params] */
export function adminWorks(params = {}) {
	return request(`/api/admin/works${query(params)}`, {}, true);
}

/** Every genre there is, for the filter and the editor. */
export function adminGenres() {
	return request('/api/admin/works/genres', {}, true);
}

/** @param {number} id */
export function adminWork(id) {
	return request(`/api/admin/works/${id}`, {}, true);
}

/**
 * One action over a selection: flag as 18+, un-flag, hide, or bring back.
 *
 * Flagging as 18+ hides the title too — the flag records why it is hidden
 * rather than being a second kind of hidden. See WorkAdmin on the API side.
 *
 * @param {number[]} ids
 * @param {'adult' | 'not_adult' | 'delete' | 'restore'} action
 * @returns {Promise<{ changed: number, skipped: number }>}
 */
export function adminBulkWorks(ids, action) {
	return request('/api/admin/works/bulk', { method: 'POST', body: JSON.stringify({ ids, action }) }, true);
}

/**
 * Only the fields being corrected. Type and slug are identity and cannot be
 * sent; external score and popularity belong to TMDB.
 *
 * @param {number} id
 * @param {Record<string, any>} data
 */
export function adminUpdateWork(id, data) {
	return request(`/api/admin/works/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, true);
}

/**
 * Hides a work from the catalog. Not a delete — shelves, reviews and seen
 * marks all survive and come back with it.
 *
 * @param {number} id
 */
export function adminHideWork(id) {
	return request(`/api/admin/works/${id}`, { method: 'DELETE' }, true);
}

/** @param {number} id */
export function adminRestoreWork(id) {
	return request(`/api/admin/works/${id}/restore`, { method: 'POST' }, true);
}

/** @param {{ q?: string, photo?: string, credits?: string, sort?: string, page?: number, limit?: number }} [params] */
export function adminPeople(params = {}) {
	return request(`/api/admin/people${query(params)}`, {}, true);
}

/** Type-ahead for the merge picker and the credit editor. Needs 2+ characters. */
export function adminPeopleSearch(q, limit = 8) {
	return request(`/api/admin/people/search${query({ q, limit })}`, {}, true);
}

/** @param {number} id @param {{ page?: number, limit?: number }} [params] */
export function adminPerson(id, params = {}) {
	return request(`/api/admin/people/${id}${query(params)}`, {}, true);
}

/** @param {number} id @param {{ name?: string, photo?: string, externalId?: string }} data */
export function adminUpdatePerson(id, data) {
	return request(`/api/admin/people/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, true);
}

/**
 * Folds `id` into `into`: credits move, the duplicate row goes. Not reversible.
 *
 * @param {number} id the one that disappears
 * @param {number} into the one that survives
 */
export function adminMergePeople(id, into) {
	return request(`/api/admin/people/${id}/merge/${into}`, { method: 'POST' }, true);
}

/** @param {number} id @param {boolean} [force] delete even if credits point at them */
export function adminDeletePerson(id, force = false) {
	return request(`/api/admin/people/${id}${force ? '?force=1' : ''}`, { method: 'DELETE' }, true);
}

/** @param {number} workId */
export function adminCredits(workId) {
	return request(`/api/admin/works/${workId}/credits`, {}, true);
}

/**
 * The person is named, not chosen by id — an unfamiliar name creates them,
 * which is what the crawler does too.
 *
 * @param {number} workId
 * @param {{ person: string, role: string, character?: string }} data
 */
export function adminAddCredit(workId, data) {
	return request(
		`/api/admin/works/${workId}/credits`,
		{ method: 'POST', body: JSON.stringify(data) },
		true
	);
}

/** @param {number} id @param {{ role?: string, character?: string, position?: number }} data */
export function adminUpdateCredit(id, data) {
	return request(`/api/admin/credits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, true);
}

/** @param {number} id */
export function adminDeleteCredit(id) {
	return request(`/api/admin/credits/${id}`, { method: 'DELETE' }, true);
}

export function adminFeedback(params = {}) {
	return request(`/api/admin/feedback?${new URLSearchParams(params)}`, {}, true);
}

export function adminSetFeedbackStatus(id, status, note) {
	return request(`/api/admin/feedback/${id}/status`, {
		method: 'POST',
		body: JSON.stringify({ status, note })
	}, true);
}

export function adminUpdateFeedback(id, patch) {
	return request(`/api/admin/feedback/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, true);
}

export function adminDeleteFeedback(id) {
	return request(`/api/admin/feedback/${id}`, { method: 'DELETE' }, true);
}
