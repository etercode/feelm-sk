<!--
	Someone's profile.

	Two audiences share this page. A visitor is here to find out who this person
	is — so their picture, their words and what they are in the middle of come
	before any counting. The owner is here to run their shelves, and gets a
	search box, a list view and a status control on every row, so moving
	something between shelves never means opening the title and coming back.

	Everything is read from the library store rather than a load function,
	because accounts created in the browser only exist there.
-->
<script>
	import { page } from '$app/state';
	import * as api from '$lib/api/client.js';
	import Avatar from '$lib/components/Avatar.svelte';
	import FollowButton from '$lib/components/FollowButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import ReviewCard from '$lib/components/ReviewCard.svelte';
	import ShelfManager from '$lib/components/ShelfManager.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { itemPath } from '$lib/data/items.js';
	import { statusLabel, statusOrder, types, typeKeys } from '$lib/data/types.js';
	import { catalog } from '$lib/state/catalog.svelte.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { longDate, plural } from '$lib/util/format.js';

	let username = $derived(page.params.username);
	let user = $derived(library.userByUsername(username));
	let isMe = $derived(Boolean(session.user && user && session.user.id === user.id));

	let tab = $state('shelf');
	let typeFilter = $state(null);
	let statusFilter = $state(null);
	let search = $state('');
	let sort = $state('recent');
	let view = $state('grid');

	let stats = $derived(user ? library.statsOf(user.id) : null);
	let reviews = $derived(user ? library.reviewsBy(user.id) : []);
	let followers = $derived(user ? library.followersOf(user.id) : []);
	let following = $derived(user ? library.followingOf(user.id) : []);

	/** The head of the page, from the profile payload rather than the shelf. */
	let profile = $state(null);
	let banner = $derived(profile?.banner ?? null);
	let current = $derived(profile?.current ?? []);
	let sharedCount = $derived(profile?.sharedCount ?? 0);
	let loggedTotal = $derived(stats?.logged ?? 0);

	let loading = $state(true);
	let loadError = $state(null);

	$effect(() => {
		const handle = username;
		loading = true;
		loadError = null;
		library
			.loadProfile(handle)
			.then((data) => {
				profile = data;
				if (session.user && data?.user && data.isFollowing != null) {
					library.setFollowing(session.user.id, data.user.id, data.isFollowing);
				}
			})
			.catch(() => {
				loadError = 'Could not load this profile.';
			})
			.finally(() => {
				loading = false;
			});
	});

	/* ---- the shelf, one page at a time -------------------------------- */

	/**
	 * Filtering and paging happen on the server. Somebody with four thousand
	 * titles used to have all four thousand sent over so the browser could hide
	 * most of them; now a page is twenty-four rows whatever the shelf holds.
	 */
	const PER_PAGE = 24;

	/** Typing is debounced into this — one request per pause, not per keystroke. */
	let term = $state('');
	let pageNumber = $state(1);
	let shelf = $state({ items: [], total: 0, pages: 0 });
	let shelfLoading = $state(false);
	let shelfError = $state(null);

	$effect(() => {
		const typed = search;
		const timer = setTimeout(() => {
			if (typed.trim() !== term) {
				term = typed.trim();
				pageNumber = 1;
			}
		}, 250);

		return () => clearTimeout(timer);
	});

	// Any change of filter is a new first page.
	function refilter(change) {
		change();
		pageNumber = 1;
	}

	$effect(() => {
		if (!user) return;

		const request = {
			handle: username,
			type: typeFilter,
			status: statusFilter,
			q: term,
			sort,
			page: pageNumber
		};

		let live = true;
		shelfLoading = true;
		shelfError = null;

		api
			.getUserEntries(request.handle, {
				type: request.type,
				status: request.status,
				q: request.q,
				sort: request.sort,
				page: request.page,
				limit: PER_PAGE
			})
			.then((data) => {
				// A slower earlier request must not overwrite a newer answer.
				if (!live) return;
				library.ingestEntries(data.items);
				shelf = { items: data.items, total: data.total, pages: data.pages };
			})
			.catch(() => {
				if (live) shelfError = 'Could not load this shelf.';
			})
			.finally(() => {
				if (live) shelfLoading = false;
			});

		return () => {
			live = false;
		};
	});

	/*
	 * Rows are read back out of the store rather than used as fetched, so an
	 * inline shelf change shows immediately instead of waiting for a refetch —
	 * and something removed disappears, because the store no longer has it.
	 */
	let rows = $derived(
		user
			? shelf.items
					.map((row) => ({
						entry: library.entryFor(user.id, row.entry.itemId),
						item: catalog.itemById(row.entry.itemId)
					}))
					.filter((row) => row.entry && row.item)
			: []
	);

	let filtered = $derived(Boolean(typeFilter || statusFilter || term));

	function clearFilters() {
		typeFilter = null;
		statusFilter = null;
		search = '';
		term = '';
		pageNumber = 1;
	}
