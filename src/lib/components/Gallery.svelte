<!-- Screenshots, with a plain lightbox: click to enlarge, arrows or Esc to leave. -->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import { t } from '$lib/i18n/index.svelte.js';

	let { shots = [], title = null } = $props();

	let open = $state(null);

	function step(direction) {
		if (open === null) return;
		open = (open + direction + shots.length) % shots.length;
	}

	function onkeydown(event) {
		if (open === null) return;
		if (event.key === 'Escape') open = null;
		if (event.key === 'ArrowRight') step(1);
		if (event.key === 'ArrowLeft') step(-1);
	}
</script>

<svelte:window {onkeydown} />

{#if shots.length}
	<section class="gallery">
		<h2 class="display">{title ?? t('gallery.screenshots')}</h2>

		<div class="strip scroller">
			{#each shots as shot, position (shot)}
				<button type="button" onclick={() => (open = position)} aria-label={t('gallery.open', { n: position + 1 })}>
					<img src={shot} alt="" loading="lazy" />
				</button>
			{/each}
		</div>
	</section>

	{#if open !== null}
		<div
			class="lightbox"
			role="presentation"
			onclick={(event) => {
				if (event.target === event.currentTarget) open = null;
			}}
		>
			<img src={shots[open]} alt="" />
			<button type="button" class="nav prev" aria-label={t('common.previous')} onclick={() => step(-1)}>
				<Icon name="left" size={20} />
			</button>
			<button type="button" class="nav next" aria-label={t('common.next')} onclick={() => step(1)}>
				<Icon name="right" size={20} />
			</button>
			<button type="button" class="nav close" aria-label={t('common.close')} onclick={() => (open = null)}>
				<Icon name="close" size={18} />
			</button>
			<span class="counter">{open + 1} / {shots.length}</span>
		</div>
	{/if}
{/if}

<style>
	.gallery {
		margin-block: 2.5rem;
	}

	h2 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
	}

	.strip {
		display: flex;
		gap: 0.75rem;
		padding-bottom: 0.6rem;
	}

	.strip button {
		flex: none;
		width: clamp(15rem, 30vw, 22rem);
		padding: 0;
		border: 0;
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--surface-2);
		cursor: zoom-in;
		box-shadow: 0 0 0 1px var(--line);
		scroll-snap-align: start;
	}

	.strip img {
		width: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		transition: transform 0.35s ease;
	}

	.strip button:hover img {
		transform: scale(1.04);
	}

	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: grid;
		place-items: center;
		padding: clamp(1rem, 5vw, 4rem);
		background: rgb(4 5 8 / 0.92);
		backdrop-filter: blur(6px);
		animation: fade 0.16s ease;
	}

	.lightbox > img {
		max-width: 100%;
		max-height: 100%;
		border-radius: var(--radius);
		box-shadow: var(--shadow-pop);
	}

	.nav {
		position: absolute;
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 1px solid var(--line);
		border-radius: 50%;
		background: var(--veil-strong);
		color: var(--ink);
		cursor: pointer;
	}

	.nav:hover {
		background: var(--tint-strong);
	}

	.prev {
		left: 1rem;
	}

	.next {
		right: 1rem;
	}

	.close {
		top: 1rem;
		right: 1rem;
	}

	.counter {
		position: absolute;
		bottom: 1.2rem;
		font-size: 0.82rem;
		color: var(--muted);
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}
</style>
