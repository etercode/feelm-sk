<!--
	The admin shell: the guard, and the sidebar everything else hangs off.

	It nests inside the site layout rather than replacing it, so the bar at the
	top keeps working — theme, search and the account menu are all wanted here
	too, and rebuilding them would mean maintaining two of each. The footer is
	the part that goes; the root layout drops it for /admin.

	The guard is the same client-side shape as /settings, because it has to be:
	tokens live in localStorage and the server cannot see who is asking. It
	decides what to render, nothing more — every /api/admin call is checked
	again at the other end.
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { session } from '$lib/state/session.svelte.js';

	let { children } = $props();

	let ready = $state(false);

	$effect(() => {
		session.hydrate().then(() => {
			ready = true;
			if (!session.user) return goto('/login');
			if (!session.isModerator) return goto('/');
		});
	});

	const links = [
		{ href: '/admin', label: 'Overview', icon: 'chart', exact: true },
		{ href: '/admin/users', label: 'Users', icon: 'users' },
		{ href: '/admin/reviews', label: 'Reviews', icon: 'quote' },
		{ href: '/admin/feedback', label: 'Feedback', icon: 'megaphone' },
		{ href: '/admin/works', label: 'Works', icon: 'film' },
		{ href: '/admin/people', label: 'People', icon: 'user' },
		{ href: '/admin/settings', label: 'Settings', icon: 'gear' }
	];

	let path = $derived(page.url.pathname);

	/** @param {{ href: string, exact?: boolean }} link */
	function active(link) {
		return link.exact ? path === link.href : path.startsWith(link.href);
	}
</script>

<div class="shell">
	{#if !ready || !session.isModerator}
		<p class="gate muted"><Spinner size={16} /> Checking your access…</p>
	{:else}
		<aside>
			<div class="badge">
				<Icon name="shield" size={15} />
				<span>Admin</span>
				{#if session.isAdmin}<span class="chip">Administrator</span>{:else}<span class="chip"
						>Moderator</span
					>{/if}
			</div>

			<nav>
				{#each links as link (link.href)}
					<a href={link.href} class:active={active(link)}>
						<Icon name={link.icon} size={16} />
						{link.label}
					</a>
				{/each}
			</nav>

			<a class="back" href="/">
				<Icon name="left" size={14} />Back to the site
			</a>
		</aside>

		<main>{@render children()}</main>
	{/if}
</div>

<style>
	.shell {
		display: grid;
		grid-template-columns: 14rem minmax(0, 1fr);
		gap: clamp(1rem, 3vw, 2rem);
		width: 100%;
		max-width: var(--frame);
		margin-inline: auto;
		padding: clamp(1.25rem, 3vw, 2rem) var(--pad) 4rem;
		min-height: calc(100dvh - var(--bar-height));
	}

	.gate {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 6rem 0;
	}

	aside {
		position: sticky;
		top: calc(var(--bar-height) + 1.25rem);
		align-self: start;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.badge {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		padding-bottom: 0.9rem;
		border-bottom: 1px solid var(--line);
		color: var(--brand);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.badge .chip {
		border-color: var(--brand-soft);
		background: var(--brand-soft);
		color: var(--brand);
		font-size: 0.68rem;
		letter-spacing: 0.06em;
	}

	nav {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	nav a {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 0.75rem;
		border-radius: var(--radius);
		color: var(--muted);
		font-size: 0.92rem;
		font-weight: 500;
		transition:
			color 0.18s ease,
			background 0.18s ease;
	}

	nav a:hover {
		background: var(--tint);
		color: var(--ink);
	}

	nav a.active {
		background: var(--brand-soft);
		color: var(--brand);
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.55rem 0.75rem;
		color: var(--faint);
		font-size: 0.85rem;
	}

	.back:hover {
		color: var(--ink);
	}

	main {
		min-width: 0;
	}

	/* The sidebar becomes a scrolling strip of tabs above the content. */
	@media (max-width: 900px) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
			gap: 1.25rem;
		}

		aside {
			position: static;
			gap: 0.6rem;
		}

		nav {
			flex-direction: row;
			gap: 0.35rem;
			overflow-x: auto;
			scrollbar-width: none;
			padding-bottom: 0.2rem;
		}

		nav::-webkit-scrollbar {
			display: none;
		}

		nav a {
			flex: none;
			border: 1px solid var(--line);
			border-radius: 99px;
			font-size: 0.86rem;
			white-space: nowrap;
		}

		.back {
			display: none;
		}
	}
</style>
