<!--
	The bar. Transparent at the top of a page so the wash behind it is not
	flattened by a second sheet of glass, and glass once anything has scrolled
	under it — that promise was in this comment for a long time before the CSS
	kept it, and a bar that never changes is what made the top of the app read
	as a toolbar rather than a masthead.

	Two other things carry that: search is a field rather than an icon, because
	on a catalog of four hundred thousand titles it is the main way in and a
	2rem circle does not say so; and the section a page belongs to is marked by
	a rule along the bottom edge of the bar in that section's own colour, so the
	bar itself is the timeline and the current section is the playhead. The
	colours are the same four the chips and the rails already use.
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SearchOverlay from '$lib/components/SearchOverlay.svelte';
	import { types, typeKeys } from '$lib/data/types.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { theme } from '$lib/state/theme.svelte.js';

	let searchOpen = $state(false);
	let menuOpen = $state(false);
	let navOpen = $state(false);

	/** Whether anything has scrolled under the bar. See the note at the top. */
	let scrolled = $state(false);
	/** Which modifier the shortcut hint names. Browser-only — the server cannot know. */
	let apple = $state(false);

	let path = $derived(page.url.pathname);

	const themeIcon = { light: 'sun', dark: 'moon', system: 'monitor' };
	let themeTitle = $derived(t(`theme.${theme.choice}`));

	// Close everything on navigation.
	$effect(() => {
		path;
		menuOpen = false;
		navOpen = false;
	});

	$effect(() => {
		apple = /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
		// Set on mount as well as on scroll: a reload halfway down a page starts
		// scrolled, and the bar would otherwise be transparent over content.
		scrolled = window.scrollY > 4;
	});

	function onKeydown(event) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			searchOpen = true;
		}
	}

	async function signOut() {
		await session.signOut();
		menuOpen = false;
		goto('/');
	}
</script>

<svelte:window
	onkeydown={onKeydown}
	onscroll={() => (scrolled = window.scrollY > 4)}
	onclick={() => {
		menuOpen = false;
		navOpen = false;
	}}
/>

