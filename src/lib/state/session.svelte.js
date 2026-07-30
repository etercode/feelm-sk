/*
 * Signed-in user + token session. Tokens live in localStorage; the user object
 * comes from GET /api/me after hydrate or login.
 */

import { browser } from '$app/environment';
import * as api from '$lib/api/client.js';
import { ApiError } from '$lib/api/client.js';
import { clearTokens, hasTokens } from '$lib/auth/tokens.js';
import { library } from '$lib/state/library.svelte.js';

class Session {
	/** @type {{ id: number, username: string, name: string, tagline?: string|null, bio?: string|null, location?: string|null, joinedAt?: string|null } | null} */
	user = $state(null);

	#hydrated = false;
	/** @type {Promise<void> | null} */
	#hydratePromise = null;

	get isSignedIn() {
		return this.user !== null;
	}

	/** Restores tokens and loads /api/me once the browser has taken over. */
	hydrate() {
		if (!browser || this.#hydrated) return this.#hydratePromise ?? Promise.resolve();
		this.#hydrated = true;
		this.#hydratePromise = this.#restore();
		return this.#hydratePromise;
	}

	async #restore() {
		if (!hasTokens()) return;
		try {
			const me = await api.getMe();
			this.user = me;
			library.rememberUser(me);
			await library.hydrateForUser(me);
		} catch {
			clearTokens();
			this.user = null;
		}
	}

	/**
	 * @param {string} login
	 * @param {string} password
	 */
	async signIn(login, password) {
		const username = login.trim().toLowerCase();
		if (!username || !password) {
			return { ok: false, error: 'Enter a username and password.' };
		}

		try {
			await api.login({ username, password });
			const me = await api.getMe();
			this.user = me;
			library.rememberUser(me);
			await library.hydrateForUser(me);
			return { ok: true };
		} catch (e) {
			return { ok: false, error: this.#errorMessage(e, 'Could not sign in.') };
		}
	}

	async signInAsDemo() {
		return this.signIn('kaan', 'password123');
	}

	/**
	 * @param {{ username: string, name: string, tagline?: string, password: string }} data
	 */
	async register({ username, name, tagline, password }) {
		const handle = username.trim().toLowerCase();
		if (!handle) return { ok: false, error: 'Pick a username.' };
		if (!password || password.length < 8) {
			return { ok: false, error: 'Password must be at least 8 characters.' };
		}

		try {
			await api.register({
				username: handle,
				password,
				name: name.trim() || handle,
				tagline: tagline?.trim() || undefined
			});
			return this.signIn(handle, password);
		} catch (e) {
			if (e instanceof ApiError && e.status === 409) {
				return { ok: false, error: 'That username is taken.' };
			}
			return { ok: false, error: this.#errorMessage(e, 'Could not create account.') };
		}
	}

	async signOut() {
		try {
			await api.logout();
		} catch {
			clearTokens();
		}
		this.user = null;
		library.clearUserData();
	}

	/** @param {unknown} e @param {string} fallback */
	#errorMessage(e, fallback) {
		if (e instanceof ApiError) {
			if (e.status === 401) return 'Invalid username or password.';
			if (typeof e.body?.message === 'string') return e.body.message;
			if (typeof e.message === 'string' && e.message !== `Request failed (${e.status})`) {
				return e.message;
			}
		}
		return fallback;
	}
}

export const session = new Session();
