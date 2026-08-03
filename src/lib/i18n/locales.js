/*
 * The languages the site ships, and the small amount of data that is about a
 * language rather than written in one.
 *
 * Kept in its own file with no imports so the server hooks, the settings page
 * and the message loader can all read it without dragging a dictionary — or a
 * rune, which would make it unusable in hooks.server.js — along with it.
 *
 * `code` must match a file in ./messages and an entry in the API's
 * User::SUPPORTED_LOCALES. Adding a language means touching all three.
 */

/**
 * @typedef {'en' | 'az' | 'tr' | 'ru'} LocaleCode
 */

/**
 * Names are written in the language they name. Somebody looking for Russian is
 * looking for "Русский", and if the site is currently in a language they cannot
 * read, a translated list of language names is no help at all — theirs has to
 * be recognisable from inside any of the others.
 *
 * @type {{ code: LocaleCode, name: string, english: string, intl: string }[]}
 */
export const LOCALES = [
	{ code: 'en', name: 'English', english: 'English', intl: 'en-GB' },
	{ code: 'az', name: 'Azərbaycan dili', english: 'Azerbaijani', intl: 'az-AZ' },
	{ code: 'tr', name: 'Türkçe', english: 'Turkish', intl: 'tr-TR' },
	{ code: 'ru', name: 'Русский', english: 'Russian', intl: 'ru-RU' }
];

/** @type {LocaleCode} */
export const DEFAULT_LOCALE = 'en';

export const DEFAULT_TIMEZONE = 'UTC';

export const LOCALE_COOKIE = 'feelm_locale';
export const TIMEZONE_COOKIE = 'feelm_tz';

/** @type {LocaleCode[]} */
export const LOCALE_CODES = LOCALES.map((l) => l.code);

/**
 * The BCP 47 tag to hand `Intl` for a locale of ours.
 *
 * Ours are bare language codes because that is what the account column stores
 * and what the URL would carry; Intl wants a region to pick a date order and a
 * decimal separator, and its guess for a bare "az" is not one worth relying on.
 *
 * @param {string} code
 */
export function intlTag(code) {
	return LOCALES.find((l) => l.code === code)?.intl ?? 'en-GB';
}

/** @param {unknown} code @returns {code is LocaleCode} */
export function isSupported(code) {
	return typeof code === 'string' && LOCALE_CODES.includes(/** @type {LocaleCode} */ (code));
}

/**
 * Best supported match for an Accept-Language header.
 *
 * Deliberately ignores q-weights and reads the list in order. Browsers send
 * theirs in preference order already, and the one case where weights would
 * change the answer — a header hand-written to prefer a language further down
 * the list — is not one worth the parser.
 *
 * @param {string | null | undefined} header
 * @returns {LocaleCode | null}
 */
export function fromAcceptLanguage(header) {
	for (const part of (header ?? '').split(',')) {
		const tag = part.split(';')[0].trim().toLowerCase();
		if (!tag) continue;

		// "tr-TR" and "tr" both mean Turkish to us; we have no regional variants.
		const base = tag.split('-')[0];
		if (isSupported(base)) return base;
	}

	return null;
}
