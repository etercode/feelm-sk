<!-- Shared frame for sign in / sign up: a wall of covers, and the form beside it. -->
<script>
	import { catalog } from '$lib/state/catalog.svelte.js';

	let { title, intro, children } = $props();

	/*
	 * Decoration, so it loads like decoration: whatever the cache already holds,
	 * and it fills in if this visitor came via the home page. Sign-in is one
	 * screen with one job, and fetching the whole front page to put posters
	 * behind the form is not worth a round trip on a phone.
	 */
	let wall = $derived(catalog.items.filter((item) => item.poster).slice(0, 24));
</script>

<div class="auth">
	<div class="wall" aria-hidden="true">
		{#each wall as item (item.id)}
			<img src={item.poster} alt="" loading="lazy" />
		{/each}
		<div class="scrim"></div>
	</div>

	<div class="panel">
		<div class="inner">
			<h1 class="display">{title}</h1>
			<p class="muted">{intro}</p>

			{@render children()}
		</div>
	</div>
</div>

<style>
	/*
	 * One screen, and no more. The wall used to size this row: twenty-four
	 * posters six across is well over a thousand pixels tall, which pushed the
	 * form below the fold and left the page scrolling to reach it. Fixing the
	 * height and clipping the wall puts the form back in the middle of the
	 * first screen, where a sign-in form belongs.
	 *
	 * dvh rather than vh so the mobile browser's collapsing toolbar does not
	 * leave a strip of footer showing.
	 */
	.auth {
		display: grid;
		grid-template-columns: 1fr minmax(22rem, 32rem);
		height: calc(100dvh - var(--bar-height));
		min-height: 33rem;
		overflow: hidden;
	}

	.wall {
		position: relative;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		align-content: start;
		gap: 0.5rem;
		padding: 0.5rem;
		overflow: hidden;
	}

	.wall img {
		width: 100%;
		aspect-ratio: 2 / 3;
		object-fit: cover;
		border-radius: 6px;
		opacity: 0.55;
	}

	.wall .scrim {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(90% 70% at 30% 40%, transparent, var(--page) 85%),
			linear-gradient(to right, rgb(7 8 12 / 0.4), var(--page));
	}

	.panel {
		display: flex;
		align-items: center;
		padding: clamp(1.5rem, 4vw, 3rem);
		border-left: 1px solid var(--line);
		background: var(--page);
		/* If the window is shorter than the form, scroll the form, not the page. */
		overflow-y: auto;
	}

	.inner {
		width: 100%;
	}

	h1 {
		font-size: clamp(2rem, 4vw, 2.9rem);
	}

	p {
		margin: 0.5rem 0 1.75rem;
		max-width: 42ch;
	}

	@media (max-width: 900px) {
		.auth {
			grid-template-columns: 1fr;
			height: auto;
			min-height: calc(100dvh - var(--bar-height));
		}

		.wall {
			display: none;
		}

		.panel {
			border-left: 0;
		}
	}
</style>
