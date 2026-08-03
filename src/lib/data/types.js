/*
 * Every activity is the same envelope — id, type, title, artwork, details —
 * and this file is the only place that knows what makes each type different.
 *
 * A type describes:
 *   - what a shelf status is called (backlog vs watchlist)
 *   - which of its `details` are worth showing, and in what order
 *
 * Cards, detail pages and profiles read this registry instead of branching on
 * item.type themselves, so adding "podcast" later means adding an entry here.
 *
 * ---- why the labels are getters ----------------------------------------
 *
 * `label`, `plural` and `statuses` are accessors rather than strings because
 * this object is built once when the module loads and the language can change
 * afterwards. A getter is evaluated at the moment a template reads it, so it
 * sees the language in force then — and, because `t()` reads a rune, reading
 * `types.movie.plural` in a template is what subscribes that template to a
 * language change. Every call site still says `types[key].plural`; only this
 * file knows it became a lookup.
 *
 * How somebody talks about an activity — "Kaan watched Dune" — used to live
 * here as a `verb`, and no longer can: Turkish and Azerbaijani put the verb
 * last, so the sentence has to be translated whole. See `activitySentence`
 * below and the `activity.*` keys in the dictionaries.
 */

import { t } from '$lib/i18n/index.svelte.js';
import { counted, duration, list, longDate } from '$lib/util/format.js';

/** A facet is one row of the detail sheet: a label and either text or chips. */
function text(label, value) {
	return value ? { label, value: String(value) } : null;
}

function chips(label, values) {
	return values?.length ? { label, chips: values } : null;
}

function collectionFacet(details) {
	const part = details.collection;
	if (!part) return null;

	return text(part.name, t('facet.collectionPart', { part: part.part, total: part.total }));
}

/** The four shelf states for one type, each resolved when it is read. */
function statusesOf(type) {
	return {
		get wishlist() {
			return t(`status.${type}.wishlist`);
		},
		get active() {
			return t(`status.${type}.active`);
		},
		get done() {
			return t(`status.${type}.done`);
		},
		get dropped() {
			return t(`status.${type}.dropped`);
		}
	};
}

export const types = {
	movie: {
		key: 'movie',
		get label() {
			return t('type.movie.label');
		},
		get plural() {
			return t('type.movie.plural');
		},
		browse: '/movies',
		statuses: statusesOf('movie'),
		line: (item) =>
			[item.year, duration(item.details.runtime), item.details.certification].filter(Boolean),
		facets: (item) => [
			text(t('facet.directedBy'), list(item.details.directors)),
			text(t('facet.writtenBy'), list(item.details.writers)),
			text(t('facet.runtime'), duration(item.details.runtime)),
			text(t('facet.released'), longDate(item.details.releaseDate)),
			text(t('facet.rated'), item.details.certification),
			collectionFacet(item.details)
		]
	},

	series: {
		key: 'series',
		get label() {
			return t('type.series.label');
		},
		get plural() {
			return t('type.series.plural');
		},
		browse: '/series',
		statuses: statusesOf('series'),
		line: (item) => [
			item.year,
			counted('count.season', item.details.seasonCount),
			counted('count.episode', item.details.episodeCount)
		],
		facets: (item) => [
			text(t('facet.createdBy'), list(item.details.creators)),
			text(t('facet.network'), item.details.network),
			text(t('facet.status'), item.details.status),
			text(t('facet.seasons'), item.details.seasonCount),
			text(t('facet.episodes'), item.details.episodeCount),
			text(t('facet.episodeLength'), duration(item.details.episodeRuntime)),
			text(t('facet.firstAired'), longDate(item.details.firstAired)),
			text(t('facet.lastAired'), longDate(item.details.lastAired)),
			text(t('facet.rated'), item.details.certification)
		]
	},

	game: {
		key: 'game',
		get label() {
			return t('type.game.label');
		},
		get plural() {
			return t('type.game.plural');
		},
		browse: '/games',
		statuses: statusesOf('game'),
		line: (item) => [item.year, list(item.details.developers, 1), item.details.perspectives?.[0]],
		facets: (item) => [
			text(t('facet.developer'), list(item.details.developers)),
			text(t('facet.publisher'), list(item.details.publishers)),
			text(t('facet.released'), longDate(item.details.releaseDate)),
			chips(t('facet.perspective'), item.details.perspectives),
			chips(t('facet.modes'), item.details.modes),
			chips(t('facet.platforms'), item.details.platforms),
			text(t('facet.engine'), item.details.engine),
			text(
				t('facet.mainStory'),
				item.details.mainStoryHours
					? t('format.hoursSuffix', { n: item.details.mainStoryHours })
					: null
			)
		]
	},

	book: {
		key: 'book',
		get label() {
			return t('type.book.label');
		},
		get plural() {
			return t('type.book.plural');
		},
		browse: '/books',
		statuses: statusesOf('book'),
		line: (item) => [
			item.year,
			list(item.details.authors, 1),
			item.details.pages ? t('format.pagesSuffix', { n: item.details.pages }) : null
		],
		facets: (item) => [
			text(t('facet.writtenBy'), list(item.details.authors)),
			text(t('facet.firstPublished'), item.details.firstPublished),
			text(t('facet.pages'), item.details.pages),
			text(t('facet.publisher'), item.details.publisher),
			text(t('facet.isbn'), item.details.isbn),
			collectionFacet(item.details)
		]
	}
};

