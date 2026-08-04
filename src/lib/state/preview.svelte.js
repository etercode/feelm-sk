/*
 * Which poster the cursor has settled on, for the card that expands out of it.
 *
 * One object for the whole page rather than state inside each card, because the
 * card cannot live inside the poster: rails scroll sideways with
 * `overflow-x: auto`, and anything positioned inside one is clipped at its
 * edge — which is exactly where a poster you are hovering tends to be. So a
 * single fixed-position panel is rendered at the root and told where to draw
 * itself, and this is how it is told.
 *
 * It also means only one can ever be open, which is the behaviour anyway.
 */

import { browser } from '$app/environment';
import { API_URL } from '$lib/config.js';

/** How long the cursor must rest before anything happens. */
const DWELL = 650;

/** Rects go stale the moment anything scrolls; older than this is not trusted. */
const STALE = 400;

class Preview {
	/** @type {any} */
	item = $state(null);

	/** Where the poster is on screen, in viewport coordinates. */
	/** @type {{ top: number, left: number, width: number, height: number } | null} */
	rect = $state(null);

	/** The extra detail — backdrop, overview, trailer — once it has arrived. */
	/** @type {any} */
	detail = $state(null);

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	#timer;

	/**
	 * Fetched detail, kept for the session.
	 *
	 * Browsing a grid means crossing the same posters repeatedly on the way to
	 * the one you want; without this each pass is another request for a
	 * paragraph that has not changed.
	 *
	 * @type {Map<string, any>}
	 */
	#cache = new Map();

	/** @type {number} */
	#openedAt = 0;

	get open() {
		return this.item !== null;
	}

	/**
	 * The cursor has entered a poster. Nothing happens yet.
	 *
	 * @param {any} item
	 * @param {DOMRect} rect
	 */
	enter(item, rect) {
		if (!browser) return;
		clearTimeout(this.#timer);

		// Already showing this one — a re-entry from the card itself.
		if (this.item?.id === item.id) return;

		/*
		 * A different poster: whatever is open belongs to the last one and goes
		 * now.
		 *
		 * Without this it stayed mounted and simply had its item and rect
		 * reassigned when the new dwell elapsed — so it slid across the grid
		 * from the old poster to the new one, carrying the old title and the old
		 * trailer partway. It has to leave from where it grew.
		 */
		if (this.item) this.close();

		this.#timer = setTimeout(() => this.#show(item, rect), DWELL);
	}

	/**
	 * The cursor has left. Closes unless it landed on the card itself, which is
	 * why this is a short delay rather than immediate: the gap between poster
	 * and panel is a few pixels of nothing, and crossing it must not close.
	 */
	leave() {
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => this.close(), 120);
	}

	/** The cursor is on the card. Cancels the pending close. */
	hold() {
		clearTimeout(this.#timer);
	}

	close() {
		clearTimeout(this.#timer);
		this.item = null;
		this.rect = null;
		this.detail = null;
	}

	/**
	 * @param {any} item
	 * @param {DOMRect} rect
	 */
	#show(item, rect) {
		this.item = item;
		this.rect = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
		this.#openedAt = Date.now();
		this.detail = this.#cache.get(this.#key(item)) ?? null;

		if (this.detail === null) void this.#load(item);
	}

	/** @param {any} item */
	#key(item) {
		return `${item.type}/${item.slug}`;
	}

	/** @param {any} item */
	async #load(item) {
		const key = this.#key(item);

		try {
			const response = await fetch(`${API_URL}/api/items/${key}/preview`);
			if (!response.ok) return;

			const detail = await response.json();
			this.#cache.set(key, detail);

			// The cursor may have moved on while this was in flight; a late
			// answer must not overwrite whatever is open now.
			if (this.item?.id === item.id) this.detail = detail;
		} catch {
			// A preview that will not load is a poster that does not expand.
			// There is nothing to tell anybody about that.
		}
	}

	/**
	 * Whether the stored rect can still be believed.
	 *
	 * Scrolling moves the poster and leaves the panel behind it, so the panel
	 * checks this and closes rather than pointing at empty page.
	 */
	get fresh() {
		return Date.now() - this.#openedAt < STALE || this.item === null;
	}
}

export const preview = new Preview();
