import { browser } from '$app/environment';

const ACCESS_KEY = 'feelm_access_token';
const REFRESH_KEY = 'feelm_refresh_token';
const EXPIRES_KEY = 'feelm_expires_at';

/** @param {{ access_token: string, refresh_token: string, expires_at: string }} tokens */
export function saveTokens(tokens) {
	if (!browser) return;
	localStorage.setItem(ACCESS_KEY, tokens.access_token);
	localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
	localStorage.setItem(EXPIRES_KEY, tokens.expires_at);
}

export function clearTokens() {
	if (!browser) return;
	localStorage.removeItem(ACCESS_KEY);
	localStorage.removeItem(REFRESH_KEY);
	localStorage.removeItem(EXPIRES_KEY);
}

export function getAccessToken() {
	if (!browser) return null;
	return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
	if (!browser) return null;
	return localStorage.getItem(REFRESH_KEY);
}

export function hasTokens() {
	return Boolean(getAccessToken() && getRefreshToken());
}
