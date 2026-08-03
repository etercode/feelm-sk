import { t } from '$lib/i18n/index.svelte.js';

/*
 * Pure helpers that operate on a single item (or don't need the live catalog).
 * Lists / lookups live on the reactive `catalog` store — see catalog.svelte.js.
 */

/** Slugs repeat across types, so paths carry both. */
export function itemPath(item) {
	return `/${item.type}/${item.slug}`;
}

/** Not out yet — release date in the future. */
export function isUpcoming(item) {
	if (item?.isUpcoming) return true;
	const date = item?.details?.releaseDate;
	return Boolean(date) && date > new Date().toISOString().slice(0, 10);
}

/** Everyone credited on an item, whatever the type calls them. */
export function peopleOf(item) {
	const {
		cast = [],
		directors = [],
		creators = [],
		authors = [],
		developers = []
	} = item?.details ?? {};
	return [
		...cast.map((person) => person.name),
		...directors,
		...creators,
		...authors,
		...developers
	];
}

/** Where a source's own page for this title lives, when we know its id. */
const externalPages = {
	imdb: (id) => `https://www.imdb.com/title/${id}/`,
	tmdb: null // the API already sends a full TMDB url in item.source
};

const ratingLabels = { imdb: 'IMDb', tmdb: 'TMDB', metacritic: 'Metacritic', steam: 'Steam' };

/**
 * Every outside opinion the API holds, each in the units that source publishes —
 * IMDb 7.4 out of 10, TMDB 67%. Ordered by preference, so the first is the one
 * to lead with when there is only room for one.
 *
 * @returns {{ source: string, label: string, value: string, votes: number|null, href: string|null }[]}
 */
export function externalRatings(item) {
	const entries = Object.entries(item?.ratings ?? {});

	if (entries.length) {
		return entries.map(([source, rating]) => {
			const id = item.externalIds?.[source];
			const page = externalPages[source];
			return {
				source,
				label: ratingLabels[source] ?? source,
				value: rating.scale === 100 ? `${Math.round(rating.rating)}%` : rating.rating.toFixed(1),
				votes: rating.votes ?? null,
				href: id && page ? page(id) : (item.source?.url ?? null)
			};
		});
	}

	// No rating rows at all: fall back to the cached score and whoever crawled it.
	if (!item?.externalScore) return [];

	return [
		{
			source: 'primary',
			label: item.source?.name ?? t('common.score'),
			value: `${Math.round(item.externalScore)}%`,
			votes: null,
			href: item.source?.url ?? null
		}
	];
}

/** Just the one to lead with. */
export function externalRating(item) {
	return externalRatings(item)[0] ?? null;
}
