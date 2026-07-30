<!--
	The thin bar across the top of the window during a navigation.

	Every page change goes through a load function that waits on the API, so
	without this a click has no visible effect until the new page arrives. The
	bar covers the whole site — browsing, search, opening a title.

	It does not appear instantly. A bar that flashes up and vanishes reads as a
	glitch, so anything resolving faster than the threshold below shows nothing
	at all — at that speed the click already feels immediate.
-->
<script>
	import { navigating } from '$app/state';

	/** Milliseconds a navigation must exceed before the bar is worth showing. */
	const DELAY = 120;

	let visible = $state(false);

	$effect(() => {
		if (!navigating.to) {
			visible = false;
			return;
		}

		const timer = setTimeout(() => (visible = true), DELAY);
		// Runs when the navigation ends or another starts, so a fast page never
		// gets as far as showing the bar.
		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<div class="track" role="presentation">
		<div class="bar"></div>
	</div>
{/if}

<!--
	Announced separately from the bar: assistive technology gets the message
	whether or not the bar has passed its delay, and polite means it waits for a
	gap rather than interrupting.
-->
<div class="sr-only" role="status" aria-live="polite">
	{navigating.to ? 'Loading page' : ''}
</div>

<style>
	.track {
		position: fixed;
		inset: 0 0 auto;
		height: 2px;
		z-index: 200;
		background: var(--accent-soft);
	}

	.bar {
		height: 100%;
		width: 100%;
		background: var(--accent);
		transform-origin: 0 50%;
		/*
		 * The real duration is unknown, so the bar cannot be honest about
		 * progress. It moves quickly to most of the way and then crawls, which
		 * says "still working" without ever promising to finish.
		 */
		animation: advance 8s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
	}

	@keyframes advance {
		0% {
			transform: scaleX(0.02);
		}
		40% {
			transform: scaleX(0.7);
		}
		100% {
			transform: scaleX(0.98);
		}
	}
</style>
