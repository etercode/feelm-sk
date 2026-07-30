<script>
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import Rail from '$lib/components/Rail.svelte';
	import { types } from '$lib/data/types.js';
	import { catalog } from '$lib/state/catalog.svelte.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { plural } from '$lib/util/format.js';

	let releases = $derived(catalog.upcomingItems());

	let sections = $derived(
		[
			{ type: 'movie', kicker: 'Out now', items: catalog.topOfType('movie', 16) },
			{ type: 'series', kicker: 'Season by season', items: catalog.topOfType('series', 16) },
			{ type: 'game', kicker: 'On the backlog', items: catalog.topOfType('game', 16) },
			{ type: 'book', kicker: 'On the nightstand', items: catalog.itemsOfType('book') }
		].map((section) => ({
			...section,
			items: section.items.filter((item) => !item.isUpcoming)
		}))
	);

	let feed = $derived(
		session.user ? library.feedFor(session.user.id, 4) : library.activity({ limit: 4 })
	);

	let unseen = $derived(library.newForUser(session.user?.id, [...releases]).length);
</script>

<svelte:head>
	<title>You Know Me — films, series, games and books people finished</title>
</svelte:head>

{#if !catalog.ready}
	<div class="frame loading muted">Loading catalog…</div>
{:else if catalog.error}
	<div class="frame loading">
		<p class="error">{catalog.error}</p>
		<p class="muted">Is the API running at <code>VITE_API_URL</code>?</p>
	</div>
{:else}
	<Hero {releases} />

	<div class="frame">
		{#if unseen}
			<p class="crawl">
				<span class="pip"></span>
				The crawler added {plural(unseen, 'title')} since you were last here.
				{#if session.user}
					<button type="button" onclick={() => library.catchUp(session.user.id)}>
						Mark all as seen
					</button>
				{/if}
			</p>
		{/if}

		{#each sections as section (section.type)}
			<Rail
				kicker={section.kicker}
				title={types[section.type].plural}
				href={types[section.type].browse}
				type={section.type}
				rows={2}
			>
				{#each section.items as item (item.id)}
					<PosterCard {item} showType={false} />
				{/each}
			</Rail>
		{/each}

		<section class="lately">
			<header>
				<div>
					<span class="eyebrow">{session.user ? 'People you follow' : 'Around here'}</span>
					<h2 class="display">Lately</h2>
				</div>
				<a class="btn btn-ghost btn-sm" href="/feed">Open the feed<Icon name="right" size={14} /></a>
			</header>

			<div class="feed-grid">
				{#each feed as event (event.entry.id)}
					<ActivityCard {event} compact />
				{:else}
					<p class="muted">
						Nobody you follow has logged anything yet. <a href="/u/ada">Find someone to follow.</a>
					</p>
				{/each}
			</div>
		</section>
	</div>
{/if}

<style>
	.loading {
		padding: 4rem 0;
	}

	.error {
		color: var(--danger);
	}

	.crawl {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin: 1.5rem 0 0;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--line);
		border-radius: 99px;
		background: var(--surface);
		font-size: 0.88rem;
		color: var(--muted);
		width: fit-content;
	}

	.pip {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--new);
		flex: none;
	}

	.crawl button {
		border: 0;
		background: none;
		padding: 0;
		color: var(--brass);
		font-size: inherit;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.lately {
		margin: 3rem 0 4rem;
	}

	.lately header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.lately h2 {
		margin: 0.15rem 0 0;
		font-size: clamp(1.6rem, 3vw, 2.2rem);
	}

	.feed-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 1rem;
	}
</style>
