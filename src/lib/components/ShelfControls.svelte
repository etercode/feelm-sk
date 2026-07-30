<!--
	Where an item sits for the signed-in person: which shelf, what they scored
	it, and how far in they are. Signed-out visitors get the same controls,
	which send them to the sign-in page instead of doing nothing.
-->
<script>
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import Stars from '$lib/components/Stars.svelte';
	import { isUpcoming } from '$lib/data/items.js';
	import { progressShapeOf, statusLabel, statusOrder } from '$lib/data/types.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';

	let { item } = $props();

	let entry = $derived(session.user ? library.entryFor(session.user.id, item.id) : null);
	let shape = $derived(progressShapeOf(item));

	// You cannot have finished something that is not out yet.
	let unreleased = $derived(isUpcoming(item));
	let statuses = $derived(unreleased ? ['wishlist'] : statusOrder);

	/** Draft progress values, seeded from the entry whenever it changes. */
	let draft = $state({});
	let editingProgress = $state(false);

	function openProgress() {
		draft = { ...(entry?.progress ?? {}) };
		for (const field of shape.fields) draft[field.key] ??= field.min;
		editingProgress = true;
	}

	function saveProgress() {
		const progress = {};
		for (const field of shape.fields) progress[field.key] = Number(draft[field.key]) || field.min;
		library.setProgress(session.user.id, item.id, progress);
		editingProgress = false;
	}

	function choose(status) {
		if (!session.user) return goto('/login');
		library.setStatus(session.user.id, item.id, entry?.status === status ? null : status);
		editingProgress = false;
	}

	function rate(value) {
		if (!session.user) return goto('/login');
		library.setRating(session.user.id, item.id, value);
	}
</script>

<div class="shelf">
	<div class="statuses" role="group" aria-label="Shelf">
		{#each statuses as status (status)}
			<button
				type="button"
				class="pill"
				class:on={entry?.status === status}
				aria-pressed={entry?.status === status}
				onclick={() => choose(status)}
			>
				{#if entry?.status === status}<Icon name="check" size={13} stroke={2.6} />{/if}
				{statusLabel(item.type, status)}
			</button>
		{/each}
	</div>

	{#if !unreleased}
		<div class="rate">
			<span class="eyebrow">Your score</span>
			<Stars value={entry?.rating ?? null} size={26} interactive onchange={rate} />
			{#if entry?.rating}
				<span class="value">{entry.rating.toFixed(1)}</span>
			{/if}
		</div>
	{/if}

	{#if shape && session.user && entry}
		<div class="progress">
			{#if editingProgress}
				<div class="fields">
					{#each shape.fields as field (field.key)}
						<label>
							<span class="eyebrow">{field.label}</span>
							<input
								class="field"
								type="number"
								min={field.min}
								bind:value={draft[field.key]}
							/>
						</label>
					{/each}
					<button type="button" class="btn btn-accent btn-sm" onclick={saveProgress}>Save</button>
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						onclick={() => (editingProgress = false)}>Cancel</button
					>
				</div>
			{:else}
				<button type="button" class="btn btn-sm" onclick={openProgress}>
					<Icon name="edit" size={14} />
					{entry.progress ? 'Update progress' : 'Track progress'}
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.shelf {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.statuses {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--line-strong);
		border-radius: 99px;
		background: var(--tint);
		color: var(--muted);
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background 0.18s ease,
			color 0.18s ease,
			border-color 0.18s ease;
	}

	.pill:hover {
		color: var(--ink);
		background: var(--tint-strong);
	}

	.pill.on {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
		font-weight: 600;
	}

	.rate {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.rate .eyebrow {
		margin-right: 0.15rem;
	}

	.value {
		font-family: var(--font-display);
		font-size: 1.35rem;
		color: var(--brass);
	}

	.fields {
		display: flex;
		align-items: flex-end;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.fields label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.fields input {
		width: 6rem;
		padding: 0.4rem 0.6rem;
	}
</style>
