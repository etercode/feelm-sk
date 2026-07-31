<!--
	What there is, and what happened lately.

	Everything on this page is a count or a short list, and none of it grows
	with the catalog — which is what makes it safe to poll. The crawl adds
	titles by the thousand while you watch, so the numbers refresh on their own
	rather than going stale behind a page you left open.
-->
<script>
	import * as api from '$lib/api/client.js';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import StatTiles from '$lib/components/admin/StatTiles.svelte';
	import { session } from '$lib/state/session.svelte.js';

	/** Seconds between refreshes. The counts cost one query; this is affordable. */
	const REFRESH = 30;

	let data = $state(null);
	let error = $state(null);
	let loading = $state(true);

	async function load() {
		try {
			data = await api.adminOverview();
			error = null;
		} catch (e) {
			error = e.message ?? 'Could not load the overview.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void load();
		const timer = setInterval(load, REFRESH * 1000);
		return () => clearInterval(timer);
	});

	let catalogTiles = $derived(
		data
			? [
					// Works and People are still counts — their tables have not been
					// built, so those tiles do not pretend to lead anywhere.
					{
						key: 'works',
						label: 'Works',
						value: data.totals.works,
						icon: 'film',
						accent: 'movie',
						hint: data.recent.worksToday
							? `+${data.recent.worksToday.toLocaleString()} today`
							: 'nothing new today'
					},
					{
						key: 'people',
						label: 'People',
						value: data.totals.people,
						icon: 'user',
						hint: `${data.totals.credits.toLocaleString()} credits`
					},
					{
						key: 'users',
						label: 'Users',
						value: data.users.active,
						icon: 'users',
						href: '/admin/users',
						hint: roleHint(data.users)
					},
					{
						key: 'reviews',
						label: 'Reviews',
						value: data.totals.reviews,
						icon: 'quote',
						href: '/admin/reviews',
						hint: data.recent.reviewsThisWeek
							? `+${data.recent.reviewsThisWeek.toLocaleString()} this week`
							: 'none this week'
					},
					{
						key: 'entries',
						label: 'Shelf entries',
						value: data.totals.entries,
						icon: 'bookmark',
						hint: `${data.totals.follows.toLocaleString()} follows`
					},
					{
						key: 'genres',
						label: 'Genres',
						value: data.totals.genres,
						icon: 'filter'
					}
				]
			: []
	);

	/** @param {{ admins: number, moderators: number, deleted: number }} users */
	function roleHint(users) {
		const parts = [];
		if (users.admins) parts.push(`${users.admins} admin${users.admins === 1 ? '' : 's'}`);
		if (users.moderators) parts.push(`${users.moderators} mod`);
		if (users.deleted) parts.push(`${users.deleted} deleted`);
		return parts.join(' · ') || 'no roles granted';
	}

	/** @param {string|null} iso */
	function ago(iso) {
		if (!iso) return '—';
		const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
		if (seconds < 60) return `${seconds}s ago`;
		if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
		return `${Math.round(seconds / 86400)}d ago`;
	}
</script>

<svelte:head><title>Admin — Feelm</title></svelte:head>

