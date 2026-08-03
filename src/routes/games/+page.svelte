<script>
	import Browse from '$lib/components/Browse.svelte';
	import { t } from '$lib/i18n/index.svelte.js';

	let { data } = $props();
</script>

<svelte:head><title>{t('browse.games.title')} — Feelm</title></svelte:head>

<Browse {data} type="game" />
