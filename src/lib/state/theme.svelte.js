/*
 * Light, dark, or whatever the system says. The choice is written to
 * localStorage and mirrored onto <html data-theme>, which is the only thing
 * the stylesheet reads. app.html applies the same logic before first paint so
 * the page never flashes the wrong theme.
 */

import { browser } from '$app/environment';

const STORAGE_KEY = 'feelm:theme';

export const choices = ['light', 'dark', 'system'];

function systemPrefersDark() {
	return browser && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

class Theme {
	choice = $state('light');

	#hydrated = false;

	get resolved() {
		return this.choice === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : this.choice;
	}

	hydrate() {
		if (!browser || this.#hydrated) return;
		this.#hydrated = true;
		const saved = localStorage.getItem(STORAGE_KEY);
		if (choices.includes(saved)) this.choice = saved;
		this.#apply();
	}

	set(choice) {
		this.choice = choice;
		if (browser) localStorage.setItem(STORAGE_KEY, choice);
		this.#apply();
	}

	/** Light → dark → follow the system → light. */
	cycle() {
		this.set(choices[(choices.indexOf(this.choice) + 1) % choices.length]);
	}

	#apply() {
		if (browser) document.documentElement.setAttribute('data-theme', this.resolved);
	}
}

export const theme = new Theme();