<!-- The open mobile panel hangs off the bar, so the bar has to be solid under it. -->
<header class="bar" class:lifted={scrolled || navOpen}>
	<div class="inner frame">
		<a class="brand" href="/" aria-label={t('nav.home')}>
			<!--
				The mark sits on its own dark tile in both themes. The F is white
				with a blue film strip, so on paper it would be a white shape on a
				near-white bar — the tile is what makes one asset work on both.
			-->
			<img class="mark" src="/logo.png" alt="" width="30" height="30" fetchpriority="high" />
			<span class="wordmark"><em>feel</em>m</span>
		</a>

		<!--
			No stopPropagation here on purpose: every child is a link, so a click
			inside the panel is either a navigation (which closes it anyway) or a
			miss, and a miss should close it too.
		-->
		<nav class="links" class:open={navOpen}>
			{#each typeKeys as key (key)}
				<a
					href={types[key].browse}
					data-type={key}
					class:active={path.startsWith(types[key].browse)}
				>
					<Icon name={key} size={15} />
					{types[key].plural}
				</a>
			{/each}
			<!-- Signed in only: the feed is people you follow, and there is
			     nothing behind it for somebody with no account. -->
			{#if session.user}
				<a href="/feed" class="feed" class:active={path === '/feed'}>
					<Icon name="activity" size={15} />
					{t('nav.feed')}
				</a>
			{/if}
		</nav>

		<!--
			A field, not an icon. It opens the same overlay the shortcut does; it
			is a button because nothing is typed here — the overlay owns the input
			and focuses it, and two inputs for one search is one too many.
		-->
		<button type="button" class="finder" aria-label={t('nav.search')} onclick={() => (searchOpen = true)}>
			<Icon name="search" size={16} />
			<span class="prompt">{t('search.quickPlaceholder')}</span>
			<kbd aria-hidden="true">{apple ? '⌘' : 'Ctrl'} K</kbd>
		</button>

		<div class="actions">
			<button
				type="button"
				class="icon-btn compact-search"
				aria-label={t('nav.search')}
				onclick={() => (searchOpen = true)}
			>
				<Icon name="search" size={18} />
			</button>

			<button
				type="button"
				class="icon-btn"
				aria-label={t('nav.theme', { mode: themeTitle })}
				title={t('nav.theme', { mode: themeTitle })}
				onclick={() => theme.cycle()}
			>
				<Icon name={themeIcon[theme.choice]} size={17} />
			</button>

			{#if session.user}
				<div class="account">
					<button
						type="button"
						class="avatar-btn"
						aria-label={t('nav.account')}
						aria-expanded={menuOpen}
						onclick={(event) => {
							event.stopPropagation();
							menuOpen = !menuOpen;
						}}
					>
						<Avatar user={session.user} size={32} ring />
					</button>

					{#if menuOpen}
						<div class="menu card" role="menu">
							<div class="who">
								<strong>{session.user.name}</strong>
								<span class="faint">@{session.user.username}</span>
							</div>
							<a href="/u/{session.user.username}" role="menuitem"
								><Icon name="user" size={16} />{t('nav.profile')}</a
							>
							<a href="/feed" role="menuitem"><Icon name="activity" size={16} />{t('nav.yourFeed')}</a>
							<a href="/settings" role="menuitem"><Icon name="edit" size={16} />{t('nav.settings')}</a>
							{#if session.isModerator}
								<a href="/admin" role="menuitem" class="admin">
									<Icon name="shield" size={16} />{t('nav.admin')}
								</a>
							{/if}
							<button type="button" role="menuitem" onclick={signOut}>
								<Icon name="logout" size={16} />{t('nav.signOut')}
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<a class="btn btn-sm" href="/login">{t('nav.signIn')}</a>
			{/if}

			<button
				type="button"
				class="icon-btn burger"
				aria-label={t('nav.menu')}
				aria-expanded={navOpen}
				onclick={(event) => {
					event.stopPropagation();
					navOpen = !navOpen;
				}}
			>
				<Icon name={navOpen ? 'close' : 'menu'} size={18} />
			</button>
		</div>
	</div>
</header>

<SearchOverlay open={searchOpen} onclose={() => (searchOpen = false)} />

<style>
	/*
	 * Nothing at rest. The border and the blur arrive with `.lifted`, so at the
	 * top of a page the bar is the page — no seam across the top of the wash,
	 * and no second pane of glass over the home hero.
	 */
	.bar {
		position: sticky;
		top: 0;
		z-index: 50;
		background: transparent;
		border-bottom: 1px solid transparent;
		transition:
			background 0.3s ease,
			border-color 0.3s ease,
			box-shadow 0.3s ease;
	}

	.bar.lifted {
		background: var(--glass);
		backdrop-filter: blur(14px) saturate(140%);
		border-bottom-color: var(--line);
		box-shadow: 0 6px 24px -18px rgb(8 10 20 / 0.9);
	}

	.inner {
		display: flex;
		align-items: center;
		gap: clamp(0.5rem, 1.6vw, 1.5rem);
		height: var(--bar-height);
	}

	/* Brand ------------------------------------------------------------- */

	.brand {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		flex: none;
	}

	.mark {
		width: 1.85rem;
		height: 1.85rem;
		border-radius: 9px;
		background: var(--brand-tile);
		/* The artwork carries its own padding; this is the tile's. */
		padding: 1px;
		display: block;
		transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.brand:hover .mark {
		transform: scale(1.06);
	}

	.wordmark {
		font-family: var(--font-display);
		font-size: 1.3rem;
		letter-spacing: 0.01em;
	}

	.wordmark em {
		font-style: italic;
		color: var(--brand);
	}

	/* Navigation -------------------------------------------------------- */

	/*
	 * Beside the brand rather than centred, because together they are the
	 * masthead: the name of the app and the four things in it.
	 */
	.links {
		display: flex;
		align-items: stretch;
		gap: 0.1rem;
		flex: none;
		min-width: 0;
	}

	/*
	 * Full height, so the marker below can reach the bottom edge of the bar
	 * rather than floating under a pill.
	 */
	.links a {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		height: var(--bar-height);
		padding: 0 0.75rem;
		color: var(--muted);
		font-size: 0.9rem;
		font-weight: 500;
		white-space: nowrap;
		transition: color 0.18s ease;
	}

	.links a:hover {
		color: var(--ink);
	}

	.links a.active {
		color: var(--ink);
		font-weight: 600;
	}

	/* The one place the section's own colour appears up here. */
	.links a.active :global(svg) {
		color: var(--accent);
	}

	/*
	 * The playhead. Half-width on hover so the bar answers the cursor without
	 * pretending the page has changed.
	 */
	.links a::after {
		content: '';
		position: absolute;
		left: 0.75rem;
		right: 0.75rem;
		bottom: 0;
		height: 2px;
		border-radius: 2px 2px 0 0;
		background: var(--accent);
		transform: scaleX(0);
		transition: transform 0.22s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.links a:hover::after {
		transform: scaleX(0.45);
	}

	.links a.active::after {
		transform: scaleX(1);
	}

	.links .feed {
		--accent: var(--brand);
	}

	/* Search ------------------------------------------------------------ */

	/*
	 * Takes the empty middle of the bar and stops short of 24rem, so on a wide
	 * screen it reads as a field somebody sized rather than one that stretched
	 * to whatever was left.
	 */
	.finder {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		flex: 0 1 24rem;
		min-width: 0;
		margin-left: auto;
		height: 2.2rem;
		padding: 0 0.5rem 0 0.8rem;
		border: 1px solid var(--line);
		border-radius: 99px;
		background: var(--surface);
		color: var(--faint);
		font: inherit;
		font-size: 0.86rem;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 0.18s ease,
			color 0.18s ease;
	}

	.finder:hover {
		border-color: var(--line-strong);
		color: var(--muted);
	}

	.prompt {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	kbd {
		flex: none;
		padding: 0.12rem 0.4rem;
		border: 1px solid var(--line);
		border-radius: 5px;
		background: var(--tint);
		font-family: var(--font-ui);
		font-size: 0.68rem;
		line-height: 1.4;
		color: var(--faint);
	}

	/* Actions ----------------------------------------------------------- */

	.actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex: none;
	}

	.icon-btn {
		display: grid;
		place-items: center;
		width: 2.2rem;
		height: 2.2rem;
		border: 1px solid transparent;
		border-radius: 50%;
		background: var(--tint);
		color: var(--muted);
		cursor: pointer;
		transition:
			color 0.18s ease,
			background 0.18s ease;
	}

	.icon-btn:hover {
		color: var(--ink);
		background: var(--tint-strong);
	}

	/* Both of these stand in for something wider on a narrow screen. */
	.burger,
	.compact-search {
		display: none;
	}

	.avatar-btn {
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		display: block;
	}

	.account {
		position: relative;
	}

	.menu {
		position: absolute;
		top: calc(100% + 0.6rem);
		right: 0;
		min-width: 13rem;
		padding: 0.4rem;
		background: var(--surface);
		box-shadow: var(--shadow-pop);
		display: flex;
		flex-direction: column;
		animation: drop 0.16s ease;
	}

	.who {
		display: flex;
		flex-direction: column;
		padding: 0.6rem 0.7rem;
		border-bottom: 1px solid var(--line);
		margin-bottom: 0.3rem;
		font-size: 0.85rem;
	}

	.menu a,
	.menu button {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 0.7rem;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--muted);
		font-size: 0.9rem;
		text-align: left;
		cursor: pointer;
	}

	.menu a:hover,
	.menu button:hover {
		background: var(--tint-strong);
		color: var(--ink);
	}

	/* The one item in the menu most people will never see. */
	.menu a.admin {
		color: var(--brand);
	}

	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
	}

	/* ---- narrower ------------------------------------------------------ */

	/*
	 * The hint goes first — it names a key a laptop trackpad user is least
	 * likely to reach for — then the field gives up width to the nav. The nav
	 * does not shrink and the field does, so the order things are sacrificed in
	 * is fixed rather than left to whatever runs out of room first.
	 */
	@media (max-width: 1150px) {
		kbd {
			display: none;
		}

		.finder {
			flex-basis: 11rem;
		}

		.links a {
			padding: 0 0.55rem;
			font-size: 0.85rem;
		}
	}

	@media (max-width: 940px) {
		.burger,
		.compact-search {
			display: grid;
		}

		.finder {
			display: none;
		}

		/*
		 * A panel under the bar. Rows are tall enough to hit with a thumb, and
		 * the marker turns on its side — a 2px rule under a stacked row reads as
		 * a divider between two of them rather than as the state of one.
		 */
		.links {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			flex-direction: column;
			align-items: stretch;
			gap: 0.15rem;
			padding: 0.5rem;
			background: var(--surface);
			border-bottom: 1px solid var(--line);
			box-shadow: var(--shadow-lift);
			display: none;
		}

		.links.open {
			display: flex;
			animation: drop 0.18s ease;
		}

		.links a {
			height: auto;
			padding: 0.8rem 0.9rem;
			border-radius: var(--radius);
			font-size: 1rem;
			gap: 0.75rem;
		}

		.links a.active {
			background: var(--tint);
		}

		.links a::after {
			left: 0;
			right: auto;
			top: 0.6rem;
			bottom: 0.6rem;
			width: 2px;
			height: auto;
			border-radius: 0 2px 2px 0;
			transform: scaleY(0);
		}

		.links a:hover::after,
		.links a.active::after {
			transform: scaleY(1);
		}
	}
</style>
