/*
 * The site's language and clock.
 *
 * `t('key')` reads `locale`, which is a rune, so every string in every template
 * re-renders the moment the language changes. That is the whole design: no
 * reload, no per-component subscription, no context to thread through.
 *
 * ---- why a module singleton is safe on the server -----------------------
 *
 * This object is shared by every request the Node adapter serves, which for
 * mutable per-request state would be a bug — request A's Turkish leaking into
 * request B's page. It does not happen here because of when `use()` is called:
 * SvelteKit awaits all load functions first, then renders, and Svelte's server
 * render is synchronous from the root component down. The root layout calls
 * `use()` in its script body, so the assignment and every read of it happen
 * inside one uninterrupted synchronous stretch of a single-threaded process.
 * Nothing can interleave.
 *
 * The load-bearing word is *synchronous*. If this app ever turns on async SSR,
 * this file has to move to a context or an AsyncLocalStorage, and this comment
 * is the reason why.
 */

import { browser } from '$app/environment';
import {
	DEFAULT_LOCALE,
	DEFAULT_TIMEZONE,
	LOCALE_COOKIE,
	TIMEZONE_COOKIE,
	intlTag,
	isSupported
} from './locales.js';
import { messages } from './messages/index.js';

/** A year, in seconds. Long enough that the choice outlives the browsing. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

class I18n {
	/** @type {import('./locales.js').LocaleCode} */
	locale = $state(DEFAULT_LOCALE);

	/** An IANA zone name. Display only — everything on the wire is UTC. */
	timezone = $state(DEFAULT_TIMEZONE);

	/** The BCP 47 tag for `Intl`, derived so callers never map it themselves. */
	tag = $derived(intlTag(this.locale));

	/**
	 * Whether somebody has chosen a language since this page was loaded.
	 *
	 * Plain, not a rune: nothing renders from it, and making it reactive would
	 * only add a dependency for the templates that read `locale`.
	 */
	#chosen = false;

	/**
	 * Sets the language for this render without touching the cookie.
	 *
	 * Called by the root layout with whatever the server resolved. Writing a
	 * cookie here would be wrong twice over: on the server there is no document,
	 * and on the client this runs on navigations nobody made a choice on.
	 *
	 * It also steps aside once a choice *has* been made. The root layout's data
	 * comes from a server load that does not re-run on client navigation, so it
	 * keeps reporting the language the page was first served in; without this
	 * guard, picking Turkish in settings and then clicking through to /movies
	 * would put the site back into English.
	 *
	 * @param {string | null | undefined} locale
	 * @param {string | null | undefined} timezone
	 */
	use(locale, timezone) {
		if (this.#chosen) return;

		if (isSupported(locale) && locale !== this.locale) this.locale = locale;
		if (timezone && timezone !== this.timezone) this.timezone = timezone;
	}

	/**
	 * A deliberate choice, remembered.
	 *
	 * The cookie rather than localStorage because the server reads it: it is
	 * what makes the *first* paint of the next visit come out in the right
	 * language instead of flashing English and correcting itself.
	 *
	 * @param {string} locale
	 * @param {string} [timezone]
	 */
	choose(locale, timezone) {
		if (isSupported(locale)) {
			this.#chosen = true;
			this.locale = locale;
			writeCookie(LOCALE_COOKIE, locale);
		}

		if (timezone) {
			this.#chosen = true;
			this.timezone = timezone;
			writeCookie(TIMEZONE_COOKIE, timezone);
		}
	}

	/**
	 * What the browser believes the local zone is.
	 *
	 * Used only to seed somebody who has never chosen. It is a guess — a VPN
	 * moves it — but it is a far better guess than UTC, and the dropdown is
	 * right there for the cases where it is wrong.
	 */
	guessTimezone() {
		if (!browser) return DEFAULT_TIMEZONE;
		try {
			return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
		} catch {
			return DEFAULT_TIMEZONE;
		}
	}

	/**
	 * Writes a timezone cookie for somebody who has never set one.
	 *
	 * Until this runs the server has no idea what clock the visitor keeps and
	 * renders timestamps in UTC. One write on the first visit is what makes
	 * every later request server-render them correctly, and it is not a choice
	 * being made for anybody — the dropdown in settings overrides it, and doing
	 * so writes the same cookie.
	 */
	seedTimezone() {
		if (!browser || readCookie(TIMEZONE_COOKIE)) return;

		const guess = this.guessTimezone();
		// Latched for the same reason a choice is: the server said UTC only
		// because it had nothing better, and it must not win it back.
		this.#chosen = true;
		this.timezone = guess;
		writeCookie(TIMEZONE_COOKIE, guess);
	}

	/**
	 * Look up a message.
	 *
	 * Placeholders are `{named}` and are replaced from `params`. Passing a
	 * `count` also selects a plural form: the dictionary may carry `key.one`,
	 * `key.few`, `key.many` and `key.other`, and `Intl.PluralRules` picks
	 * between them. Which forms exist is a property of the language — Russian
	 * needs three, Turkish and Azerbaijani need one — so a dictionary only
	 * writes the ones its language actually uses, and `key.other` is the answer
	 * when the chosen form is not there.
	 *
	 * A missing key falls back to English and then to the key itself, because a
	 * visible `feed.empty` in the page is a bug report and a blank space is not.
	 *
	 * @param {string} key
	 * @param {Record<string, string | number>} [params]
	 * @returns {string}
	 */
	t(key, params) {
		const dictionary = messages[this.locale] ?? messages[DEFAULT_LOCALE];
		const plural = params && 'count' in params ? pluralKey(this.tag, Number(params.count)) : null;

		const template =
			(plural ? dictionary[`${key}.${plural}`] : undefined) ??
			dictionary[`${key}.other`] ??
			dictionary[key] ??
			(plural ? messages[DEFAULT_LOCALE][`${key}.${plural}`] : undefined) ??
			messages[DEFAULT_LOCALE][`${key}.other`] ??
			messages[DEFAULT_LOCALE][key] ??
			key;

		return params ? fill(template, params, this.tag) : template;
	}
}

