<script>
	import { page } from '$app/state';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import { t } from '$lib/i18n/index.svelte.js';
	import { catalog } from '$lib/state/catalog.svelte.js';

	let suggestions = $derived([
		...catalog.topOfType('movie', 2),
		...catalog.topOfType('game', 2),
		...catalog.topOfType('series', 1),
		...catalog.topOfType('book', 1)
	]);

	// Nothing else loads the catalog now, and this page offers a way onwards
	// out of a dead end.
	$effect(() => {
		void catalog.hydrate();
	});
</script>

<svelte:head><title>{page.status} — Feelm</title></svelte:head>

<div class="frame lost">
	<span class="code display">{page.status}</span>
	<h1 class="display">{page.error?.message ?? t('error.sideways')}</h1>
	<p class="muted">{t('error.instead')}</p>

	<div class="grid-posters picks">
		{#each suggestions as item (item.id)}
			<PosterCard {item} />
		{/each}
	</div>

	<a class="btn" href="/">{t('common.backHome')}</a>
</div>

<style>
	.lost {
		padding-block: clamp(3rem, 10vw, 6rem);
		text-align: center;
	}

	.code {
		font-size: clamp(4rem, 14vw, 9rem);
		color: var(--brand);
		opacity: 0.25;
		line-height: 1;
	}

	h1 {
		font-size: clamp(1.8rem, 4vw, 2.8rem);
		margin-top: 0.5rem;
	}

	.picks {
		margin: 2.5rem auto;
		max-width: 56rem;
		text-align: left;
	}
</style>
