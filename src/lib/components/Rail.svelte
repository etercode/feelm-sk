<!--
	A titled section whose contents scroll sideways. Arrows appear only when
	there is somewhere to go, and the whole thing stays keyboard and
	touch-scrollable without them.

	`grid` turns off the scrolling entirely and lays the contents out as `rows`
	full rows instead. Nothing is clipped at the right edge and there is no
	scrollbar to find — everything past the last row is simply not shown, and
	"See all" is the way to the rest.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';

	/** `rows` deeper than one turns the track into a column-flow grid. */
	let {
		title,
		kicker = null,
		href = null,
		linkLabel = 'See all',
		type = null,
		rows = 1,
		grid = false,
		children
	} = $props();

	/** @type {HTMLDivElement | undefined} */
	let track = $state();
	let atStart = $state(true);
	let atEnd = $state(false);

	function measure() {
		if (!track) return;
		atStart = track.scrollLeft < 8;
		atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
	}

	function nudge(direction) {
		track?.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
	}

	$effect(() => {
		measure();
	});
</script>

<section class="rail" data-type={type}>
	<header>
		<div class="heading">
			{#if kicker}<span class="eyebrow">{kicker}</span>{/if}
			<h2 class="display">{title}</h2>
		</div>

		<div class="controls">
			{#if href}
				<a class="btn btn-ghost btn-sm" {href}>{linkLabel}<Icon name="right" size={14} /></a>
			{/if}
			{#if !grid}
				<button
					type="button"
					class="arrow"
					aria-label="Scroll left"
					disabled={atStart}
					onclick={() => nudge(-1)}
				>
					<Icon name="left" size={16} />
				</button>
				<button
					type="button"
					class="arrow"
					aria-label="Scroll right"
					disabled={atEnd}
					onclick={() => nudge(1)}
				>
					<Icon name="right" size={16} />
				</button>
			{/if}
		</div>
	</header>

	<div
		class="track"
		class:scroller={!grid}
		class:stacked={!grid && rows > 1}
		class:wall={grid}
		style="--rows: {rows}"
		bind:this={track}
		onscroll={measure}
	>
		{@render children()}
	</div>
</section>

<style>
	.rail {
		margin-block: clamp(2.5rem, 6vw, 4rem);
	}

	header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.heading {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.eyebrow {
		color: var(--accent);
	}

	h2 {
		font-size: clamp(1.6rem, 3.4vw, 2.35rem);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.arrow {
		display: grid;
		place-items: center;
		width: 2.15rem;
		height: 2.15rem;
		border: 1px solid var(--line);
		border-radius: 50%;
		background: var(--tint);
		color: var(--ink);
		cursor: pointer;
		transition:
			background 0.18s ease,
			border-color 0.18s ease,
			opacity 0.18s ease;
	}

	.arrow:hover:not([disabled]) {
		background: var(--accent-soft);
		border-color: color-mix(in srgb, var(--accent) 50%, transparent);
		color: var(--accent);
	}

	.arrow[disabled] {
		opacity: 0.28;
		cursor: default;
	}

	.track {
		display: flex;
		gap: clamp(0.85rem, 1.6vw, 1.35rem);
		padding-bottom: 0.75rem;
	}

	/* Two rows deep, filling top to bottom before moving right. */
	.track.stacked {
		display: grid;
		grid-template-rows: repeat(var(--rows), auto);
		grid-auto-flow: column;
		grid-auto-columns: clamp(8.5rem, 13vw, 10.5rem);
		row-gap: clamp(1rem, 2vw, 1.6rem);
	}

	/*
	 * The wall: four rows, nothing clipped, nothing to scroll.
	 *
	 * Columns are fixed per width rather than auto-filled, because the cap has
	 * to agree with them — CSS cannot count nth-child from a custom property,
	 * so each breakpoint states its own columns and hides everything past
	 * columns × 4. Each narrower rule hides a superset of the wider ones, which
	 * is why none of them need undoing.
	 */
	.track.wall {
		--cols: 7;

		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		column-gap: clamp(0.85rem, 1.6vw, 1.35rem);
		row-gap: clamp(1rem, 2vw, 1.6rem);
		padding-bottom: 0;
	}

	.track.wall > :global(:nth-child(n + 29)) {
		display: none;
	}

	@media (max-width: 1279px) {
		.track.wall {
			--cols: 6;
		}

		.track.wall > :global(:nth-child(n + 25)) {
			display: none;
		}
	}

	@media (max-width: 1023px) {
		.track.wall {
			--cols: 5;
		}

		.track.wall > :global(:nth-child(n + 21)) {
			display: none;
		}
	}

	@media (max-width: 819px) {
		.track.wall {
			--cols: 4;
		}

		.track.wall > :global(:nth-child(n + 17)) {
			display: none;
		}
	}

	@media (max-width: 639px) {
		.track.wall {
			--cols: 3;
		}

		.track.wall > :global(:nth-child(n + 13)) {
			display: none;
		}
	}

	@media (max-width: 720px) {
		.arrow {
			display: none;
		}
	}
</style>
