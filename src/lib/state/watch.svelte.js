/*
 * How somebody wants their "where to watch" search worded.
 *
 * Kept once for the reader rather than once per title, and that is the whole
 * design: you open the panel on the first film, pick your engine and the words
 * you like, and every title after that is one click. A panel that had to be
 * filled in again on every page would be slower than typing the search.
 *
 * localStorage rather than the account, because it is a preference about a
 * browser — which search engine this machine likes — and it has to work for
 * somebody who never signs in.
 */

import { browser } from '$app/environment';
import { engineKeys } from '$lib/data/watch.js';

const STORAGE_KEY = 'feelm:watch';

/** On unless somebody says otherwise. `title` is not optional, so not here. */
const DEFAULT_ON = ['year', 'intent'];

class WatchPrefs {
	engine = $state('google');
	/** The optional part keys that are switched on. */
	on = $state([...DEFAULT_ON]);
	/** The reader's own words, appended to every query. */
	words = $state('');

	#hydrated = false;

	hydrate() {
		if (!browser || this.#hydrated) return;
		this.#hydrated = true;

		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
			if (!saved || typeof saved !== 'object') return;

			if (engineKeys.includes(saved.engine)) this.engine = saved.engine;
			if (Array.isArray(saved.on)) this.on = saved.on.filter((key) => typeof key === 'string');
			if (typeof saved.words === 'string') this.words = saved.words;
		} catch {
			// A half-written or hand-edited entry falls back to the defaults
			// rather than taking the page down on the way past.
		}
	}

	/** @param {string} key */
	isOn(key) {
		return this.on.includes(key);
	}

	/** @param {string} engine */
	setEngine(engine) {
		if (!engineKeys.includes(engine)) return;
		this.engine = engine;
		this.#save();
	}

	/** @param {string} key */
	toggle(key) {
		this.on = this.isOn(key) ? this.on.filter((each) => each !== key) : [...this.on, key];
		this.#save();
	}

	/** @param {string} words */
	setWords(words) {
		this.words = words;
		this.#save();
	}

	reset() {
		this.engine = 'google';
		this.on = [...DEFAULT_ON];
		this.words = '';
		this.#save();
	}

	#save() {
		if (!browser) return;

		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ engine: this.engine, on: this.on, words: this.words })
		);
	}
}

export const watchPrefs = new WatchPrefs();
