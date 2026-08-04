<script>
	import { goto } from '$app/navigation';
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import FollowButton from '$lib/components/FollowButton.svelte';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { counted } from '$lib/util/format.js';

	const PER_PAGE = 40;

	let scope = $state('following');

	/*
	 * Signed in only. The feed is other people's activity, and the endpoint
	 * behind it is /api/me/feed, which needs a token — a signed-out visitor
	 * used to reach this page, fire the request and get "Could not reach the
	 * API", which is a 401 dressed as a fault. The nav link is hidden too, so
	 * this is the bookmark and back-button case rather than the normal way in.
	 */
	let ready = $state(false);

	$effect(() => {
		session.hydrate().then(() => {
			ready = true;
			if (!session.user) goto('/login');
		});
	});

	/*
	 * The stream is what the server sent, kept as-is and appended to.
	 *
	 * It used to be derived from library.entries, which also holds every row of
	 * your own shelf — so the page re-sorted your whole library together with
	 * the forty events the server had chosen, and there was no page two to ask
	 * for. Holding the answer means "Load more" has somewhere to put the next
	 * one.
	 */
	/** @type {any[]} */
	let events = $state([]);
	let hasMore = $state(false);
	let page = $state(1);
	let loading = $state(false);
	let failed = $state(false);

	/** People the viewer does not already follow, busiest first. */
	let suggestions = $derived(
		library.users
			.filter((person) => person.id !== session.user?.id)
			.filter((person) => !session.user || !library.isFollowing(session.user.id, person.id))
			.map((person) => ({ person, count: library.entriesOf(person.id).length }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 6)
	);

	/*
	 * Reloads from the top whenever the scope changes, and once on arrival.
	 * Signed out there is only one feed to show, so the scope is pinned to
	 * everyone rather than the buttons being hidden and the fetch skipped.
	 */
	$effect(() => {
		// Nothing is fetched until we know who is asking; the guard above sends
		// anyone without a session to /login before this can run.
		if (!ready || !session.user) return;

		const wanted = scope;
		let live = true;

		page = 1;
		loading = true;
		failed = false;

		library
			.loadFeed(wanted, PER_PAGE, 1)
			.then((data) => {
				if (!live) return;
				events = data.events;
				hasMore = data.hasMore;
			})
			.catch((e) => {
				if (!live) return;
				failed = true;
				console.warn('feed failed', e);
			})
			.finally(() => {
				if (live) loading = false;
			});

		return () => {
			live = false;
		};
	});

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;

		try {
			const next = page + 1;
			const data = await library.loadFeed(scope, PER_PAGE, next);
			// Appended by id, because an entry edited mid-scroll can arrive on
			// two pages — it moves to the top of the order as it is saved.
			const seen = new Set(events.map((event) => event.entry.id));
			events = [...events, ...data.events.filter((event) => !seen.has(event.entry.id))];
			hasMore = data.hasMore;
			page = next;
		} catch (e) {
			console.warn('feed page failed', e);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>{t('feed.title')} — Feelm</title></svelte:head>

<div class="frame page">
	<header>
		<span class="eyebrow">{t('feed.activity')}</span>
		<h1 class="display">{t('feed.heading')}</h1>
		{#if session.user}
			<!-- Always true by the time this renders — the guard sends everyone
			     else to /login — but kept so the markup cannot outrun hydration. -->
			<div class="scope">
				<button type="button" class:on={scope === 'following'} onclick={() => (scope = 'following')}>
					{t('feed.scopeFollowing')}
				</button>
				<button type="button" class:on={scope === 'everyone'} onclick={() => (scope = 'everyone')}>
					{t('feed.scopeEveryone')}
				</button>
				<!-- Your own activity is in "People you follow" too, as on any
				     timeline. This is the way to read it on its own. -->
				<button type="button" class:on={scope === 'me'} onclick={() => (scope = 'me')}>
					{t('feed.scopeMe')}
				</button>
			</div>
		{:else}
			<p class="muted">
				{t('feed.signedOut')} <a href="/login">{t('nav.signIn')}</a> {t('feed.signedOutTail')}
			</p>
		{/if}
	</header>

	<div class="layout">
		<div class="stream">
			{#each events as event (event.entry.id)}
				<ActivityCard {event} />
			{:else}
				{#if loading}
					<p class="muted empty">{t('common.loading')}</p>
				{:else if failed}
					<p class="muted empty">{t('feed.failed')}</p>
				{:else if scope === 'me'}
					<p class="muted empty">{t('feed.emptyMe')}</p>
				{:else}
					<p class="muted empty">{t('feed.empty')}</p>
				{/if}
			{/each}

			{#if hasMore}
				<button type="button" class="btn more" disabled={loading} onclick={loadMore}>
					{loading ? t('common.loading') : t('feed.loadMore')}
				</button>
			{/if}
		</div>

		<aside>
			<section class="card">
				<h2 class="eyebrow">{t('feed.peopleToFollow')}</h2>
				<ul>
					{#each suggestions as { person, count } (person.id)}
						<li>
							<a href="/u/{person.username}">
								<Avatar user={person} size={36} />
								<span>
									<strong>{person.name}</strong>
									<span class="faint">{counted('count.entry', count)}</span>
								</span>
							</a>
							<FollowButton user={person} size="btn-sm" />
						</li>
					{:else}
						<li class="faint">{t('feed.followEveryone')}</li>
					{/each}
				</ul>
			</section>
		</aside>
	</div>
</div>

<style>
	.page {
		padding-top: clamp(2rem, 5vw, 3.5rem);
		padding-bottom: 3rem;
	}

	header {
		padding-bottom: 1.5rem;
	}

	h1 {
		font-size: clamp(2.2rem, 6vw, 3.6rem);
		margin: 0.35rem 0 0.7rem;
	}

	header p {
		margin: 0;
	}

	header a {
		color: var(--brand);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.scope {
		display: flex;
		gap: 0.25rem;
	}

	.scope button {
		padding: 0.45rem 0.95rem;
		border: 0;
		border-radius: 99px;
		background: none;
		color: var(--muted);
		font-size: 0.9rem;
		cursor: pointer;
		transition: background 0.18s ease, color 0.18s ease;
	}

	.scope button:hover {
		background: var(--tint);
		color: var(--ink);
	}

	.scope button.on {
		background: var(--brand);
		color: var(--on-accent);
		font-weight: 600;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 19rem;
		gap: clamp(1.5rem, 4vw, 3rem);
	}

	.stream {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.empty {
		padding: 2rem 0;
	}

	/* Full width so it reads as the end of the stream rather than as one more
	   thing in it. */
	.more {
		align-self: stretch;
		margin-top: 0.5rem;
	}

	aside section {
		padding: 1.1rem 1.2rem;
		position: sticky;
		top: calc(var(--bar-height) + 1rem);
	}

	aside ul {
		list-style: none;
		margin: 0.9rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	aside li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
	}

	aside li a {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
	}

	aside li a span {
		display: flex;
		flex-direction: column;
		font-size: 0.86rem;
		line-height: 1.3;
	}

	aside li a:hover strong {
		color: var(--brand);
	}

	@media (max-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}

		aside section {
			position: static;
		}
	}
</style>