<header class="masthead">
	<div>
		<span class="eyebrow"><Icon name="chart" size={14} />Dashboard</span>
		<h1 class="display">Overview</h1>
	</div>
	<span class="who faint">
		{#if loading && !data}<Spinner size={13} />{/if}
		Signed in as {session.user?.name}
	</span>
</header>

{#if error && !data}
	<p class="notice">{error}</p>
{:else if data}
	<StatTiles tiles={catalogTiles} />

	<div class="split">
		<section class="card panel">
			<h2 class="section">Catalog by type</h2>
			{#if Object.keys(data.totals.worksByType).length === 0}
				<p class="faint">Nothing crawled yet.</p>
			{:else}
				<ul class="bars">
					{#each Object.entries(data.totals.worksByType) as [type, count] (type)}
						<li data-type={type}>
							<span class="bar-label">
								<Icon name={type} size={14} />
								{type}
							</span>
							<span class="track">
								<span
									class="fill"
									style="width: {Math.max((count / data.totals.works) * 100, 0.5)}%"
								></span>
							</span>
							<span class="bar-value">{count.toLocaleString()}</span>
						</li>
					{/each}
				</ul>
			{/if}

			<p class="note faint">
				{data.recent.worksThisWeek.toLocaleString()} added in the last seven days.
			</p>
		</section>

		<section class="card panel">
			<h2 class="section">Newest accounts</h2>
			{#if data.newestUsers.length === 0}
				<p class="faint">Nobody has signed up.</p>
			{:else}
				<ul class="people">
					{#each data.newestUsers as user (user.id)}
						<li>
							<a href="/admin/users/{user.id}">
								<Avatar {user} size={32} />
								<span class="person">
									<strong>{user.name}</strong>
									<span class="faint">@{user.username}</span>
								</span>
							</a>
							<span class="when faint">{ago(user.createdAt)}</span>
						</li>
					{/each}
				</ul>
			{/if}
			<p class="note faint">
				{data.recent.usersThisWeek.toLocaleString()} joined in the last seven days.
			</p>
		</section>
	</div>

	<section class="card panel">
		<h2 class="section">
			Latest reviews
			<a class="more" href="/admin/reviews">Moderate<Icon name="right" size={12} /></a>
		</h2>
		{#if data.newestReviews.length === 0}
			<p class="faint">Nobody has written a review yet.</p>
		{:else}
			<ul class="reviews">
				{#each data.newestReviews as review (review.id)}
					<li>
						<div class="head">
							<strong>{review.user?.name ?? 'Someone'}</strong>
							<span class="chip chip-accent">{review.rating}</span>
							<span class="faint">{ago(review.createdAt)}</span>
						</div>
						<p class="body muted">{review.body}</p>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<style>
	.masthead {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1.5rem;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--brand);
	}

	h1 {
		font-size: clamp(1.8rem, 5vw, 2.6rem);
		margin: 0.3rem 0 0;
	}

	.who {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		white-space: nowrap;
	}

	.notice {
		padding: 1rem 1.1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		color: var(--danger);
	}

	.split {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.panel {
		padding: clamp(1.1rem, 3vw, 1.5rem);
		margin-bottom: 1rem;
	}

	.split .panel {
		margin-bottom: 0;
	}

	.section {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 0 1rem;
		font-size: 1rem;
	}

	.more {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		color: var(--brand);
		font-size: 0.8rem;
		font-weight: 500;
	}

	.more:hover {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.note {
		margin: 1rem 0 0;
		font-size: 0.82rem;
	}

	/* Catalog bars ------------------------------------------------------ */

	.bars {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.bars li {
		display: grid;
		grid-template-columns: 6rem 1fr auto;
		align-items: center;
		gap: 0.75rem;
	}

	.bar-label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--accent);
		font-size: 0.85rem;
		text-transform: capitalize;
	}

	.track {
		height: 8px;
		border-radius: 999px;
		background: var(--accent-soft);
		overflow: hidden;
	}

	.fill {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--accent);
	}

	.bar-value {
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}

	/* People ------------------------------------------------------------ */

	.people,
	.reviews {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.people li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.people a {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex: 1;
		min-width: 0;
		padding: 0.4rem;
		border-radius: var(--radius);
	}

	.people a:hover {
		background: var(--tint);
	}

	.person {
		display: flex;
		flex-direction: column;
		min-width: 0;
		font-size: 0.88rem;
	}

	.person span {
		font-size: 0.8rem;
	}

	.when {
		font-size: 0.8rem;
		white-space: nowrap;
	}

	/* Reviews ----------------------------------------------------------- */

	.reviews li {
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--line);
	}

	.reviews li:last-child {
		border-bottom: 0;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.88rem;
	}

	.body {
		margin: 0.3rem 0 0;
		font-size: 0.88rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
