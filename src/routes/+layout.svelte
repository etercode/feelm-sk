<script>
	import '../app.css';
	import { page } from '$app/state';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import NavProgress from '$lib/components/NavProgress.svelte';
	import { catalog } from '$lib/state/catalog.svelte.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { theme } from '$lib/state/theme.svelte.js';

	let { children } = $props();

	/*
	 * Sign in and sign up are sized to exactly one screen. A footer under them
	 * is the whole reason those pages scrolled, and there is nothing on it
	 * somebody signing in wants.
	 */
	const BARE = ['/login', '/register'];
	/*
	 * The admin has its own sidebar and its own sense of a page bottom, so it
	 * drops the footer too — but it keeps the bar at the top, which is why it
	 * is a prefix test here rather than another entry in BARE.
	 */
	let bare = $derived(BARE.includes(page.route.id ?? '') || page.url.pathname.startsWith('/admin'));

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

<main class:bare>
	{@render children()}
</main>

{#if !bare}
	<Footer />
{/if}

<style>
	main {
		min-height: 60vh;
	}

	main.bare {
		min-height: 0;
	}
</style>
