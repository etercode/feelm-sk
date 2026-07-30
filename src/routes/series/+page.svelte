<script>
	import Browse from '$lib/components/Browse.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Series — You Know Me</title></svelte:head>

<Browse
	{data}
	type="series"
	title="Series"
	intro="Seasons, episodes, and the exact one you stopped at. Progress is tracked per episode, not per show."
/>
