<script>
	import '../app.css';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import NavProgress from '$lib/components/NavProgress.svelte';
	import { catalog } from '$lib/state/catalog.svelte.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { theme } from '$lib/state/theme.svelte.js';

	let { children } = $props();

	// After first paint: load the live catalog, restore the session if tokens exist,
	// and apply the saved theme. Shelf / feed / follows come from the API once signed in.
	$effect(() => {
		void catalog.hydrate();
		void library.hydrate();
		void session.hydrate();
		theme.hydrate();
	});
</script>

<NavProgress />

<Header />

<main>
	{@render children()}
</main>

<Footer />

<style>
	main {
		min-height: 60vh;
	}
</style>
