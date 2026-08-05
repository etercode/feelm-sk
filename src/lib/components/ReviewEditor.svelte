<!--
	The one review you are allowed per item. Writing again edits it, and the
	previous text is kept — the card below shows the trail.
-->
<script>
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ReviewCard from '$lib/components/ReviewCard.svelte';
	import Stars from '$lib/components/Stars.svelte';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { typeOf } from '$lib/data/types.js';
	import { i18n, t } from '$lib/i18n/index.svelte.js';

	let { item } = $props();

	let mine = $derived(session.user ? library.reviewFor(session.user.id, item.id) : null);

	let editing = $state(false);
	let body = $state('');
	let rating = $state(null);

	function start() {
		body = mine?.body ?? '';
		rating = mine?.rating ?? library.entryFor(session.user.id, item.id)?.rating ?? null;
		editing = true;
	}

	function save() {
		if (!body.trim()) return;
		library.saveReview(session.user.id, item, { rating, body: body.trim() });
		editing = false;
	}

	function remove() {
		library.deleteReview(session.user.id, item);
		editing = false;
	}
</script>

{#if !session.user}
	<div class="prompt card">
		<Icon name="quote" size={18} filled />
		<p>
			<a href="/login">{t('nav.signIn')}</a>
			{t('review.signInPrompt', { type: typeOf(item).label.toLocaleLowerCase(i18n.tag) })}
		</p>
	</div>
{:else if editing}
	<form
		class="composer card"
		onsubmit={(event) => {
			event.preventDefault();
			save();
		}}
	>
		<div class="who">
			<Avatar user={session.user} size={38} />
			<div>
				<strong>{session.user.name}</strong>
				<span class="faint">
					{mine ? t('review.editingNote') : t('review.yours')}
				</span>
			</div>
			<Stars value={rating} size={22} interactive onchange={(value) => (rating = value)} />
		</div>

		<textarea
			class="field"
			rows="5"
			bind:value={body}
			placeholder={t('review.placeholder')}
		></textarea>

		<div class="actions">
			<button type="submit" class="btn btn-accent btn-sm" disabled={!body.trim()}>
				{mine ? t('review.saveChanges') : t('review.post')}
			</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => (editing = false)}>
				{t('common.cancel')}
			</button>
			{#if mine}
				<button type="button" class="btn btn-ghost btn-sm danger" onclick={remove}>{t('common.delete')}</button>
			{/if}
		</div>
	</form>
{:else if mine}
	<div class="mine">
		<span class="eyebrow">{t('review.yours')}</span>
		<ReviewCard review={mine} showAuthor={false} />
		<button type="button" class="btn btn-sm" onclick={start}>
			<Icon name="edit" size={14} />{t('common.edit')}
		</button>
	</div>
{:else}
	<button type="button" class="invite card" onclick={start}>
		<Avatar user={session.user} size={34} />
		<span>{t('review.invite', { title: item.title })}</span>
		<span class="btn btn-accent btn-sm">{t('review.write')}</span>
	</button>
{/if}

<style>
	.prompt {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.15rem;
		color: var(--accent);
	}

	.prompt p {
		margin: 0;
		color: var(--muted);
	}

	.prompt a {
		color: var(--brand);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.invite {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.85rem 1rem;
		text-align: left;
		background: var(--tint);
		cursor: pointer;
		color: var(--muted);
	}

	.invite:hover {
		border-color: color-mix(in srgb, var(--accent) 40%, var(--line));
	}

	.invite span:nth-of-type(1) {
		flex: 1;
	}

	.composer {
		padding: 1.15rem;
		background: var(--surface);
	}

	.who {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-bottom: 0.85rem;
	}

	.who div {
		display: flex;
		flex-direction: column;
		line-height: 1.3;
		flex: 1;
		font-size: 0.9rem;
	}

	textarea {
		resize: vertical;
		line-height: 1.55;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.85rem;
	}

	.danger {
		color: var(--danger);
		margin-left: auto;
	}

	.mine {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.6rem;
	}

	.mine :global(.review) {
		align-self: stretch;
		border-color: color-mix(in srgb, var(--accent) 30%, var(--line));
		background: var(--accent-soft);
	}
</style>
