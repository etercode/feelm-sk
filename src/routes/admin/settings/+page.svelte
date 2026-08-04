<!--
	The index of everything configurable.

	One card per area, and the list is the only thing that has to change to add
	another — a new area is an entry in `AREAS` plus its own page under
	/admin/settings/<slug>. Deliberately not a page with every setting on it:
	the second area added would make that a scroll, and the third would make it
	a search.

	A card can carry a live badge. Notifications does, because "is this actually
	connected" is the question somebody opens this page to answer, and making
	them click through to find out is a wasted step. `status` is optional so an
	area that has nothing useful to say does not have to invent something.
-->
<script>
	import * as api from '$lib/api/client.js';
	import Icon from '$lib/components/Icon.svelte';
	import { session } from '$lib/state/session.svelte.js';

	const AREAS = [
		{
			href: '/admin/settings/notifications',
			icon: 'mail',
			title: 'Notifications',
			blurb: 'Where backups, the nightly run, deploys and server errors report to.',
			live: 'telegram'
		}
	];

	/** @type {{ ok: boolean, label: string } | null} */
	let telegram = $state(null);

	$effect(() => {
		if (!AREAS.some((area) => 'telegram' === area.live)) return;

		session.hydrate().then(() => {
			api
				.adminTelegram()
				.then((data) => {
					telegram = data.configured
						? { ok: data.enabled, label: data.enabled ? 'Connected' : 'Paused' }
						: { ok: false, label: 'Not set up' };
				})
				// A badge is a nicety. Losing it should not put an error on a page
				// whose job is to link elsewhere.
				.catch(() => (telegram = null));
		});
	});
</script>

<svelte:head><title>Settings — Admin — Feelm</title></svelte:head>

<header class="masthead">
	<span class="eyebrow">Admin</span>
	<h1 class="display">Settings</h1>
	<p class="muted">Things an administrator changes without a deploy.</p>
</header>

<ul class="areas">
	{#each AREAS as area (area.href)}
		{@const badge = 'telegram' === area.live ? telegram : null}
		<li>
			<a class="area card" href={area.href}>
				<span class="glyph"><Icon name={area.icon} size={18} /></span>

				<span class="text">
					<span class="title">
						{area.title}
						{#if badge}
							<span class="badge" class:ok={badge.ok}>{badge.label}</span>
						{/if}
					</span>
					<span class="blurb muted">{area.blurb}</span>
				</span>

				<Icon name="right" size={16} />
			</a>
		</li>
	{/each}
</ul>

<style>
	.masthead {
		margin-bottom: 1.5rem;
	}

	.masthead h1 {
		margin: 0.15rem 0 0;
		font-size: clamp(1.7rem, 3vw, 2.2rem);
	}

	.masthead p {
		margin: 0.3rem 0 0;
		font-size: 0.9rem;
	}

	.areas {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		/* One column until there is a reason for two — a lone card stretched
		   across a wide screen looks like a mistake. */
		grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
		gap: 0.75rem;
		max-width: 46rem;
	}

	.area {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 1rem 1.1rem;
		background: var(--surface);
		color: var(--ink);
		transition:
			border-color 0.18s ease,
			transform 0.18s ease;
	}

	.area:hover {
		border-color: var(--brand);
		transform: translateY(-2px);
	}

	.glyph {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: var(--radius);
		background: var(--brand-soft);
		color: var(--brand);
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
	}

	.title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.blurb {
		font-size: 0.84rem;
		line-height: 1.45;
	}

	.badge {
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
		background: var(--tint);
		color: var(--muted);
		font-size: 0.7rem;
		font-weight: 600;
	}

	.badge.ok {
		background: color-mix(in srgb, var(--ok) 16%, transparent);
		color: var(--ok);
	}

	@media (prefers-reduced-motion: reduce) {
		.area {
			transition: none;
		}
	}
</style>