</script>

<svelte:head>
	<title>{user ? `${user.name} (@${user.username})` : 'Profile'} — Feelm</title>
</svelte:head>

{#if loading}
	<div class="frame missing">
		<p class="muted">Loading…</p>
	</div>
{:else if !user}
	<div class="frame missing">
		<h1 class="display">No one goes by @{username}</h1>
		<p class="muted">{loadError ?? 'Check the spelling and try again.'}</p>
		<a class="btn" href="/">Back home</a>
	</div>
{:else}
	<div class="frame">
		<header class="banner" class:plain={!banner}>
			{#if banner}
				<img class="art" src={banner.backdrop} alt="" />
				<div class="scrim"></div>
			{/if}

			<div class="who">
				<Avatar {user} size={112} ring />

				<div class="identity">
					<h1 class="display">{user.name}</h1>
					<p class="handle faint">@{user.username}</p>
					{#if user.tagline}<p class="tagline">{user.tagline}</p>{/if}
					<p class="dot-list small">
						{#if user.location}<span><Icon name="user" size={12} />{user.location}</span>{/if}
						<span>Joined {longDate(user.joinedAt)}</span>
						<span>{plural(followers.length, 'follower')}</span>
						<span>{following.length} following</span>
					</p>
				</div>

				<div class="cta">
					{#if isMe}
						<a class="btn btn-sm" href="/settings">
							<Icon name="edit" size={14} />Edit profile
						</a>
					{:else}
						<FollowButton {user} />
						{#if sharedCount}
							<span class="small in-common">{plural(sharedCount, 'title')} in common</span>
						{/if}
					{/if}
				</div>
			</div>
		</header>

		{#if user.bio}
			<p class="bio">{user.bio}</p>
		{/if}
	</div>

	{#if current.length}
		<div class="frame">
			<section class="current">
				<h2 class="eyebrow">{isMe ? 'You are in the middle of' : 'In the middle of'}</h2>
				<div class="current-rail scroller">
					{#each current as row (row.entry.id)}
						{@const item = catalog.itemById(row.entry.itemId) ?? row.item}
						<a class="current-card" href={itemPath(item)} data-type={item.type}>
							<img src={item.poster} alt="" loading="lazy" />
							<span class="current-title">{item.title}</span>
						</a>
					{/each}
				</div>
			</section>
		</div>
	{/if}

	<div class="frame">
		<section class="stats">
			<div><span class="figure display">{stats.logged}</span><span class="faint">logged</span></div>
			<div>
				<span class="figure display">{stats.finished}</span><span class="faint">finished</span>
			</div>
			<div>
				<span class="figure display">{stats.reviews}</span><span class="faint">reviews</span>
			</div>
			<div>
				<span class="figure display">{stats.averageRating ?? '—'}</span>
				<span class="faint">average score</span>
			</div>
			{#each typeKeys as key (key)}
				{#if stats.byType[key]}
					<div data-type={key} class="type-stat">
						<span class="figure display">{stats.byType[key]}</span>
						<span class="faint">{types[key].statuses.done.toLowerCase()}</span>
					</div>
				{/if}
			{/each}
		</section>

		<nav class="tabs">
			<button type="button" class:on={tab === 'shelf'} onclick={() => (tab = 'shelf')}>
				Shelf <span class="faint">{loggedTotal.toLocaleString()}</span>
			</button>
			<button type="button" class:on={tab === 'reviews'} onclick={() => (tab = 'reviews')}>
				Reviews <span class="faint">{reviews.length}</span>
			</button>
			<button type="button" class:on={tab === 'people'} onclick={() => (tab = 'people')}>
				People <span class="faint">{followers.length + following.length}</span>
			</button>
		</nav>

		{#if tab === 'shelf'}
			<div class="toolbar">
				<label class="search">
					<Icon name="search" size={15} />
					<span class="sr-only">Search this shelf</span>
					<input
						type="search"
						bind:value={search}
						placeholder={isMe ? 'Search your shelf' : 'Search this shelf'}
					/>
				</label>

				<div class="tools">
					<label class="sort">
						<span class="sr-only">Sort by</span>
						<select class="field" bind:value={sort} onchange={() => (pageNumber = 1)}>
							<option value="recent">Recently updated</option>
							<option value="rating">Highest scored</option>
							<option value="title">Title A–Z</option>
							<option value="year">Newest first</option>
						</select>
					</label>

					<div class="views" role="group" aria-label="Layout">
						<button
							type="button"
							class:on={view === 'grid'}
							aria-pressed={view === 'grid'}
							onclick={() => (view = 'grid')}
						>
							<Icon name="flex" size={14} />Posters
						</button>
						<button
							type="button"
							class:on={view === 'list'}
							aria-pressed={view === 'list'}
							onclick={() => (view = 'list')}
						>
							<Icon name="menu" size={14} />{isMe ? 'Manage' : 'List'}
						</button>
					</div>
				</div>
			</div>

			<div class="filters">
				<button
					type="button"
					class="chip"
					class:on={!typeFilter}
					onclick={() => refilter(() => (typeFilter = null))}
				>
					Everything
				</button>
				{#each typeKeys as key (key)}
					<button
						type="button"
						class="chip"
						data-type={key}
						class:on={typeFilter === key}
						onclick={() => refilter(() => (typeFilter = typeFilter === key ? null : key))}
					>
						<Icon name={key} size={12} />{types[key].plural}
					</button>
				{/each}

				<span class="divider"></span>

				{#each statusOrder as status (status)}
					<button
						type="button"
						class="chip"
						class:on={statusFilter === status}
						onclick={() => refilter(() => (statusFilter = statusFilter === status ? null : status))}
					>
						{statusLabel(typeFilter ?? 'movie', status)}
					</button>
				{/each}

				{#if filtered}
					<button type="button" class="chip clear" onclick={clearFilters}>
						<Icon name="close" size={12} />Clear
					</button>
				{/if}
			</div>

			<p class="count faint" aria-live="polite">
				{plural(shelf.total, 'title')}{filtered ? ' match' : ''}
				{#if shelf.pages > 1}· page {pageNumber} of {shelf.pages.toLocaleString()}{/if}
				{#if shelfLoading}<Spinner size={12} />{/if}
			</p>

			{#if shelfError}
				<p class="error">{shelfError}</p>
			{/if}

			<div class="results" class:busy={shelfLoading}>
				{#if view === 'list'}
					<ShelfManager {rows} userId={user.id} owner={isMe} />
				{:else}
					<div class="grid-posters shelf-grid">
						{#each rows as row (row.entry.id)}
							<PosterCard item={row.item} ownerId={user.id} />
						{:else}
							{#if !shelfLoading}
								<p class="muted">
									{filtered ? 'Nothing matches those filters.' : 'Nothing on this shelf yet.'}
								</p>
							{/if}
						{/each}
					</div>
				{/if}
			</div>

			<Pager
				page={pageNumber}
				pages={shelf.pages}
				busy={shelfLoading}
				onpage={(n) => (pageNumber = n)}
			/>
		{:else if tab === 'reviews'}
			<div class="reviews">
				{#each reviews as review (review.id)}
					{@const item = catalog.itemById(review.itemId)}
					{#if item}
						<article class="review-row" data-type={item.type}>
							<a href={itemPath(item)} class="thumb">
								<img src={item.poster} alt={item.title} loading="lazy" />
							</a>
							<div class="review-body">
								<a class="what" href={itemPath(item)}>{item.title}</a>
								<ReviewCard {review} showAuthor={false} />
							</div>
						</article>
					{/if}
				{:else}
					<p class="muted">No reviews written yet.</p>
				{/each}
			</div>
		{:else}
			<div class="people">
				<section>
					<h2 class="display">Following</h2>
					<ul>
						{#each following as person (person.id)}
							<li>
								<a href="/u/{person.username}">
									<Avatar user={person} size={38} />
									<span>
										<strong>{person.name}</strong>
										<span class="faint">{person.tagline}</span>
									</span>
								</a>
								<FollowButton user={person} size="btn-sm" />
							</li>
						{:else}
							<li class="muted">Following nobody yet.</li>
						{/each}
					</ul>
				</section>

				<section>
					<h2 class="display">Followers</h2>
					<ul>
						{#each followers as person (person.id)}
							<li>
								<a href="/u/{person.username}">
									<Avatar user={person} size={38} />
									<span>
										<strong>{person.name}</strong>
										<span class="faint">{person.tagline}</span>
									</span>
								</a>
								<FollowButton user={person} size="btn-sm" />
							</li>
						{:else}
							<li class="muted">No followers yet.</li>
						{/each}
					</ul>
				</section>
			</div>
		{/if}
	</div>
{/if}

<style>
	.missing {
		padding-block: clamp(4rem, 12vw, 8rem);
		text-align: center;
	}

	.missing h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		margin-bottom: 0.5rem;
	}

	.missing .btn {
		margin-top: 1rem;
	}

	/* Banner ------------------------------------------------------------- */

	/*
	 * The banner is a panel rather than a full-bleed band: their favourite
	 * backdrop sits inside it, and the page around it stays paper.
	 */
	.banner {
		position: relative;
		margin-top: clamp(1rem, 3vw, 1.75rem);
		border-radius: var(--radius-lg);
		overflow: hidden;
		color: var(--on-image);
		box-shadow: var(--shadow-card);
	}

	.banner.plain {
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--line);
	}

	.art {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 30%;
	}

	.scrim {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to top, rgb(8 10 15 / 0.9), rgb(8 10 15 / 0.6)),
			linear-gradient(to right, rgb(8 10 15 / 0.6), transparent 75%);
	}

	.who {
		position: relative;
		display: flex;
		align-items: flex-end;
		gap: clamp(1rem, 3vw, 2rem);
		padding: clamp(1.25rem, 4vw, 2.25rem);
	}

	/* On artwork the muted greys lose their contrast — lean on opacity. */
	.banner:not(.plain) .faint,
	.banner:not(.plain) .dot-list {
		color: inherit;
		opacity: 0.75;
	}

	.in-common {
		opacity: 0.8;
	}

	.identity {
		flex: 1;
		min-width: 0;
	}

	.identity h1 {
		font-size: clamp(2rem, 5vw, 3.4rem);
	}

	.handle {
		margin: 0;
		font-size: 0.9rem;
	}

	.tagline {
		margin: 0.5rem 0 0;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.15rem;
		opacity: 0.85;
	}

	.small {
		font-size: 0.8rem;
	}

	.dot-list span {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.cta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.4rem;
		flex: none;
	}

	/* What they wrote about themselves, kept to a readable measure. */
	.bio {
		max-width: 62ch;
		margin: 1.4rem 0 0;
		font-size: 1.02rem;
		color: var(--muted);
		white-space: pre-line;
	}

	/* In the middle of ---------------------------------------------------- */

	.current {
		margin-top: 2rem;
	}

	.current h2 {
		margin-bottom: 0.7rem;
	}

	.current-rail {
		display: flex;
		gap: 0.7rem;
		padding-bottom: 0.6rem;
	}

	.current-card {
		flex: none;
		width: 7.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.current-card img {
		width: 100%;
		aspect-ratio: 2 / 3;
		object-fit: cover;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		box-shadow: var(--shadow-card);
		transition: transform 0.18s ease;
	}

	.current-card:hover img {
		transform: translateY(-3px);
	}

	.current-title {
		font-size: 0.82rem;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.current-card:hover .current-title {
		color: var(--accent);
	}

	/* Stats -------------------------------------------------------------- */

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(1rem, 4vw, 3rem);
		margin-top: 2rem;
		padding: 1.4rem 0;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}

	.stats div {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		font-size: 0.85rem;
	}

	.figure {
		font-size: 1.9rem;
		color: var(--ink);
	}

	.type-stat .figure {
		color: var(--accent);
	}

	/* Tabs --------------------------------------------------------------- */

	.tabs {
		display: flex;
		gap: 0.25rem;
		margin: 1.4rem 0 1.1rem;
	}

	.tabs button {
		padding: 0.5rem 1rem;
		border: 0;
		border-radius: 99px;
		background: none;
		color: var(--muted);
		font-size: 0.92rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.18s ease, color 0.18s ease;
	}

	.tabs button:hover {
		background: var(--tint);
		color: var(--ink);
	}

	.tabs button.on {
		background: var(--tint-strong);
		color: var(--ink);
	}

	/* Shelf toolbar ------------------------------------------------------- */

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		padding-bottom: 0.9rem;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 12rem;
		max-width: 24rem;
		padding: 0.4rem 0.8rem;
		border: 1px solid var(--line-strong);
		border-radius: 99px;
		background: var(--surface);
		color: var(--faint);
	}

	.search:focus-within {
		border-color: color-mix(in srgb, var(--brand) 60%, transparent);
	}

	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: none;
		outline: none;
		font-size: 0.9rem;
		color: var(--ink);
	}

	.views {
		display: flex;
		gap: 0.2rem;
		padding: 0.2rem;
		border: 1px solid var(--line);
		border-radius: 99px;
	}

	.views button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.75rem;
		border: 0;
		border-radius: 99px;
		background: none;
		color: var(--muted);
		font-size: 0.84rem;
		cursor: pointer;
		transition: background 0.18s ease, color 0.18s ease;
	}

	.views button.on {
		background: var(--tint-strong);
		color: var(--ink);
	}

	.filters {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding-bottom: 1.2rem;
	}

	.filters .chip {
		cursor: pointer;
	}

	.filters .chip.on {
		background: var(--accent, var(--brand));
		border-color: var(--accent, var(--brand));
		color: var(--on-accent);
		font-weight: 600;
	}

	.filters .clear {
		color: var(--danger);
		border-color: color-mix(in srgb, var(--danger) 40%, transparent);
	}

	.divider {
		width: 1px;
		height: 1.2rem;
		background: var(--line);
		margin-inline: 0.35rem;
	}

	.count {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: -0.5rem 0 0.9rem;
		font-size: 0.85rem;
	}

	/* Dimmed rather than emptied, so the page does not jump between pages. */
	.results {
		transition: opacity 0.15s ease;
	}

	.results.busy {
		opacity: 0.5;
		pointer-events: none;
	}

	.shelf-grid {
		padding-bottom: 2rem;
	}


	.error {
		color: var(--danger);
		font-size: 0.9rem;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sort .field {
		width: auto;
		padding: 0.35rem 0.6rem;
		border-radius: 99px;
		font-size: 0.84rem;
		cursor: pointer;
	}

	/* Reviews tab -------------------------------------------------------- */

	.reviews {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		padding-bottom: 2rem;
	}

	.review-row {
		display: flex;
		gap: 1rem;
	}

	.thumb {
		flex: none;
		width: 4.5rem;
		aspect-ratio: 2 / 3;
		border-radius: 8px;
		overflow: hidden;
		background: var(--surface-2);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.review-body {
		flex: 1;
		min-width: 0;
	}

	.what {
		display: inline-block;
		margin-bottom: 0.4rem;
		font-family: var(--font-display);
		font-size: 1.3rem;
		color: var(--accent);
	}

	/* People tab --------------------------------------------------------- */

	.people {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
		gap: 2rem;
		padding-bottom: 2rem;
	}

	.people h2 {
		font-size: 1.4rem;
		margin-bottom: 0.8rem;
	}

	.people ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.people li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.6rem;
		border-radius: var(--radius);
	}

	.people li:hover {
		background: var(--tint);
	}

	.people li a {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-width: 0;
	}

	.people li span span {
		display: flex;
		flex-direction: column;
		font-size: 0.88rem;
		line-height: 1.35;
	}

	.people li .faint {
		font-size: 0.78rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 22ch;
	}

	@media (max-width: 700px) {
		.who {
			flex-wrap: wrap;
		}

		.cta {
			align-items: flex-start;
		}
	}
</style>
