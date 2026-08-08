<!--
	Shelf actions on the poster itself.

	Adding something used to mean opening it, choosing a shelf, and coming back
	— three navigations to record one fact, done dozens of times while browsing.
	This is the same four buttons and the same stars, over the artwork.

	It is deliberately not a hover-only affair. Hover does not exist on a phone,
	which is where most of this browsing happens, so the panel is opened by a
	button there and revealed by hover on a pointer device. Same markup, same
	state, two ways in.
-->
<script>
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import Stars from '$lib/components/Stars.svelte';
	import { isUpcoming } from '$lib/data/items.js';
	import { statusLabel, statusOrder } from '$lib/data/types.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';

	let { item, open = false } = $props();

	/*
	 * Icons, not words. The four shelf names are translated, and in Azerbaijani
	 * "Yarımçıq buraxılıb" is nineteen characters — as text pills they wrapped
	 * to three cramped rows on a poster. A bookmark, a play, a tick and a cross
	 * say the same thing in the same space in every language; the words survive
	 * as the tooltip and the accessible name.
	 */
	const ICONS = {
		wishlist: 'bookmark',
		active: 'play',
		done: 'check',
		dropped: 'close'
	};

	/*
	 * A hue each, and four that are far apart rather than four shades of the
	 * theme. These sit on artwork of every possible colour, so what makes them
	 * readable is the difference between them, not their relationship to the
	 * palette — and red for the one that means "gave up" is the only reading
	 * anybody has to be taught.
	 */
	const TONES = {
		wishlist: '#5aa9ff',
		active: '#a78bfa',
		done: '#34c77b',
		dropped: '#f87171'
	};

	// The store first, so an optimistic write wins; the payload otherwise.
	let entry = $derived(
		session.user ? (library.entryFor(session.user.id, item.id) ?? item.viewerEntry ?? null) : null
	);

	// Nothing can be finished before it is out; offering "Watched" on an
	// unreleased title is offering a lie.
	let statuses = $derived(isUpcoming(item) ? ['wishlist'] : statusOrder);

	/** @param {string} status */
	function choose(status) {
		if (!session.user) return goto('/login');
		library.setStatus(session.user.id, item, entry?.status === status ? null : status);
	}

	/** @param {number | null} value */
	function rate(value) {
		if (!session.user) return goto('/login');
		library.setRating(session.user.id, item, value);
	}
</script>

<!--
	No click-stopping needed: this sits over the artwork but is a sibling of the
	card's link rather than inside it, so a press here never reaches the anchor.
	That is the whole reason PosterCard stopped being one big <a>.
-->
<div class="quick" class:open role="group" aria-label={t('shelf.label')}>
	<div class="statuses">
		{#each statuses as status (status)}
			{@const label = statusLabel(item.type, status)}
			<button
				type="button"
				class="pill"
				style="--tone: {TONES[status]}"
				class:on={entry?.status === status}
				aria-pressed={entry?.status === status}
				aria-label={label}
				onclick={() => choose(status)}
			>
				<Icon name={ICONS[status]} size={15} stroke={2.2} />
				<!--
					A tooltip of our own rather than the native `title`, which
					takes a second to appear, cannot be styled, and on a row of
					four icons shows up in the wrong place at the wrong moment.
					aria-label above is what a screen reader reads; this is only
					for eyes, hence aria-hidden.
				-->
				<span class="tip" aria-hidden="true">{label}</span>
			</button>
		{/each}
	</div>

	{#if !isUpcoming(item)}
		<Stars value={entry?.rating ?? null} size={17} interactive onchange={rate} />
	{/if}
</div>

<style>
	/*
	 * Sits on the bottom of the artwork, which is what `.art-wrap` in PosterCard
	 * exists to be. The first version was positioned against the whole card and
	 * therefore drew itself over the title.
	 */
	/*
	 * The pill colours are tokens rather than literals because this component
	 * has two homes. On a poster it sits on artwork and has to be white; in the
	 * hover card it sits on --surface, where white on white is nothing at all.
	 * These are the on-artwork values; HoverPreview re-points them.
	 */
	.quick {
		--pill-ink: #fff;
		--pill-line: rgb(255 255 255 / 0.24);
		--pill-fill: rgb(255 255 255 / 0.12);

		position: absolute;
		inset: auto 0 0 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		padding: 0.6rem 0.5rem 0.55rem;
		background: linear-gradient(to top, rgb(4 6 12 / 0.96), rgb(4 6 12 / 0.78) 55%, transparent);
		/*
		 * Revealed, not mounted on demand: the shelf state is already in memory,
		 * and animating something that exists is steadier than building it under
		 * the cursor.
		 */
		opacity: 0;
		transform: translateY(0.4rem);
		pointer-events: none;
		transition:
			opacity 0.16s ease,
			transform 0.16s ease;
	}

	.quick.open {
		opacity: 1;
		transform: none;
		pointer-events: auto;
	}

	.statuses {
		display: flex;
		gap: 0.3rem;
	}

	.pill {
		position: relative;
		display: grid;
		place-items: center;
		width: 1.95rem;
		height: 1.95rem;
		padding: 0;
		border: 1px solid var(--pill-line);
		border-radius: 50%;
		background: var(--pill-fill);
		color: var(--pill-ink);
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			transform 0.15s ease;
	}

	.pill:hover,
	.pill:focus-visible {
		background: var(--tone);
		border-color: var(--tone);
		color: #0a0d16;
		transform: translateY(-2px);
	}

	/* The chosen one stays lit, so the row reads at a glance without hovering. */
	.pill.on {
		background: var(--tone);
		border-color: var(--tone);
		color: #0a0d16;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--tone) 28%, transparent);
	}

	.pill.on:hover {
		transform: none;
	}

	.tip {
		position: absolute;
		bottom: calc(100% + 0.4rem);
		left: 50%;
		transform: translateX(-50%) translateY(0.2rem);
		padding: 0.2rem 0.45rem;
		border-radius: var(--radius-sm);
		background: rgb(8 10 16 / 0.95);
		color: #fff;
		font-size: 0.68rem;
		font-weight: 500;
		line-height: 1.3;
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.12s ease,
			transform 0.12s ease;
	}

	.pill:hover .tip,
	.pill:focus-visible .tip {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}

	/*
	 * Stars carry --star, which is tuned for a page background. Over artwork it
	 * has to hold up against whatever colour the poster happens to be, so the
	 * dark theme's brighter gold is used here in both themes.
	 */
	.quick {
		--star: #ffc94d;
	}

	@media (prefers-reduced-motion: reduce) {
		.quick,
		.pill {
			transition: none;
		}
	}
</style>
