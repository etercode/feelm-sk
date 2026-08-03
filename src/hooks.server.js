/*
 * Decides what language a request is answered in, before anything renders.
 *
 * The order is cookie, then Accept-Language, then English. The cookie is a
 * deliberate choice and beats a header the visitor never set; the header is a
 * good first guess for somebody who has not chosen yet, and getting that guess
 * right on the first paint is the difference between arriving at a site in your
 * language and arriving at an English one that corrects itself a moment later.
 *
 * An account's saved language is deliberately *not* consulted here. The session
 * lives in localStorage and the API needs a bearer token, neither of which this
 * hook has; the browser applies the account's choice after hydration and writes
 * it to the cookie, so the request after that one already knows.
 */

import {
	DEFAULT_LOCALE,
	DEFAULT_TIMEZONE,
	LOCALE_COOKIE,
	TIMEZONE_COOKIE,
	fromAcceptLanguage,
	isSupported
} from '$lib/i18n/locales.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const chosen = event.cookies.get(LOCALE_COOKIE);

	event.locals.locale = isSupported(chosen)
		? chosen
		: (fromAcceptLanguage(event.request.headers.get('accept-language')) ?? DEFAULT_LOCALE);

	/*
	 * There is no header that carries a timezone, so an unseeded request is
	 * rendered in UTC and the browser corrects it after hydration. Dates without
	 * a time — release dates, air dates, the bulk of what this site shows — are
	 * formatted in UTC anyway, so most of the page is not affected either way.
	 */
	event.locals.timezone = event.cookies.get(TIMEZONE_COOKIE) || DEFAULT_TIMEZONE;

	return resolve(event, {
		// <html lang> matters to screen readers, to the browser's own translation
		// offer, and to how a font picks a glyph for a Turkish dotless ı.
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});
}
