<script>
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import HomeSkeleton from '$lib/components/HomeSkeleton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import Rail from '$lib/components/Rail.svelte';
	import { types } from '$lib/data/types.js';
	import { catalog } from '$lib/state/catalog.svelte.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { t } from '$lib/i18n/index.svelte.js';

	/*
	 * The rails and the release queue are this page's data, so this page asks
	 * for them. They used to load from the root layout, which meant every
	 * visit to /movies or /search or /settings paid for a front page it was
	 * never going to draw.
	 */
	$effect(() => {
		void catalog.hydrate();
	});

	let releases = $derived(catalog.upcomingItems());

	/*
	 * 28 is four rows at the widest breakpoint the wall uses; narrower ones
	 * show fewer and drop the rest with CSS, so this is an upper bound rather
	 * than the number anybody sees.
	 */
	const PER_SECTION = 28;

	let sections = $derived(
		[
			{ type: 'movie', items: catalog.topOfType('movie', PER_SECTION) },
			{ type: 'series', items: catalog.topOfType('series', PER_SECTION) },
			{ type: 'game', items: catalog.topOfType('game', PER_SECTION) },
			{ type: 'book', items: catalog.itemsOfType('book') }
		].map((section) => ({
			kicker: t(`home.kicker.${section.type}`),
			...section,
			items: section.items.filter((item) => !item.isUpcoming)
		}))
	);

	let feed = $derived(
		session.user ? library.feedFor(session.user.id, 4) : library.activity({ limit: 4 })
	);

	let unseen = $derived(releases.filter((r) => r.isNew === true).length);
</script>

<svelte:head>
	<title>{t('home.title')}</title>
</svelte:head>

{#if !catalog.ready}
	<HomeSkeleton />
{:else if catalog.error}
	<div class="frame loading">
		<p class="error">{catalog.error}</p>
		<p class="muted">{t('home.apiHint', { url: 'VITE_API_URL' })}</p>
	</div>
{:else}
	<Hero {releases} />

	<div class="frame">
		{#if unseen}
			<p class="crawl">
				<span class="pip"></span>
				{t('home.crawledSince', { count: unseen })}
				{#if session.user}
					<button type="button" onclick={() => library.catchUp(session.user.id)}>
						{t('home.markSeen')}
					</button>
				{/if}
			</p>
		{/if}

		<!--
			Above the per-type rails on purpose: those are ranked by popularity
			and barely move from week to week, so a visitor who came back to see
			what is new would otherwise have to know which of them changed.
		-->
		{#if catalog.latest.length}
			<Rail kicker={t('home.latestKicker')} title={t('home.latestTitle')} rows={2} grid>
				{#each catalog.latest as item (item.id)}
					<PosterCard {item} showType />
				{/each}
			</Rail>
		{/if}

		{#each sections as section (section.type)}
			<Rail
				kicker={section.kicker}
				title={types[section.type].plural}
				href={types[section.type].browse}
				type={section.type}
				rows={4}
				grid
			>
				{#each section.items as item (item.id)}
					<PosterCard {item} showType={false} />
				{/each}
			</Rail>
		{/each}

		<section class="lately">
			<header>
				<div>
					<span class="eyebrow">
						{session.user ? t('home.latelyFollowing') : t('home.latelyEveryone')}
					</span>
					<h2 class="display">{t('home.lately')}</h2>
				</div>
				<a class="btn btn-ghost btn-sm" href="/feed">{t('home.openFeed')}<Icon name="right" size={14} /></a>
			</header>

			<div class="feed-grid">
				{#each feed as event (event.entry.id)}
					<ActivityCard {event} compact />
				{:else}
					<p class="muted">
						{t('home.noFollowing')} <a href="/u/ada">{t('home.findSomeone')}</a>
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
		color: var(--brand);
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
