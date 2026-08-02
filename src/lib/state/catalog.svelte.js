/*
 * Live catalog from the Symfony API.
 * Pure helpers that only need an item object stay in items.js (itemPath, etc.).
 */

import { browser } from '$app/environment';
import { untrack } from 'svelte';
import * as api from '$lib/api/client.js';
import { isUpcoming } from '$lib/data/items.js';

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
			 * Only what the home page shows: a rail per type plus the release
			 * queue. Browse and search page against the API — this store is a
			 * cache of the front page, not a copy of the catalog.
			 *
			 * One request, not five. It used to ask for a rail per type and the
			 * queue separately, and two of those four types have nothing in
			 * them — so every cold load spent two round trips being told the
			 * catalog holds no games and no books. Which types are worth
			 * sending is something only the server knows.
			 */
			const home = await api.getHome();

			/** @type {Map<number|string, any>} */
			const byId = new Map();

			for (const rail of home?.rails ?? []) {
				for (const item of rail.items ?? []) {
					byId.set(item.id, { ...item, isUpcoming: Boolean(item.isUpcoming) });
				}
			}
			/*
			 * Folded in rather than written over. The release queue asks for a
			 * different short payload — artwork, name, genres, date, director,
			 * trailer — and a title can be in a rail as well. Replacing the
			 * entry would throw the other half away, so this keeps whichever
			 * fields each source had, `details` included.
			 */
			for (const item of home?.upcoming ?? []) {
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

	topOfType(type, limit = 10) {
		return this.itemsOfType(type)
			.slice()
			.sort((a, b) => (b.externalScore ?? 0) - (a.externalScore ?? 0))
			.slice(0, limit);
	}

}

export const catalog = new Catalog();
