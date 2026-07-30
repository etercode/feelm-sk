<script>
	import Browse from '$lib/components/Browse.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Games — Feelm</title></svelte:head>

<Browse
	{data}
	type="game"
	title="Games"
	intro="Filed by perspective, mode and platform — first person, third person, isometric, and whatever Half-Life: Alyx is."
/>
