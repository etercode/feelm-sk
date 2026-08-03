<!--
	A person, and everything the catalog has them on.

	The cast list on a detail page used to be a dead end — faces and names with
	nowhere to go, when "what else are they in" is the obvious next thing to
	ask. This is the answer, grouped by what they actually did, because being
	the lead and having written it are different facts about the same title.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import { mediaUrl } from '$lib/config.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { initials } from '$lib/util/format.js';

	let { data } = $props();

	let person = $derived(data.person);
	let credits = $derived(data.credits ?? []);

	/*
	 * Characters live on the credit rather than the work, so they cannot ride
	 * along inside PosterCard — it is given a work and knows nothing about who
	 * is asking. The name goes underneath instead, which is also where it
	 * belongs on a filmography: the title first, the part second.
	 */
	let photo = $derived(mediaUrl(person?.photo));
</script>

<svelte:head>
	<title>{person?.name ?? t('person.unknown')} — Feelm</title>
	<meta name="description" content={t('person.metaDescription', { name: person?.name ?? '' })} />
</svelte:head>

<div class="frame page">
	<header class="who">
		<span class="portrait" class:has-photo={photo}>
			{#if photo}
				<img src={photo} alt="" />
			{:else}
				{initials(person?.name ?? '?')}
			{/if}
		</span>

		<div class="identity">
			<span class="eyebrow">{t('person.eyebrow')}</span>
			<h1 class="display">{person?.name}</h1>
			<p class="muted">{t('person.credited', { count: data.total ?? 0 })}</p>
		</div>
	</header>

	{#each credits as group (group.role)}
		<section class="group">
			<header class="group-head">
				<h2 class="display">{t(`role.${group.role}`)}</h2>
				<span class="faint">{group.items.length}</span>
			</header>

			<div class="grid-posters">
				{#each group.items as item (item.id + ':' + (item.character ?? ''))}
					<div class="credit">
						<PosterCard {item} />
						{#if item.character}
							<span class="character faint">{item.character}</span>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{:else}
		<p class="muted empty">{t('person.nothing')}</p>
	{/each}

	<a class="btn back" href="/">
		<Icon name="left" size={14} />{t('common.backHome')}
	</a>
</div>

<style>
	.page {
		padding-top: clamp(1.5rem, 4vw, 3rem);
		padding-bottom: 4rem;
	}

	.who {
		display: flex;
		align-items: center;
		gap: clamp(1rem, 3vw, 2rem);
		padding-bottom: clamp(1.5rem, 4vw, 2.5rem);
	}

	.portrait {
		display: grid;
		place-items: center;
		flex: none;
		width: clamp(5rem, 12vw, 8rem);
		aspect-ratio: 1;
		border-radius: 50%;
		overflow: hidden;
		background: var(--tint-strong);
		color: var(--muted);
		font-size: clamp(1.4rem, 4vw, 2.2rem);
		font-weight: 600;
		box-shadow: 0 0 0 1px var(--line);
	}

	.portrait img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	h1 {
		font-size: clamp(1.8rem, 5vw, 3rem);
		margin: 0.2rem 0 0.35rem;
	}

	.identity p {
		margin: 0;
		font-size: 0.9rem;
	}

	.group {
		margin-bottom: clamp(1.8rem, 4vw, 3rem);
	}

	.group-head {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		margin-bottom: 0.9rem;
	}

	.group-head h2 {
		font-size: clamp(1.2rem, 3vw, 1.6rem);
	}

	/*
	 * The character sits under the card rather than on it. PosterCard is given
	 * a work and knows nothing about who is asking, and a filmography reads
	 * title first, part second anyway.
	 */
	.credit {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.character {
		font-size: 0.78rem;
		line-height: 1.3;
		padding-inline: 0.15rem;
	}

	.empty {
		padding: 3rem 0;
	}

	.back {
		margin-top: 1rem;
	}
</style>
