<!--
	Fun facts about a shelf.

	This started as a chart of titles finished per month and that was a mistake:
	it grouped by when a row was written, and somebody who joins today and adds
	twenty years of viewing writes all of it today. The chart said "3,000 in
	August" and meant "signed up in August". Nothing in the table knows when a
	film was actually watched, so nothing here pretends to.

	Totals survive that. Nine years of screen time is nine years whether it was
	logged over a decade or in one afternoon — and it is the number people
	actually want to see about themselves. The same is true of the extremes: the
	longest thing you sat through and the oldest thing you have seen are facts
	about the shelf, not about the day you typed it in.

	Genres stay a chart because a ranked comparison is what that question is.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import { types } from '$lib/data/types.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { duration, number } from '$lib/util/format.js';

	/**
	 * @type {{
	 *   highlights: {
	 *     filmMinutes: number, filmCount: number,
	 *     seriesMinutes: number, seriesCount: number, episodes: number, seriesUnknown: number,
	 *     longest: { title: string, slug: string, type: string, minutes: number }|null,
	 *     oldest: { title: string, slug: string, type: string, year: number }|null,
	 *     decade: { decade: number, count: number }|null
	 *   } | null,
	 *   taste: { genres: Array<{ name: string, count: number }> } | null
	 * }}
	 */
	let { highlights, taste } = $props();

	let film = $derived(highlights?.filmMinutes ?? 0);
	let series = $derived(highlights?.seriesMinutes ?? 0);
	let total = $derived(film + series);

	/**
	 * The same number said five ways, which is the whole joke: 84,265 hours is
	 * a figure, and "nine and a half years" is a feeling. Units that would read
	 * below one are dropped rather than shown as "0 years".
	 */
	let ladder = $derived.by(() => {
		const days = total / 1440;

		return [
			{ key: 'count.day', value: Math.round(days) },
			{ key: 'count.week', value: Math.round(days / 7) },
			{ key: 'count.month', value: Math.round(days / 30.44) },
			{ key: 'count.year', value: days / 365.25 }
		]
			.filter((unit) => unit.value >= 1)
			.map((unit) => ({
				key: unit.key,
				// A year is the one worth a decimal — 9.6 and 9 are different facts.
				value: 'count.year' === unit.key && unit.value < 10
					? Number(unit.value.toFixed(1))
					: Math.round(unit.value)
			}));
	});

	let split = $derived([
		{
			key: 'movie',
			minutes: film,
			detail: t('count.title', { count: highlights?.filmCount ?? 0 })
		},
		{
			key: 'series',
			minutes: series,
			detail: t('count.episode', { count: highlights?.episodes ?? 0 })
		}
	]);

	let widest = $derived(Math.max(1, film, series));

	let genres = $derived(taste?.genres ?? []);
	let genreTop = $derived(Math.max(1, ...genres.map((g) => g.count)));

	let facts = $derived.by(() => {
		const out = [];
		const longest = highlights?.longest;
		const oldest = highlights?.oldest;
		const decade = highlights?.decade;

		if (longest?.minutes) {
			out.push({
				icon: 'clock',
				label: t('profile.longestSit'),
				value: duration(longest.minutes),
				note: longest.title,
				href: `/${longest.type}/${longest.slug}`
			});
		}

		if (oldest?.year) {
			out.push({
				icon: 'history',
				label: t('profile.oldestSeen'),
				value: String(oldest.year),
				note: oldest.title,
				href: `/${oldest.type}/${oldest.slug}`
			});
		}

		if (decade) {
			out.push({
				icon: 'calendar',
				label: t('profile.favouriteDecade'),
				// A string, not a number: t() runs numeric params through
				// Intl.NumberFormat, which turned the 2020s into the "2,020s".
				value: t('profile.decadeValue', { decade: String(decade.decade) }),
				note: t('count.title', { count: decade.count }),
				href: null
			});
		}

		return out;
	});
</script>

