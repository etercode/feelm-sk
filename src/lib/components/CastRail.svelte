<script>
	import { t } from '$lib/i18n/index.svelte.js';

	let { cast = [], title = null } = $props();
</script>

{#if cast.length}
	<section class="cast">
		<h2 class="display">{title ?? t('cast.title')}</h2>
		<div class="scroller track">
			{#each cast as person (person.name + person.character)}
				<!--
					A link now, not a caption. "What else are they in" is the
					obvious next question from a cast list and it had no answer
					here. Falls back to a plain figure when the payload carries
					no slug, so an older cached response still renders.
				-->
				<svelte:element
					this={person.slug ? 'a' : 'figure'}
					href={person.slug ? `/p/${person.slug}` : undefined}
					class="face"
					class:linked={person.slug}
				>
					{#if person.photo}
						<img src={person.photo} alt={person.name} loading="lazy" />
					{:else}
						<span class="blank"></span>
					{/if}
					<span class="caption">
						<strong>{person.name}</strong>
						{#if person.character}<span class="faint">{person.character}</span>{/if}
					</span>
				</svelte:element>
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

	.face {
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

	.face:hover img {
		transform: translateY(-4px);
	}

	.caption {
		display: flex;
		flex-direction: column;
		margin-top: 0.5rem;
		font-size: 0.82rem;
		line-height: 1.35;
	}

	.linked strong {
		transition: color 0.18s ease;
	}

	.linked:hover strong {
		color: var(--brand);
	}
</style>
