/*
 * Whether the feedback dock is open, and a nudge for anything showing the same
 * reports somewhere else.
 *
 * The dock is mounted once in the root layout and can be opened from anywhere —
 * its own button, or the "tell us something" one on /feedback — so the flag has
 * to live outside the component that draws it. It is deliberately not in the
 * URL: opening the dock is not a place you navigated to, and it should survive
 * going from a film to a person while you are half-way through writing about
 * what is wrong with both.
 *
 * `revision` is the other half of that. Sending a report from the dock while
 * /feedback is on screen behind it has to show up in that list, and the list
 * has no other way of knowing it happened; it watches this number and reloads.
 */

class FeedbackDock {
	open = $state(false);

	/** Bumped whenever a report is created, edited or withdrawn. */
	revision = $state(0);

	show() {
		this.open = true;
	}

	hide() {
		this.open = false;
	}

	toggle() {
		if (this.open) this.hide();
		else this.show();
	}

	changed() {
		this.revision += 1;
	}
}

export const feedbackDock = new FeedbackDock();