<div class="summary">
	<section class="panel card">
		<header>
			<h3 class="eyebrow">{t('profile.timeSpent')}</h3>
		</header>

		{#if total}
			<p class="hero">
				<span class="figure display">{number(Math.round(total / 60))}</span>
				<span class="unit">{t('profile.hoursWatching')}</span>
			</p>

			<p class="ladder faint">
				{#each ladder as unit, index (unit.key)}{index ? ' · ' : ''}{t(unit.key, {
						count: unit.value
					})}{/each}
			</p>

			<ul class="split">
				{#each split as row (row.key)}
					<li data-type={row.key}>
						<span class="what">
							<Icon name={row.key} size={14} />
							{types[row.key].plural}
						</span>
						<span class="track">
							<span class="fill" style="width: {(row.minutes / widest) * 100}%"></span>
						</span>
						<span class="amount">{t('count.hour', { count: Math.round(row.minutes / 60) })}</span>
						<span class="detail faint">{row.detail}</span>
					</li>
				{/each}
			</ul>

			{#if highlights?.seriesUnknown}
				<!-- Said plainly rather than hidden: a total nobody can question is
				     worth more than a rounder one nobody can check. -->
				<p class="note faint">
					{t('profile.seriesEstimate', { count: highlights.seriesUnknown })}
				</p>
			{/if}
		{:else}
			<p class="faint empty">{t('profile.noTime')}</p>
		{/if}
	</section>

	<section class="panel card">
		<header>
			<h3 class="eyebrow">{t('profile.topGenres')}</h3>
		</header>

		{#if genres.length}
			<ol class="genres">
				{#each genres as genre, rank (genre.name)}
					<li>
						<span class="name">{genre.name}</span>
						<span class="track">
							<span class="fill" style="width: {(genre.count / genreTop) * 100}%"></span>
						</span>
						<!-- Only the leader is labelled; the rest are read against it. -->
						<span class="tally" class:lead={rank === 0}>{number(genre.count)}</span>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="faint empty">{t('profile.noGenres')}</p>
		{/if}
	</section>
</div>

{#if facts.length}
	<ul class="facts">
		{#each facts as fact (fact.label)}
			<li class="fact card">
				<svelte:element
					this={fact.href ? 'a' : 'div'}
					href={fact.href ?? undefined}
					class="fact-body"
				>
					<span class="eyebrow"><Icon name={fact.icon} size={13} />{fact.label}</span>
					<strong class="display">{fact.value}</strong>
					<span class="note faint">{fact.note}</span>
				</svelte:element>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
		gap: 1rem;
		margin: 1.5rem 0 1rem;
	}

	.panel {
		padding: 1.1rem 1.2rem 1rem;
		background: var(--surface);
	}

	.panel header {
		margin-bottom: 0.9rem;
	}

	h3 {
		margin: 0;
	}

	.empty {
		margin: 0;
		font-size: 0.86rem;
	}

	/* ---- the headline ---------------------------------------------------- */

	.hero {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin: 0;
	}

	.figure {
		font-size: clamp(2.2rem, 5vw, 3rem);
		line-height: 1;
	}

	.unit {
		font-size: 0.9rem;
		color: var(--muted);
	}

	.ladder {
		margin: 0.35rem 0 1.1rem;
		font-size: 0.82rem;
	}

	/* ---- films against series -------------------------------------------- */

	.split {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.split li {
		display: grid;
		grid-template-columns: 6rem 1fr auto;
		align-items: center;
		gap: 0.35rem 0.6rem;
		font-size: 0.8rem;
	}

	.what {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--muted);
	}

	.amount {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	/* Under the bar, in the column the bar occupies. */
	.detail {
		grid-column: 2 / -1;
		font-size: 0.72rem;
	}

	.note {
		margin: 0.9rem 0 0;
		font-size: 0.72rem;
		line-height: 1.5;
	}

	/* ---- shared bar ------------------------------------------------------ */

	.track {
		height: 8px;
		border-radius: 99px;
		background: var(--tint);
	}

	.fill {
		display: block;
		height: 100%;
		border-radius: 99px;
		/* The split takes each type's own colour; genres are one series, so they
		   take the brand and stay one hue. */
		background: var(--accent, var(--brand));
	}

	/* ---- genres ---------------------------------------------------------- */

	.genres {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.genres li {
		display: grid;
		grid-template-columns: 6.5rem 1fr auto;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.8rem;
	}

	.name {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		color: var(--muted);
	}

	.tally {
		min-width: 2.5rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
		/* Values wear ink, never the series colour. */
		color: var(--faint);
	}

	.tally.lead {
		color: var(--ink);
		font-weight: 600;
	}

	/* ---- the three facts ------------------------------------------------- */

	.facts {
		list-style: none;
		margin: 0 0 1.5rem;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: 1rem;
	}

	.fact {
		background: var(--surface);
	}

	.fact-body {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.9rem 1.1rem 1rem;
	}

	.fact-body :global(.eyebrow) {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.fact strong {
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		line-height: 1.1;
		font-weight: 400;
	}

	.fact .note {
		margin: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	a.fact-body:hover strong {
		color: var(--brand);
	}
</style>
