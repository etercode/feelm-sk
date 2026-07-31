/*
 * Live catalog from the Symfony API.
 * Pure helpers that only need an item object stay in items.js (itemPath, etc.).
 */

import { browser } from '$app/environment';
import { untrack } from 'svelte';
import * as api from '$lib/api/client.js';
import { typeKeys } from '$lib/data/types.js';
import { isUpcoming, peopleOf } from '$lib/data/items.js';

class Catalog {
	/** @type {any[]} */
	items = $state([]);
	ready = $state(false);
	error = $state(/** @type {string | null} */ (null));

	#hydrated = false;
	/** @type {Promise<void> | null} */
	#promise = null;

	hydrate() {
		if (!browser) return this.#promise ?? Promise.resolve();
		if (this.#hydrated) return this.#promise ?? Promise.resolve();
		this.#hydrated = true;
		this.#promise = this.#load();
		return this.#promise;
	}

	async #load() {
		try {
			/*
			 * Only what the home page shows: two rows per type plus the release
			 * queue. Browse and search page against the API — this store is a
			 * cache of the front page, not a copy of the catalog.
			 */
			const types = ['movie', 'series', 'game', 'book'];
			const [pages, upcomingPayload] = await Promise.all([
				Promise.all(types.map((type) => api.listItems({ type, limit: 24, sort: 'popularity' }))),
				api.listUpcoming()
			]);

			/** @type {Map<number|string, any>} */
			const byId = new Map();

			for (const data of pages) {
				for (const item of data?.items ?? []) {
					byId.set(item.id, { ...item, isUpcoming: Boolean(item.isUpcoming) });
				}
			}
			/*
			 * Folded in rather than written over. The release queue asks for a
			 * short payload — artwork, name, genres, date, director — and a
			 * title can be in a rail as well, where it arrived complete.
			 * Replacing the entry would throw the rest of it away, so this
			 * keeps whichever fields each source had, `details` included.
			 */
			for (const item of upcomingPayload?.items ?? []) {
				const seen = byId.get(item.id);
				byId.set(item.id, {
					...seen,
					...item,
					details: { ...seen?.details, ...item.details },
					isUpcoming: true
				});
			}

			this.items = [...byId.values()];
			this.ready = true;
			this.error = null;
		} catch (e) {
			console.warn('catalog load failed', e);
			this.error = 'Could not load the catalog from the API.';
			this.ready = true;
		}
	}

	/** Merge a single API item (detail / feed) into the store. No-op if unchanged. */
	remember(item) {
		if (!item?.id) return;
		// Avoid subscribing callers (e.g. page $effects) to `items` writes.
		untrack(() => {
			const idx = this.items.findIndex((row) => row.id === item.id);
			if (idx < 0) {
				this.items = [...this.items, item];
				return;
			}
			const prev = this.items[idx];
			const richer =
				(item.details?.seasons && !prev.details?.seasons) ||
				(item.details?.episodes && !prev.details?.episodes) ||
				(Boolean(item.overview) && !prev.overview) ||
				(Boolean(item.tagline) && !prev.tagline);
			if (!richer) return;
			this.items = this.items.map((row, i) => (i === idx ? { ...row, ...item } : row));
		});
	}

	itemById(id) {
		return this.items.find((item) => item.id === id) ?? null;
	}

	itemByPath(type, slug) {
		return this.items.find((item) => item.type === type && item.slug === slug) ?? null;
	}

	itemsOfType(type) {
		return this.items.filter((item) => item.type === type && !item.isUpcoming);
	}

	upcomingItems() {
		const fromFlag = this.items.filter((item) => item.isUpcoming);
		if (fromFlag.length) {
			return fromFlag
				.slice()
				.sort((a, b) =>
					String(a.details?.releaseDate ?? '').localeCompare(String(b.details?.releaseDate ?? ''))
				);
		}
		return this.items
			.filter(isUpcoming)
			.sort((a, b) =>
				String(a.details?.releaseDate ?? '').localeCompare(String(b.details?.releaseDate ?? ''))
			);
	}

	genresOfType(type) {
		const counts = new Map();
		for (const item of this.itemsOfType(type)) {
			for (const genre of item.genres ?? []) counts.set(genre, (counts.get(genre) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([genre]) => genre);
	}

	collectionOf(item) {
		const name = item?.details?.collection?.name;
		if (!name) return [];
		return this.items
			.filter((other) => other.details?.collection?.name === name)
			.sort((a, b) => a.details.collection.part - b.details.collection.part);
	}

	relatedTo(item, limit = 6) {
		if (!item) return [];
		const siblings = this.collectionOf(item).filter((other) => other.id !== item.id);
		const shared = (other) =>
			(other.genres ?? []).filter((genre) => (item.genres ?? []).includes(genre)).length;

		const neighbours = this.items
			.filter(
				(other) =>
					other.type === item.type &&
					other.id !== item.id &&
					!siblings.includes(other) &&
					shared(other)
			)
			.sort(
				(a, b) =>
					shared(b) - shared(a) || (b.externalScore ?? 0) - (a.externalScore ?? 0)
			);

		return [...siblings, ...neighbours].slice(0, limit);
	}

	topOfType(type, limit = 10) {
		return this.itemsOfType(type)
			.slice()
			.sort((a, b) => (b.externalScore ?? 0) - (a.externalScore ?? 0))
			.slice(0, limit);
	}

	searchItems(query, limit = 20) {
		const needle = query.trim().toLowerCase();
		if (needle.length < 2) return [];

		const scored = [];
		for (const item of this.items) {
			const title = item.title.toLowerCase();
			let score = 0;
			if (title === needle) score = 100;
			else if (title.startsWith(needle)) score = 80;
			else if (title.includes(needle)) score = 60;
			else if (peopleOf(item).some((name) => name.toLowerCase().includes(needle))) score = 40;
			else if ((item.genres ?? []).some((genre) => genre.toLowerCase().includes(needle)))
				score = 20;
			if (score) scored.push({ item, score });
		}

		return scored
			.sort(
				(a, b) =>
					b.score - a.score || (b.item.externalScore ?? 0) - (a.item.externalScore ?? 0)
			)
			.slice(0, limit)
			.map((hit) => hit.item);
	}

	groupByType(list) {
		return typeKeys
			.map((type) => ({ type, items: list.filter((item) => item.type === type) }))
			.filter((group) => group.items.length);
	}
}

export const catalog = new Catalog();
