<!--
	One line of the feed: who did what to which title, with their score and the
	first lines of their review when they wrote one.
-->
<script>
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Stars from '$lib/components/Stars.svelte';
	import { itemPath } from '$lib/data/items.js';
	import { activitySentence, progressLabel, statusLabel } from '$lib/data/types.js';
	import { segments } from '$lib/i18n/index.svelte.js';
	import { timeAgo } from '$lib/util/format.js';

	let { event, compact = false } = $props();

	let { user, item, entry, review } = $derived(event);

	/*
	 * The whole line is one translated sentence, taken apart into the words
	 * around its two names and the names themselves. It used to be a verb
	 * dropped between two links, which fixes the English order — "Kaan watched
	 * Dune" — onto every language, and Turkish puts the verb last.
	 */
	let line = $derived(segments(activitySentence(item.type, entry.status)));
</script>

<article class="activity" class:compact data-type={item.type}>
	<a class="art" href={itemPath(item)} aria-label={item.title}>
		<img src={item.poster} alt="" loading="lazy" />
	</a>

	<div class="body">
		<div class="who">
			<!--
				One inline run rather than a row of flex items: the spacing and the
				punctuation between the words belong to the sentence the
				translator wrote, and a flex `gap` would override both — Turkish
				joins with a comma and no space before it.
			-->
			<span class="sentence"
				>{#each line as part, position (position)}{#if part.slot === 'person'}<a
							href="/u/{user.username}"
							class="person"
						>
							<Avatar {user} size={compact ? 22 : 26} />
							<strong>{user.name}</strong>
						</a>{:else if part.slot === 'title'}<a href={itemPath(item)} class="what"
							>{item.title}</a
						>{:else}<span class="muted">{part.text}</span>{/if}{/each}</span
			>
			<span class="faint when">{timeAgo(entry.at)}</span>
		</div>

		<div class="meta">
			{#if entry.rating}
				<Stars value={entry.rating} size={14} />
			{/if}
			{#if entry.progress}
				<span class="chip chip-accent">
					<Icon name={item.type} size={12} />
					{progressLabel(item, entry.progress)}
				</span>
			{:else if entry.status !== 'done'}
				<span class="chip">{statusLabel(item.type, entry.status)}</span>
			{/if}
		</div>

		{#if review && !compact}
			<a class="review" href={itemPath(item)}>
				<Icon name="quote" size={14} filled />
				<p>{review.body}</p>
			</a>
		{/if}
	</div>
</article>

<style>
	.activity {
		display: flex;
		gap: 0.9rem;
		padding: 0.9rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--tint);
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.activity:hover {
		border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
		background: var(--tint);
	}

	.art {
		flex: none;
		width: 3.25rem;
		aspect-ratio: 2 / 3;
		border-radius: 7px;
		overflow: hidden;
		background: var(--surface-2);
	}

	.compact .art {
		width: 2.5rem;
	}

	.art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.body {
		min-width: 0;
		flex: 1;
	}

	.who {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		font-size: 0.92rem;
		line-height: 1.4;
	}

	/* Inline flow, so the translated sentence keeps its own spacing. */
	.sentence {
		display: inline;
	}

	.person {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		vertical-align: middle;
	}

	.person:hover strong {
		color: var(--brand);
	}

	.what {
		font-weight: 600;
		color: var(--accent);
	}

	.what:hover {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.when {
		font-size: 0.78rem;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.4rem;
		min-height: 1.1rem;
	}

	.review {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.6rem;
		padding-left: 0.7rem;
		border-left: 2px solid var(--accent-soft);
		color: var(--accent);
	}

	.review p {
		margin: 0;
		max-width: 72ch;
		color: var(--muted);
		font-size: 0.9rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.review:hover p {
		color: var(--ink);
	}
</style>
