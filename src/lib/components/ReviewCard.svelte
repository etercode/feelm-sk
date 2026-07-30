<!--
	Somebody's review. Everyone gets one per item, so the interesting part is
	what it used to say — earlier versions stay available behind a disclosure.
-->
<script>
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Stars from '$lib/components/Stars.svelte';
	import { library } from '$lib/state/library.svelte.js';
	import { plural, timeAgo } from '$lib/util/format.js';

	let { review, showAuthor = true } = $props();

	let author = $derived(library.userById(review.userId));
	let historyOpen = $state(false);
</script>

<article class="review">
	{#if showAuthor && author}
		<a class="author" href="/u/{author.username}">
			<Avatar user={author} size={38} />
			<span>
				<strong>{author.name}</strong>
				<span class="faint">@{author.username}</span>
			</span>
		</a>
	{/if}

	<div class="head">
		<Stars value={review.rating} size={16} />
		<span class="faint when">
			{timeAgo(review.updatedAt)}
			{#if review.history.length}<span class="edited">· edited</span>{/if}
		</span>
	</div>

	<p class="body">{review.body}</p>

	{#if review.history.length}
		<button type="button" class="history-toggle" onclick={() => (historyOpen = !historyOpen)}>
			<Icon name="history" size={14} />
			{plural(review.history.length, 'earlier version')}
			<Icon name={historyOpen ? 'up' : 'down'} size={13} />
		</button>

		{#if historyOpen}
			<ol class="history">
				{#each review.history as version (version.editedAt)}
					<li>
						<div class="head">
							<Stars value={version.rating} size={13} />
							<span class="faint when">until {timeAgo(version.editedAt)}</span>
						</div>
						<p>{version.body}</p>
					</li>
				{/each}
			</ol>
		{/if}
	{/if}
</article>

<style>
	.review {
		padding: 1.15rem 1.25rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--tint);
	}

	.author {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.7rem;
	}

	.author span {
		display: flex;
		flex-direction: column;
		line-height: 1.3;
		font-size: 0.9rem;
	}

	.author:hover strong {
		color: var(--brass);
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.when {
		font-size: 0.78rem;
	}

	.edited {
		color: var(--faint);
	}

	.body {
		margin: 0.6rem 0 0;
		color: var(--ink);
		opacity: 0.92;
		white-space: pre-wrap;
	}

	.history-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.85rem;
		padding: 0.25rem 0.6rem 0.25rem 0.45rem;
		border: 1px solid var(--line);
		border-radius: 99px;
		background: none;
		color: var(--faint);
		font-size: 0.78rem;
		cursor: pointer;
		transition: color 0.18s ease, border-color 0.18s ease;
	}

	.history-toggle:hover {
		color: var(--ink);
		border-color: var(--line-strong);
	}

	.history {
		list-style: none;
		margin: 0.85rem 0 0;
		padding: 0 0 0 0.9rem;
		border-left: 2px solid var(--line);
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.history p {
		margin: 0.3rem 0 0;
		font-size: 0.9rem;
		color: var(--faint);
	}
</style>