/**
 * @param {string} tag
 * @param {number} count
 */
function pluralKey(tag, count) {
	if (!Number.isFinite(count)) return 'other';
	try {
		return new Intl.PluralRules(tag).select(count);
	} catch {
		return count === 1 ? 'one' : 'other';
	}
}

/**
 * Numbers are formatted on the way in, so a template never has to think about
 * the fact that Russian writes 1 234 and English writes 1,234.
 *
 * @param {string} template
 * @param {Record<string, string | number>} params
 * @param {string} tag
 */
function fill(template, params, tag) {
	return template.replace(/\{(\w+)\}/g, (whole, name) => {
		const value = params[name];
		if (value === undefined || value === null) return whole;

		return typeof value === 'number' ? new Intl.NumberFormat(tag).format(value) : String(value);
	});
}

/** @param {string} name */
function readCookie(name) {
	if (!browser) return null;
	const hit = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));

	return hit ? decodeURIComponent(hit[1]) : null;
}

/** @param {string} name @param {string} value */
function writeCookie(name, value) {
	if (!browser) return;
	// SameSite=Lax so it rides along with the top-level navigation the server
	// needs it on, and no Secure flag because development is plain http.
	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Splits a translated sentence into the literal text around its placeholders
 * and the placeholders themselves.
 *
 * For the feed line, where the two holes are filled with links rather than
 * text: `t()` cannot help there because it returns a string, and a string
 * cannot contain an anchor element. This hands the template the pieces in the
 * language's own order, which is the whole point — "{person} watched {title}"
 * and "{person}, {title} filmini izledi" put them in different places.
 *
 * @param {string} template
 * @returns {Array<{ text: string } | { slot: string }>}
 */
export function segments(template) {
	/** @type {Array<{ text: string } | { slot: string }>} */
	const parts = [];
	let last = 0;

	for (const hit of template.matchAll(/\{(\w+)\}/g)) {
		if (hit.index > last) parts.push({ text: template.slice(last, hit.index) });
		parts.push({ slot: hit[1] });
		last = hit.index + hit[0].length;
	}

	if (last < template.length) parts.push({ text: template.slice(last) });

	return parts;
}

export const i18n = new I18n();

/**
 * The short name every template imports.
 *
 * A standalone function rather than a method so call sites read as `{t('x')}`
 * instead of `{i18n.t('x')}`. It still reads `i18n.locale` on the way through,
 * which is what keeps it reactive.
 *
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 */
export function t(key, params) {
	return i18n.t(key, params);
}
