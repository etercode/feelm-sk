<!--
	A person, and everything the catalog has them on.

	The cast list on a detail page used to be a dead end — faces and names with
	nowhere to go, when "what else are they in" is the obvious next thing to
	ask. This is the answer, grouped by what they actually did, because being
	the lead and having written it are different facts about the same title.
-->
<script>
	import { invalidateAll } from '$app/navigation';
	import { SvelteSet } from 'svelte/reactivity';
	import Icon from '$lib/components/Icon.svelte';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import * as api from '$lib/api/client.js';
	import { mediaUrl } from '$lib/config.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { initials } from '$lib/util/format.js';

	let { data } = $props();

	let person = $derived(data.person);
	let credits = $derived(data.credits ?? []);

	/* ---- moderating a filmography ------------------------------------
	 *
	 * A whole career is often the unit of the problem — an actor who worked
	 * exclusively in films whose posters we cannot show — and dealing with that
	 * one title at a time through the admin panel is the reason it does not get
	 * done. So the tools are here, on the page where you can see what you are
	 * judging.
	 *
	 * Everything below is gated on the session, which is browser-only; this
	 * page server-renders for everyone else and nothing here reaches them.
	 */
	let selecting = $state(false);
	let chosen = $state(new SvelteSet());
	let working = $state(false);
	let note = $state(/** @type {string | null} */ (null));

	/** Every work on the page, deduplicated — one title can hold two credits. */
	let allIds = $derived([...new Set(credits.flatMap((g) => g.items.map((i) => i.id)))]);

	/** @param {number} id */
	function toggle(id) {
		if (chosen.has(id)) chosen.delete(id);
		else chosen.add(id);
	}

	function stop() {
		selecting = false;
		chosen.clear();
		note = null;
	}

	/** @param {'adult' | 'delete'} action */
	async function apply(action) {
		if (!chosen.size || working) return;
		working = true;
		try {
			const result = await api.adminBulkWorks([...chosen], action);
			note = t('moderate.done', { n: result?.changed ?? 0 });
			chosen.clear();
			// The titles just hidden have to leave the page, and the page is
			// server-rendered from a load function — so re-run it.
			await invalidateAll();
		} catch {
			note = t('moderate.failed');
		} finally {
			working = false;
		}
	}

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

			{#if session.isModerator && !selecting}
				<button type="button" class="btn btn-sm" onclick={() => (selecting = true)}>
					<Icon name="shield" size={13} />{t('moderate.start')}
				</button>
			{/if}
		</div>
	</header>

	<!--
		Sticky, because the selection is made by scrolling a filmography and the
		buttons have to still be there at the bottom of it.
	-->
	{#if selecting}
		<div class="bar">
			<span class="count">{t('moderate.selected', { n: chosen.size })}</span>

			<button type="button" class="btn btn-sm btn-ghost" onclick={() => allIds.forEach((id) => chosen.add(id))}>
				{t('moderate.all')}
			</button>
			<button type="button" class="btn btn-sm btn-ghost" onclick={() => chosen.clear()} disabled={!chosen.size}>
				{t('moderate.none')}
			</button>

			<span class="spacer"></span>

			{#if note}<span class="faint note">{note}</span>{/if}

			<button type="button" class="btn btn-sm" disabled={!chosen.size || working} onclick={() => apply('adult')}>
				{#if working}<Spinner size={12} />{/if}
				{t('moderate.markAdult')}
			</button>
			<button type="button" class="btn btn-sm danger" disabled={!chosen.size || working} onclick={() => apply('delete')}>
				{t('moderate.delete')}
			</button>
			<button type="button" class="btn btn-sm btn-ghost" onclick={stop}>{t('common.cancel')}</button>
		</div>
	{/if}

	{#each credits as group (group.role)}
		<section class="group">
			<header class="group-head">
				<h2 class="display">{t(`role.${group.role}`)}</h2>
				<span class="faint">{group.items.length}</span>
			</header>

			<div class="grid-posters">
				{#each group.items as item (item.id + ':' + (item.character ?? ''))}
					<div class="credit" class:picked={selecting && chosen.has(item.id)}>
						<PosterCard {item} />
						{#if item.character}
							<span class="character faint">{item.character}</span>
						{/if}

						<!--
							Laid over the card rather than built into PosterCard: the
							card is a link, and a checkbox inside a link is a checkbox
							you cannot reliably tick. This covers it entirely while
							selecting, so a click picks the title instead of opening
							it, and does not exist at all otherwise.
						-->
						{#if selecting}
							<button
								type="button"
								class="pick"
								aria-pressed={chosen.has(item.id)}
								aria-label={item.title}
								onclick={() => toggle(item.id)}
							>
								<span class="box">
									{#if chosen.has(item.id)}<Icon name="check" size={14} stroke={3} />{/if}
								</span>
							</button>
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

	/* ---- moderation ------------------------------------------------- */

	.bar {
		position: sticky;
		/* Under the site header, which is what --bar-height measures. */
		top: calc(var(--bar-height) + 0.4rem);
		z-index: 30;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
		padding: 0.55rem 0.75rem;
		border: 1px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow-card);
	}

	.count {
		font-size: 0.85rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.spacer {
		flex: 1 1 auto;
	}

	.note {
		font-size: 0.8rem;
	}

	.danger {
		background: var(--danger);
		border-color: var(--danger);
		color: #fff;
	}

	.credit {
		position: relative;
	}

	.pick {
		position: absolute;
		inset: 0;
		display: block;
		border: none;
		border-radius: var(--radius);
		background: rgb(6 8 15 / 0.35);
		cursor: pointer;
	}

	.picked .pick {
		background: color-mix(in srgb, var(--brand) 30%, rgb(6 8 15 / 0.3));
		box-shadow: inset 0 0 0 3px var(--brand);
	}

	.box {
		position: absolute;
		top: 0.45rem;
		left: 0.45rem;
		display: grid;
		place-items: center;
		width: 1.4rem;
		height: 1.4rem;
		border: 2px solid #fff;
		border-radius: 5px;
		background: rgb(6 8 15 / 0.5);
		color: #fff;
	}

	.picked .box {
		background: var(--brand);
		border-color: var(--brand);
		color: var(--on-accent);
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
