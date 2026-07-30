<script>
	import Browse from '$lib/components/Browse.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Movies — Feelm</title></svelte:head>

<Browse
	{data}
	type="movie"
	title="Films"
	intro="Everything with a running time and an ending. Trilogies stay together — a part knows which part it is."
/>
