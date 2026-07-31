<!--
	Star rating in halves. Read-only by default; pass `interactive` and an
	`onchange` handler to let someone score something. Clicking the score you
	already gave clears it.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';

	let {
		value = null,
		size = 18,
		interactive = false,
		onchange = null,
		label = null
	} = $props();

	let hovered = $state(null);

	let shown = $derived(hovered ?? value ?? 0);

	function fillOf(position) {
		return Math.max(0, Math.min(1, shown - (position - 1))) * 100;
	}

	function pick(next) {
		hovered = null;
		onchange?.(next === value ? null : next);
	}
</script>

<span
	class="stars"
	class:interactive
	style="--size: {size}px"
	onmouseleave={() => (hovered = null)}
	role={interactive ? 'group' : 'img'}
	aria-label={interactive ? 'Rate this' : label ?? (value ? `${value} out of 5` : 'Not rated')}
>
	{#each [1, 2, 3, 4, 5] as position (position)}
		<span class="star" style="--fill: {fillOf(position)}%">
			<span class="empty"><Icon name="star" {size} stroke={1.4} /></span>
			<span class="full"><Icon name="star" {size} filled /></span>

			{#if interactive}
				<button
					type="button"
					class="half left"
					aria-label="Rate {position - 0.5} out of 5"
					onmouseenter={() => (hovered = position - 0.5)}
					onfocus={() => (hovered = position - 0.5)}
					onclick={() => pick(position - 0.5)}
				></button>
				<button
					type="button"
					class="half right"
					aria-label="Rate {position} out of 5"
					onmouseenter={() => (hovered = position)}
					onfocus={() => (hovered = position)}
					onclick={() => pick(position)}
				></button>
			{/if}
		</span>
	{/each}
</span>

<style>
	.stars {
		display: inline-flex;
		gap: 0.12em;
		color: var(--brand);
		line-height: 0;
	}

	.star {
		position: relative;
		display: inline-block;
		width: var(--size);
		height: var(--size);
	}

	.empty {
		color: var(--line-strong);
		display: block;
	}

	.full {
		position: absolute;
		inset: 0;
		overflow: hidden;
		width: var(--fill);
		display: block;
		transition: width 0.12s ease;
	}

	.half {
		position: absolute;
		top: 0;
		width: 50%;
		height: 100%;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}

	.left {
		left: 0;
	}

	.right {
		right: 0;
	}

	.interactive .star:hover .empty {
		color: color-mix(in srgb, var(--brand) 40%, var(--line-strong));
	}
</style>