/*
 * How far along someone is, per type. `fields` drives the little progress
 * editor on a detail page; `label` turns a stored progress into a sentence.
 *
 * `fields` is a function rather than an array for the same reason the labels
 * above are getters: the captions are translated, so they have to be built at
 * the moment they are read.
 */
const progressShapes = {
	movie: null,
	series: {
		fields: () => [
			{ key: 'season', label: t('progress.season'), min: 1 },
			{ key: 'episode', label: t('progress.episode'), min: 1 }
		],
		label: (item, progress) =>
			t('progress.seriesAt', { season: progress.season, episode: progress.episode }),
		ratio: (item, progress) => {
			const seasons = item.details.seasons ?? [];
			const before = seasons
				.filter((season) => season.number < progress.season)
				.reduce((sum, season) => sum + season.episodes.length, 0);
			return item.details.episodeCount
				? (before + progress.episode) / item.details.episodeCount
				: null;
		}
	},
	game: {
		fields: () => [{ key: 'hours', label: t('progress.hoursPlayed'), min: 0 }],
		label: (item, progress) => t('progress.gameAt', { hours: progress.hours }),
		ratio: (item, progress) =>
			item.details.mainStoryHours ? Math.min(1, progress.hours / item.details.mainStoryHours) : null
	},
	book: {
		fields: () => [{ key: 'page', label: t('progress.page'), min: 1 }],
		label: (item, progress) =>
			item.details.pages
				? t('progress.bookAt', { page: progress.page, pages: item.details.pages })
				: t('progress.bookAtUnknown', { page: progress.page }),
		ratio: (item, progress) => (item.details.pages ? progress.page / item.details.pages : null)
	}
};

export function progressShapeOf(item) {
	return progressShapes[item.type] ?? null;
}

export function progressLabel(item, progress) {
	const shape = progressShapes[item.type];
	if (!shape || !progress) return '';
	return shape.label(item, progress);
}

/** 0–1 for the little progress bar, or null when the type cannot express one. */
export function progressRatio(item, progress) {
	const shape = progressShapes[item.type];
	if (!shape || !progress) return null;
	return shape.ratio(item, progress);
}

export const typeKeys = Object.keys(types);

export function typeOf(item) {
	return types[item.type];
}

/*
 * Every line() and facets() above reaches straight into item.details —
 * item.details.runtime, item.details.seasonCount. That is fine for a payload
 * that has one and a TypeError for a payload that does not, and because it
 * throws while rendering it does not fail quietly: it takes the component down
 * with it. The search overlay spent a release stuck on "Searching…" and
 * refusing to reopen because the suggest endpoint had been trimmed to drop
 * `details`, which is a lot of damage for a missing subtitle.
 *
 * So the two callers below fill in an empty one rather than trusting the
 * server. A line with a gap in it is a cosmetic problem; this used to be a
 * broken page.
 */
function withDetails(item) {
	return item?.details ? item : { ...item, details: {} };
}

/** Facets with the empty ones dropped — what the detail sheet actually renders. */
export function facetsOf(item) {
	const safe = withDetails(item);

	return typeOf(safe).facets(safe).filter(Boolean);
}

/** "2022 · 2 seasons · 18 episodes" */
export function lineOf(item) {
	const safe = withDetails(item);

	return typeOf(safe).line(safe).filter(Boolean);
}

/**
 * One line of the feed, as a sentence with two holes in it.
 *
 * The holes are `{person}` and `{title}`, and the caller fills them with links
 * rather than with text — see ActivityCard. It is not a `verb` any more because
 * where the verb goes is a property of the language: English puts it between
 * the two names, Turkish and Azerbaijani put it after both of them.
 *
 * @param {string} type
 * @param {string} status
 * @returns {string}
 */
export function activitySentence(type, status) {
	if ('dropped' === status) return t('activity.dropped');
	if (!types[type] || !['done', 'active', 'wishlist'].includes(status)) {
		return t('activity.logged');
	}

	return t(`activity.${type}.${status}`);
}

export function statusLabel(type, status) {
	return types[type]?.statuses[status] ?? status;
}

/** Statuses in shelf order, for pickers and profile tabs. */
export const statusOrder = ['wishlist', 'active', 'done', 'dropped'];
