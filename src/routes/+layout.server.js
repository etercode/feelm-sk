/*
 * Hands the language the hook resolved down to the root layout.
 *
 * It has to travel as load data rather than be read from a cookie in the
 * component: the server render has no `document`, and reading it only in the
 * browser would mean the server rendered English and the client swapped it out
 * — the flash this whole arrangement exists to avoid.
 */

/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals }) {
	return {
		locale: locals.locale,
		timezone: locals.timezone
	};
}
