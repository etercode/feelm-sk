/**
 * Small display helpers. Everything here takes raw data and returns a string.
 *
 * Every one of them reads the current language, either through `t()` or through
 * `Intl`, so none is a pure function of its argument any more — it is a function
 * of the argument and the language, and because the language is a rune, calling
 * one during render subscribes that component to it. Switching language redraws
 * every date and duration on the page without a reload.
 */

import { i18n, t } from '$lib/i18n/index.svelte.js';

/** 142 → "2h 22m" */
export function duration(minutes) {
	if (!minutes) return '';
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (!h) return t('format.minutesOnly', { m });
	return m ? t('format.hoursMinutes', { h, m }) : t('format.hoursOnly', { h });
}

/**
 * A date with no time of day in it — "1994-09-23" — is a fact about a calendar,
 * not a moment. Parsed as UTC midnight and then drawn in a zone behind UTC it
 * slips to the day before, so a release date would read differently in Los
 * Angeles than in Baku for no reason anybody would accept. Those are formatted
 * in UTC whatever the viewer's zone; only real timestamps get the zone applied.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** @param {string} iso */
function zoneFor(iso) {
	return DATE_ONLY.test(iso) ? 'UTC' : i18n.timezone;
}

/** "1994-09-23" → "23 Sep 1994" */
export function longDate(iso) {
	if (!iso) return '';

	return new Intl.DateTimeFormat(i18n.tag, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: zoneFor(iso)
	}).format(new Date(iso));
}

/** A timestamp turned into "just now", "4h ago", "12 Mar". */
export function timeAgo(iso) {
	if (!iso) return '';
	const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) return t('format.justNow');
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return t('format.minutesAgo', { n: minutes });
	const hours = Math.round(minutes / 60);
	if (hours < 24) return t('format.hoursAgo', { n: hours });
	const days = Math.round(hours / 24);
	if (days < 7) return t('format.daysAgo', { n: days });

	const parts =
		days < 365 ? { day: 'numeric', month: 'short' } : { month: 'short', year: 'numeric' };

	return new Intl.DateTimeFormat(i18n.tag, { ...parts, timeZone: zoneFor(iso) }).format(
		new Date(iso)
	);
}

/** "2026-12-18" → "in 142 days" / "tomorrow" / "out now". */
export function untilRelease(iso) {
	if (!iso) return '';
	const day = 24 * 60 * 60 * 1000;
	const today = new Date(new Date().toISOString().slice(0, 10));
	const days = Math.round((new Date(iso) - today) / day);
	if (days <= 0) return t('format.outNow');
	if (days === 1) return t('format.tomorrow');
	if (days < 30) return t('format.inDays', { n: days });
	if (days < 365) return t('format.inMonths', { n: Math.round(days / 30) });
	return t('format.inYears', { n: Number((days / 365).toFixed(1)) });
}

/**
 * ["a", "b", "c"] → "a, b and c" (capped, with "+2" style overflow).
 *
 * `Intl.ListFormat` rather than a hardcoded " and ": Russian joins with " и ",
 * Turkish with " ve ", and none of them punctuates the list the same way.
 */
export function list(values, max = 3) {
	const items = (values ?? []).filter(Boolean);
	if (!items.length) return '';

	if (items.length <= max) {
		return new Intl.ListFormat(i18n.tag, { style: 'long', type: 'conjunction' }).format(items);
	}

	return `${items.slice(0, max).join(', ')} +${items.length - max}`;
}

/**
 * A counted noun — "3 seasons", "3 сезона", "3 sezon".
 *
 * Replaces the old `plural(count, one, many)`, which could only ever express the
 * two forms English has: Russian needs three and Turkish needs one. The key
 * names the noun; the dictionary owns how many forms that noun takes.
 *
 * Null for a null count, as before. Callers pass counts straight out of a
 * payload and those are legitimately missing — a series whose extra never
 * recorded a season count — and every caller filters falsy values out of its
 * line already. "undefined seasons" once shipped to a card exactly as written.
 *
 * @param {string} key A `count.*` key.
 * @param {number | null | undefined} count
 * @returns {string | null}
 */
export function counted(key, count) {
	if (count === null || count === undefined || Number.isNaN(count)) return null;

	return t(key, { count });
}

/** A 0–100 source score as stars out of 5, rounded to a half. */
export function scoreToStars(score) {
	if (!score) return null;
	return Math.round((score / 20) * 2) / 2;
}

export function initials(name) {
	return (name ?? '')
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0].toUpperCase())
		.join('');
}

/** Stable 0–359 hue from a string, so avatars keep the same colour everywhere. */
export function hueOf(seed) {
	let hash = 0;
	for (let i = 0; i < (seed ?? '').length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
	return hash;
}

/** 12400 → "12K". The suffix comes from the language, not a hardcoded "k". */
export function compactNumber(value) {
	return new Intl.NumberFormat(i18n.tag, {
		notation: 'compact',
		maximumFractionDigits: 1
	}).format(value ?? 0);
}

/**
 * A rating on IMDb's scale, always to one decimal — 7.0, not 7.
 *
 * The decimal is not decoration: it is how IMDb prints its own scores, and in a
 * column of choices it keeps 7.0 and 6.5 the same width. The separator comes
 * from the language, so Turkish and Russian get a comma.
 */
export function rating(value) {
	return new Intl.NumberFormat(i18n.tag, {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	}).format(value ?? 0);
}

/**
 * A plain number with the language's own grouping — 1,234 or 1 234.
 *
 * Replaces the `.toLocaleString()` calls scattered through the templates, which
 * read the *browser's* locale and so ignored the language the site was being
 * shown in.
 */
export function number(value) {
	return new Intl.NumberFormat(i18n.tag).format(value ?? 0);
}
