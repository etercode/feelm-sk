/*
 * Every activity is the same envelope — id, type, title, artwork, details —
 * and this file is the only place that knows what makes each type different.
 *
 * A type describes:
 *   - how people talk about it (watched a film, played a game, read a book)
 *   - what a shelf status is called (backlog vs watchlist)
 *   - which of its `details` are worth showing, and in what order
 *
 * Cards, detail pages and profiles read this registry instead of branching on
 * item.type themselves, so adding "podcast" later means adding an entry here.
 */

import { duration, list, longDate, plural } from '$lib/util/format.js';

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
	return text(part.name, `Part ${part.part} of ${part.total}`);
}

export const types = {
	movie: {
		key: 'movie',
		label: 'Movie',
		plural: 'Movies',
		browse: '/movies',
		/** Used in sentences: "Kaan watched Dune". */
		verb: { done: 'watched', active: 'is watching', wishlist: 'wants to watch' },
		statuses: { wishlist: 'Watchlist', active: 'Watching', done: 'Watched', dropped: 'Bailed' },
		line: (item) =>
			[item.year, duration(item.details.runtime), item.details.certification].filter(Boolean),
		facets: (item) => [
			text('Directed by', list(item.details.directors)),
			text('Written by', list(item.details.writers)),
			text('Runtime', duration(item.details.runtime)),
			text('Released', longDate(item.details.releaseDate)),
			text('Rated', item.details.certification),
			collectionFacet(item.details)
		]
	},

	series: {
		key: 'series',
		label: 'Series',
		plural: 'Series',
		browse: '/series',
		verb: { done: 'finished', active: 'is watching', wishlist: 'wants to watch' },
		statuses: { wishlist: 'Watchlist', active: 'Watching', done: 'Finished', dropped: 'Dropped' },
		line: (item) => [
			item.year,
			plural(item.details.seasonCount, 'season'),
			plural(item.details.episodeCount, 'episode')
		],
		facets: (item) => [
			text('Created by', list(item.details.creators)),
			text('Network', item.details.network),
			text('Status', item.details.status),
			text('Seasons', item.details.seasonCount),
			text('Episodes', item.details.episodeCount),
			text('Episode length', duration(item.details.episodeRuntime)),
			text('First aired', longDate(item.details.firstAired)),
			text('Last aired', longDate(item.details.lastAired)),
			text('Rated', item.details.certification)
		]
	},

	game: {
		key: 'game',
		label: 'Game',
		plural: 'Games',
		browse: '/games',
		verb: { done: 'beat', active: 'is playing', wishlist: 'wants to play' },
		statuses: { wishlist: 'Backlog', active: 'Playing', done: 'Beaten', dropped: 'Dropped' },
		line: (item) => [
			item.year,
			list(item.details.developers, 1),
			item.details.perspectives?.[0]
		],
		facets: (item) => [
			text('Developer', list(item.details.developers)),
			text('Publisher', list(item.details.publishers)),
			text('Released', longDate(item.details.releaseDate)),
			chips('Player perspective', item.details.perspectives),
			chips('Modes', item.details.modes),
			chips('Platforms', item.details.platforms),
			text('Engine', item.details.engine),
			text('Main story', item.details.mainStoryHours ? `${item.details.mainStoryHours} hours` : null)
		]
	},

	book: {
		key: 'book',
		label: 'Book',
		plural: 'Books',
		browse: '/books',
		verb: { done: 'read', active: 'is reading', wishlist: 'wants to read' },
		statuses: { wishlist: 'Reading list', active: 'Reading', done: 'Read', dropped: 'Abandoned' },
		line: (item) => [item.year, list(item.details.authors, 1), item.details.pages ? `${item.details.pages} pages` : null],
		facets: (item) => [
			text('Written by', list(item.details.authors)),
			text('First published', item.details.firstPublished),
			text('Pages', item.details.pages),
			text('Publisher', item.details.publisher),
			text('ISBN', item.details.isbn),
			collectionFacet(item.details)
		]
	}
};

/*
 * How far along someone is, per type. `fields` drives the little progress
 * editor on a detail page; `label` turns a stored progress into a sentence.
 */
const progressShapes = {
	movie: null,
	series: {
		fields: [
			{ key: 'season', label: 'Season', min: 1 },
			{ key: 'episode', label: 'Episode', min: 1 }
		],
		label: (item, progress) => `Season ${progress.season}, episode ${progress.episode}`,
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
		fields: [{ key: 'hours', label: 'Hours played', min: 0 }],
		label: (item, progress) => `${progress.hours} hours in`,
		ratio: (item, progress) =>
			item.details.mainStoryHours ? Math.min(1, progress.hours / item.details.mainStoryHours) : null
	},
	book: {
		fields: [{ key: 'page', label: 'Page', min: 1 }],
		label: (item, progress) =>
			item.details.pages ? `Page ${progress.page} of ${item.details.pages}` : `Page ${progress.page}`,
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
 * Every line() and facets() below reaches straight into item.details —
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

	return typeOf(safe)
		.facets(safe)
		.filter(Boolean);
}

/** "2022 · 2 seasons · 18 episodes" */
export function lineOf(item) {
	const safe = withDetails(item);

	return typeOf(safe)
		.line(safe)
		.filter(Boolean);
}

/** "watched" / "is playing" — used to write activity sentences. */
export function verbFor(type, status) {
	return types[type]?.verb[status] ?? 'logged';
}

export function statusLabel(type, status) {
	return types[type]?.statuses[status] ?? status;
}

/** Statuses in shelf order, for pickers and profile tabs. */
export const statusOrder = ['wishlist', 'active', 'done', 'dropped'];
