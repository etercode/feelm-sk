<!--
	The bar. Transparent while the home hero is on screen, glass once you scroll,
	solid everywhere else so posters never fight with the navigation.
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SearchOverlay from '$lib/components/SearchOverlay.svelte';
	import { types, typeKeys } from '$lib/data/types.js';
	import { session } from '$lib/state/session.svelte.js';
	import { theme } from '$lib/state/theme.svelte.js';

	let searchOpen = $state(false);
	let menuOpen = $state(false);
	let navOpen = $state(false);

	let path = $derived(page.url.pathname);

	const themeIcon = { light: 'sun', dark: 'moon', system: 'monitor' };
	const themeTitle = { light: 'Light', dark: 'Dark', system: 'System' };

	// Close everything on navigation.
	$effect(() => {
		path;
		menuOpen = false;
		navOpen = false;
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

<svelte:window onkeydown={onKeydown} onclick={() => (menuOpen = false)} />

<header class="bar">
	<div class="inner frame">
		<a class="brand" href="/" aria-label="Feelm — home">
			<span class="mark" aria-hidden="true"></span>
			<span class="wordmark"><em>feel</em>m</span>
		</a>

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
			<a href="/feed" class="feed" class:active={path === '/feed'}>
				<Icon name="activity" size={15} />
				Feed
			</a>
		</nav>

		<div class="actions">
			<button type="button" class="icon-btn" aria-label="Search" onclick={() => (searchOpen = true)}>
				<Icon name="search" size={18} />
			</button>

			<button
				type="button"
				class="icon-btn"
				aria-label="Theme: {themeTitle[theme.choice]}"
				title="Theme: {themeTitle[theme.choice]}"
				onclick={() => theme.cycle()}
			>
				<Icon name={themeIcon[theme.choice]} size={17} />
			</button>

			{#if session.user}
				<div class="account">
					<button
						type="button"
						class="avatar-btn"
						aria-label="Your account"
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
								><Icon name="user" size={16} />Your profile</a
							>
							<a href="/feed" role="menuitem"><Icon name="activity" size={16} />Your feed</a>
							<button type="button" role="menuitem" onclick={signOut}>
								<Icon name="logout" size={16} />Sign out
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<a class="btn btn-sm" href="/login">Sign in</a>
			{/if}

			<button
				type="button"
				class="icon-btn burger"
				aria-label="Menu"
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
	.bar {
		position: sticky;
		top: 0;
		z-index: 50;
		background: var(--glass);
		backdrop-filter: blur(14px) saturate(140%);
		border-bottom: 1px solid var(--line);
		transition:
			background 0.3s ease,
			border-color 0.3s ease;
	}

	.inner {
		display: flex;
		align-items: center;
		gap: clamp(0.75rem, 3vw, 2.25rem);
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
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 50%;
		border: 2px solid var(--brass);
		position: relative;
	}

	.mark::after {
		content: '';
		position: absolute;
		inset: 3px;
		border-radius: 50%;
		background: var(--brass);
		transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.brand:hover .mark::after {
		transform: scale(0.45);
	}

	.wordmark {
		font-family: var(--font-display);
		font-size: 1.3rem;
		letter-spacing: 0.01em;
	}

	.wordmark em {
		font-style: italic;
		color: var(--brass);
	}

	/* Navigation -------------------------------------------------------- */

	.links {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
	}

	.links a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.7rem;
		border-radius: 99px;
		color: var(--muted);
		font-size: 0.9rem;
		font-weight: 500;
		transition:
			color 0.18s ease,
			background 0.18s ease;
	}

	.links a:hover {
		color: var(--accent, var(--ink));
		background: var(--tint);
	}

	.links a.active {
		color: var(--accent, var(--brass));
		background: var(--accent-soft);
	}

	.links .feed {
		--accent: var(--brass);
		--accent-soft: var(--brass-soft);
	}

	/* Actions ----------------------------------------------------------- */

	.actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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

	.burger {
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

	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
	}

	@media (max-width: 860px) {
		.burger {
			display: grid;
		}

		.links {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			flex-direction: column;
			align-items: stretch;
			gap: 0.1rem;
			padding: 0.6rem;
			background: var(--surface);
			border-bottom: 1px solid var(--line);
			display: none;
		}

		.links.open {
			display: flex;
		}
	}
</style>
