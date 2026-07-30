<script>
	import Browse from '$lib/components/Browse.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Books — Feelm</title></svelte:head>

<Browse
	{data}
	type="book"
	title="Books"
	intro="Pages, publishers and the cycle a volume belongs to. Progress is a page number, because that is how reading works."
/>
