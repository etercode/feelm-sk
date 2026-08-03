/*
 * Signed-in user + token session. Tokens live in localStorage; the user object
 * comes from GET /api/me after hydrate or login.
 */

import { browser } from '$app/environment';
import * as api from '$lib/api/client.js';
import { t } from '$lib/i18n/index.svelte.js';
import { ApiError } from '$lib/api/client.js';
import { clearTokens, hasTokens } from '$lib/auth/tokens.js';
import { library } from '$lib/state/library.svelte.js';

class Session {
	/** @type {{ id: number, username: string, name: string, tagline?: string|null, bio?: string|null, location?: string|null, avatar?: string|null, joinedAt?: string|null, roles?: string[], handlePending?: boolean, locale?: string, timezone?: string } | null} */
	user = $state(null);

	#hydrated = false;
	/** @type {Promise<void> | null} */
	#hydratePromise = null;

	get isSignedIn() {
		return this.user !== null;
	}

	/**
	 * Whether to offer the admin section at all.
	 *
	 * Both of these only decide what to render. The server checks again on
	 * every /api/admin call, so a doctored localStorage buys an empty table
	 * and a row of 403s.
	 */
	get isModerator() {
		const roles = this.user?.roles ?? [];
		return roles.includes('ROLE_MODERATOR') || roles.includes('ROLE_ADMIN');
	}

	get isAdmin() {
		return this.user?.roles?.includes('ROLE_ADMIN') ?? false;
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
			return { ok: false, error: t('auth.enterBoth') };
		}

		try {
			await api.login({ username, password });
			const me = await api.getMe();
			this.user = me;
			library.rememberUser(me);
			await library.hydrateForUser(me);
			return { ok: true };
		} catch (e) {
			return { ok: false, error: this.#errorMessage(e, t('auth.couldNotSignIn')) };
		}
	}

	async signInAsDemo() {
		return this.signIn('kaan', 'password123');
	}

	/**
	 * Signs in with the ID token Google gave the browser.
	 *
	 * From the token pair onwards this is identical to a password sign-in —
	 * which is the point of doing the exchange server-side.
	 *
	 * @param {string} credential
	 */
	async signInWithGoogle(credential) {
		try {
			const { user } = await api.loginWithGoogle(credential);
			this.user = user ?? (await api.getMe());
			library.rememberUser(this.user);
			await library.hydrateForUser(this.user);
			return { ok: true };
		} catch (e) {
			if (e instanceof ApiError && e.status === 503) {
				return { ok: false, error: t('auth.googleNotSetUp') };
			}
			return { ok: false, error: this.#errorMessage(e, t('auth.couldNotGoogle')) };
		}
	}

	/**
	 * The one chance a Google-created account has to change its handle.
	 *
	 * @param {string} username
	 */
	async chooseUsername(username) {
		const handle = username.trim();
		if (handle.length < 3) return { ok: false, error: t('welcome.tooShort') };
		if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
			return { ok: false, error: t('welcome.badCharacters') };
		}

		try {
			this.applyUser(await api.chooseUsername(handle));
			return { ok: true };
		} catch (e) {
			if (e instanceof ApiError && e.status === 409) {
				return { ok: false, error: t('welcome.taken') };
			}
			return { ok: false, error: this.#errorMessage(e, t('welcome.couldNotSave')) };
		}
	}

	/**
	 * @param {{ username: string, name: string, email: string, tagline?: string, password: string }} data
	 */
	async register({ username, name, email, tagline, password }) {
		const handle = username.trim().toLowerCase();
		if (!handle) return { ok: false, error: t('auth.pickUsername') };
		if (!email?.trim()) return { ok: false, error: t('auth.emailRequired') };
		if (!password || password.length < 8) {
			return { ok: false, error: t('auth.passwordTooShort') };
		}

		try {
			await api.register({
				username: handle,
				email: email.trim(),
				password,
				name: name.trim() || handle,
				tagline: tagline?.trim() || undefined
			});
			return this.signIn(handle, password);
		} catch (e) {
			if (e instanceof ApiError && e.status === 409) {
				return {
					ok: false,
					error:
						e.body?.error === 'email_already_used'
							? t('auth.emailTaken')
							: t('auth.usernameTaken')
				};
			}
			return { ok: false, error: this.#errorMessage(e, t('auth.couldNotCreate')) };
		}
	}

	/**
	 * Takes the user the API just returned after a profile save.
	 *
	 * The library keeps its own copy of everyone it has seen — that is what
	 * profile pages, feeds and review bylines read from — so a rename has to
	 * land in both or the new name shows in the header and the old one
	 * everywhere else.
	 *
	 * @param {any} me
	 */
	applyUser(me) {
		if (!me) return;
		this.user = me;
		library.rememberUser(me);
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
			if (e.status === 401) return t('auth.invalidCredentials');
			if (typeof e.body?.message === 'string') return e.body.message;
			if (typeof e.message === 'string' && e.message !== `Request failed (${e.status})`) {
				return e.message;
			}
		}
		return fallback;
	}
}

export const session = new Session();
