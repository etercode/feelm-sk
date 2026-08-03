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

	let entry = $derived(session.user ? library.entryFor(session.user.id, item.id) : null);

	// Nothing can be finished before it is out; offering "Watched" on an
	// unreleased title is offering a lie.
	let statuses = $derived(isUpcoming(item) ? ['wishlist'] : statusOrder);

	/** @param {string} status */
	function choose(status) {
		if (!session.user) return goto('/login');
		library.setStatus(session.user.id, item.id, entry?.status === status ? null : status);
	}

	/** @param {number | null} value */
	function rate(value) {
		if (!session.user) return goto('/login');
		library.setRating(session.user.id, item.id, value);
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
			<button
				type="button"
				class="pill"
				class:on={entry?.status === status}
				aria-pressed={entry?.status === status}
				onclick={() => choose(status)}
			>
				{#if entry?.status === status}<Icon name="check" size={11} stroke={2.6} />{/if}
				{statusLabel(item.type, status)}
			</button>
		{/each}
	</div>

	{#if !isUpcoming(item)}
		<div class="rate">
			<Stars value={entry?.rating ?? null} size={15} interactive onchange={rate} />
		</div>
	{/if}
</div>

<style>
	.quick {
		position: absolute;
		inset: auto 0 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.5rem;
		background: linear-gradient(to top, rgb(6 8 15 / 0.94), rgb(6 8 15 / 0.72) 70%, transparent);
		/*
		 * Off by default and revealed rather than mounted on demand: the shelf
		 * state is already in memory, and animating something that exists is
		 * cheaper and steadier than building it under the cursor.
		 */
		opacity: 0;
		transform: translateY(0.5rem);
		pointer-events: none;
		transition:
			opacity 0.18s ease,
			transform 0.18s ease;
	}

	.quick.open {
		opacity: 1;
		transform: none;
		pointer-events: auto;
	}

	.statuses {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.22rem 0.45rem;
		border: 1px solid rgb(255 255 255 / 0.22);
		border-radius: 99px;
		background: rgb(255 255 255 / 0.1);
		color: #fff;
		font-size: 0.68rem;
		font-weight: 500;
		line-height: 1.2;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}

	.pill:hover {
		background: rgb(255 255 255 / 0.22);
	}

	.pill.on {
		background: var(--accent, var(--brand));
		border-color: transparent;
	}

	.rate {
		display: flex;
		justify-content: center;
		/* The stars draw in their own colour; on artwork they need to be light. */
		color: #ffd166;
	}

	@media (prefers-reduced-motion: reduce) {
		.quick {
			transition: none;
		}
	}
</style>
