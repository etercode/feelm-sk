<!-- Shared frame for sign in / sign up: a wall of covers, and the form beside it. -->
<script>
	import { catalog } from '$lib/state/catalog.svelte.js';

	let { title, intro, children } = $props();

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
	.auth {
		display: grid;
		grid-template-columns: 1fr minmax(22rem, 32rem);
		min-height: calc(100vh - var(--bar-height));
	}

	.wall {
		position: relative;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
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
		}

		.wall {
			display: none;
		}

		.panel {
			border-left: 0;
		}
	}
</style>
