/*
 * Where to watch it.
 *
 * The one thing this app deliberately does not do is play anything, so the
 * honest ending to a detail page is a way out to somewhere that does. Nobody
 * needs help typing a title into Google — what they need help with is the rest
 * of the query, and the app already knows all of it: the year that separates
 * this Dune from the other one, the original title that finds it in its own
 * country, who directed it, what language it was shot in.
 *
 * This file turns a work into the pieces such a query could be made of, and
 * joins the chosen ones. What is chosen is a preference rather than a property
 * of the work, so it lives in state/watch.svelte.js and is remembered.
 */

import { i18n, t } from '$lib/i18n/index.svelte.js';

/**
 * Where the query is sent. General search engines only: this hands somebody a
 * better-worded search than they would have typed and stops there.
 */
export const engines = {
	google: { label: 'Google', url: 'https://www.google.com/search?q=' },
	bing: { label: 'Bing', url: 'https://www.bing.com/search?q=' },
	duckduckgo: { label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' }
};

export const engineKeys = Object.keys(engines);

/**
 * "en" → "English", in whatever language the reader is using.
 *
 * @param {string | null | undefined} code an ISO 639-1 code from the catalog
 */
function languageName(code) {
	if (!code) return null;

	try {
		return new Intl.DisplayNames([i18n.tag], { type: 'language' }).of(code) ?? null;
	} catch {
		// An engine without DisplayNames, or a code it has never heard of. A
		// missing word in a search box is not worth taking the page down for.
		return null;
	}
}

/**
 * Who is credited — a different field for every type, which is why this is a
 * function and not a property read at the call site.
 *
 * @param {any} item
 */
function makerOf(item) {
	const details = item.details ?? {};
	const credited =
		details.directors ?? details.authors ?? details.developers ?? details.creators ?? [];

	return credited[0] ?? null;
}

/**
 * The pieces a query can be built from, in the order they are joined.
 *
 * Each carries the words it contributes rather than a name for them, so the
 * chips can show the text itself: "2026" and "Christopher Nolan" say what they
 * will do to the search, where "Year" and "Director" only describe it.
 *
 * Titles are quoted. A three-word title is otherwise three loose words, and
 * that is the difference between finding a film and finding an essay about it.
 *
 * @param {any} item
 */
export function watchParts(item) {
	const details = item.details ?? {};
	const original =
		item.originalTitle && item.originalTitle !== item.title ? item.originalTitle : null;

	return [
		{ key: 'title', text: `"${item.title}"`, always: true },
		{ key: 'year', text: item.year ? String(item.year) : null },
		{ key: 'intent', text: t(`work.intent.${item.type}`) },
		{ key: 'originalTitle', text: original ? `"${original}"` : null },
		{ key: 'maker', text: makerOf(item) },
		{ key: 'language', text: languageName(details.originalLanguage) }
	].filter((part) => part.text);
}

/**
 * @param {ReturnType<typeof watchParts>} parts
 * @param {string[]} on which optional keys are switched on
 * @param {string} words the reader's own additions
 */
export function buildQuery(parts, on, words) {
	const chosen = parts
		.filter((part) => part.always || on.includes(part.key))
		.map((part) => part.text);

	return [...chosen, (words ?? '').trim()].filter(Boolean).join(' ');
}

/**
 * @param {string} engine
 * @param {string} query
 */
export function searchUrl(engine, query) {
	return (engines[engine] ?? engines.google).url + encodeURIComponent(query);
}
