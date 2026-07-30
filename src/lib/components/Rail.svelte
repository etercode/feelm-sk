<!--
	A titled section whose contents scroll sideways. Arrows appear only when
	there is somewhere to go, and the whole thing stays keyboard and
	touch-scrollable without them.
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
		</div>
	</header>

	<div
		class="track scroller"
		class:stacked={rows > 1}
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

	@media (max-width: 720px) {
		.arrow {
			display: none;
		}
	}
</style>
