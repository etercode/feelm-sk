<!--
	Covers the page while a navigation is in flight.

	The bar alone was too easy to miss, and it left every poster clickable, so a
	second click during a slow load queued up another navigation. The scrim
	blocks the page instead of merely reporting on it.

	It waits a moment first: below the threshold a navigation already feels
	instant, and a scrim that flashes up and vanishes is worse than none.
-->
<script>
	import { navigating } from '$app/state';
	import Spinner from '$lib/components/Spinner.svelte';

	/** Milliseconds a navigation must exceed before the page is covered. */
	const DELAY = 100;

	let visible = $state(false);

	$effect(() => {
		if (!navigating.to) {
			visible = false;
			return;
		}

		const timer = setTimeout(() => (visible = true), DELAY);
		// Runs when this navigation ends or another starts, so a fast page never
		// gets as far as showing anything.
		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<!--
		Nothing underneath is reachable: the scrim is the topmost element and
		accepts pointer events rather than passing them through.
	-->
	<div class="scrim">
		<div class="badge">
			<Spinner size={24} />
			<span>Loading…</span>
		</div>
	</div>
	<div class="bar"></div>
{/if}

<!--
	Announced whether or not the scrim has appeared, and politely, so it waits
	for a gap rather than cutting in.
-->
<div class="sr-only" role="status" aria-live="polite">
	{navigating.to ? 'Loading page' : ''}
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 300;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgb(from var(--paper) r g b / 0.55);
		backdrop-filter: blur(1.5px);
		/* The point of the element: swallow clicks aimed at the page below. */
		cursor: progress;
		animation: appear 0.12s ease both;
	}

	.badge {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.85rem 1.3rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		background: var(--paper);
		box-shadow: 0 18px 40px rgb(0 0 0 / 0.16);
		font-size: 0.95rem;
		color: var(--ink);
	}

	.bar {
		position: fixed;
		inset: 0 0 auto;
		height: 2px;
		z-index: 301;
		background: var(--accent);
		transform-origin: 0 50%;
		/*
		 * The duration is unknowable, so the bar cannot honestly report progress.
		 * It runs quickly to most of the way then crawls: "still working",
		 * without promising to finish.
		 */
		animation: advance 8s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
	}

	@keyframes appear {
		from {
			opacity: 0;
		}
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
