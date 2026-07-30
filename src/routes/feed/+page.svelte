<script>
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import FollowButton from '$lib/components/FollowButton.svelte';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { plural } from '$lib/util/format.js';

	let scope = $state('following');

	let events = $derived(
		session.user && scope === 'following'
			? library.feedFor(session.user.id, 40)
			: library.activity({ limit: 40 })
	);

	/** People the viewer does not already follow, busiest first. */
	let suggestions = $derived(
		library.users
			.filter((person) => person.id !== session.user?.id)
			.filter((person) => !session.user || !library.isFollowing(session.user.id, person.id))
			.map((person) => ({ person, count: library.entriesOf(person.id).length }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 6)
	);

	$effect(() => {
		if (!session.user) return;
		void library.loadFeed(scope, 40).catch(() => {});
	});
</script>

<svelte:head><title>Feed — You Know Me</title></svelte:head>

<div class="frame page">
	<header>
		<span class="eyebrow">Activity</span>
		<h1 class="display">Lately</h1>
		{#if session.user}
			<div class="scope">
				<button type="button" class:on={scope === 'following'} onclick={() => (scope = 'following')}>
					People you follow
				</button>
				<button type="button" class:on={scope === 'everyone'} onclick={() => (scope = 'everyone')}>
					Everyone
				</button>
			</div>
		{:else}
			<p class="muted">
				Everything happening here. <a href="/login">Sign in</a> to narrow it down to people you follow.
			</p>
		{/if}
	</header>

	<div class="layout">
		<div class="stream">
			{#each events as event (event.entry.id)}
				<ActivityCard {event} />
			{:else}
				<p class="muted empty">
					Quiet in here. Follow a few people and their evenings show up on this page.
				</p>
			{/each}
		</div>

		<aside>
			<section class="card">
				<h2 class="eyebrow">People to follow</h2>
				<ul>
					{#each suggestions as { person, count } (person.id)}
						<li>
							<a href="/u/{person.username}">
								<Avatar user={person} size={36} />
								<span>
									<strong>{person.name}</strong>
									<span class="faint">{plural(count, 'entry', 'entries')}</span>
								</span>
							</a>
							<FollowButton user={person} size="btn-sm" />
						</li>
					{:else}
						<li class="faint">You already follow everyone here.</li>
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
		color: var(--brass);
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
		background: var(--brass);
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
		color: var(--brass);
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
