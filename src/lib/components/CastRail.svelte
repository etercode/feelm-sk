<script>
	import { t } from '$lib/i18n/index.svelte.js';

	let { cast = [], title = null } = $props();
</script>

{#if cast.length}
	<section class="cast">
		<h2 class="display">{title ?? t('cast.title')}</h2>
		<div class="scroller track">
			{#each cast as person (person.name + person.character)}
				<figure>
					{#if person.photo}
						<img src={person.photo} alt={person.name} loading="lazy" />
					{:else}
						<span class="blank"></span>
					{/if}
					<figcaption>
						<strong>{person.name}</strong>
						{#if person.character}<span class="faint">{person.character}</span>{/if}
					</figcaption>
				</figure>
			{/each}
		</div>
	</section>
{/if}

<style>
	.cast {
		margin-block: 2.5rem;
	}

	h2 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
	}

	.track {
		display: flex;
		gap: 1rem;
		padding-bottom: 0.6rem;
	}

	figure {
		margin: 0;
		width: 7.5rem;
		flex: none;
		scroll-snap-align: start;
	}

	img,
	.blank {
		width: 100%;
		/* Source portraits are 2:3 — matching it keeps faces uncropped. */
		aspect-ratio: 2 / 3;
		object-fit: cover;
		object-position: center top;
		border-radius: var(--radius);
		background: var(--surface-2);
		box-shadow: 0 0 0 1px var(--line);
		display: block;
		transition: transform 0.25s ease;
	}

	figure:hover img {
		transform: translateY(-4px);
	}

	figcaption {
		display: flex;
		flex-direction: column;
		margin-top: 0.5rem;
		font-size: 0.82rem;
		line-height: 1.35;
	}
</style>
