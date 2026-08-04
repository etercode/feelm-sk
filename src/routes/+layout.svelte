<script>
	import '../app.css';
	import { page } from '$app/state';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import HoverPreview from '$lib/components/HoverPreview.svelte';
	import NavProgress from '$lib/components/NavProgress.svelte';
	import { i18n } from '$lib/i18n/index.svelte.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { theme } from '$lib/state/theme.svelte.js';

	let { children, data } = $props();

	/*
	 * Before anything renders, on the server and on the client alike.
	 *
	 * Not in an effect: effects run after the first paint, which would mean the
	 * server rendered English and the browser corrected it — the flash the
	 * cookie exists to prevent. This is a plain synchronous call in the script
	 * body, which is also what makes the module-level singleton safe under SSR;
	 * see the note at the top of $lib/i18n/index.svelte.js.
	 */
	// svelte-ignore state_referenced_locally
	i18n.use(data.locale, data.timezone);

	// And again on navigation, in case a language change arrived with new data.
	$effect(() => {
		i18n.use(data.locale, data.timezone);
	});

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

	/*
	 * After first paint: restore the session if tokens exist and apply the saved
	 * theme. Shelf / feed / follows come from the API once signed in.
	 *
	 * The catalog is deliberately not hydrated here. It is a cache of the home
	 * page — four rails and the release queue, five requests and something like
	 * 120 KB — and loading it from the root layout meant every visit to /movies,
	 * /search, /crawler or /settings paid for rails it never drew. The pages
	 * that read it ask for it themselves.
	 */
	$effect(() => {
		void library.hydrate();
		theme.hydrate();

		/*
		 * The account's language wins over the cookie once it is known — the
		 * point of storing it on the account is that it follows you to a
		 * borrowed laptop. Applying it through `choose` also rewrites the
		 * cookie, so the next request server-renders in the right language
		 * instead of correcting itself again.
		 */
		i18n.seedTimezone();
		void session.hydrate().then(() => {
			if (session.user?.locale) i18n.choose(session.user.locale, session.user.timezone);
		});
	});
</script>

<NavProgress />

<!--
	Once, at the root. A rail clips anything positioned inside it, and the
	poster being hovered is usually the one at its edge — see the component.
-->
<HoverPreview />

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
