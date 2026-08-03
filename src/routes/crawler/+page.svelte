<!--
	Crawl progress.

	The crawl runs detached on the server for hours, so this is the way to check
	on it from a phone. The summary refreshes itself; the list of titles does not,
	because replacing what you are reading every few seconds is hostile.
-->
<script>
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { API_URL } from '$lib/config.js';
	import Icon from '$lib/components/Icon.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte.js';
	import { number as formatNumber } from '$lib/util/format.js';

	let { data } = $props();

	/** Seconds between summary refreshes. */
	const REFRESH = 10;

	// Whatever the last poll returned, or the server's render until one has.
	// Held separately so a navigation's fresh data takes over on its own.
	let polled = $state(null);
	/*
	 * A poll answers for whichever type it was fired for, so it has to be
	 * dropped when the page switches — otherwise the movie numbers linger over
	 * the series page for up to ten seconds and look like real data.
	 */
	let status = $derived(polled?.type === data.type ? polled : data.status);
	let recent = $derived(data.recent);
	let filtered = $derived(Object.entries(status?.filtered ?? {}));
	/*
	 * Progress is counted from titles actually in the catalog, not from the
	 * queue's crawled_at column: the crawler only stamps that when a whole run
	 * finishes, so across a run of three quarters of a million it never moves.
	 *
	 * max() of the two so this stays right either way — if the API is later
	 * changed to stamp the queue as it goes, whichever is further ahead wins.
	 */
	let crawled = $derived(status ? Math.max(status.inCatalog ?? 0, status.crawled ?? 0) : 0);
	let percent = $derived(status?.total ? Math.round((crawled / status.total) * 10000) / 100 : 0);
	let remaining = $derived(status ? Math.max(status.total - crawled, 0) : 0);
	let etaHours = $derived(
		status?.perMinute > 0 ? Math.round((remaining / status.perMinute / 60) * 10) / 10 : null
	);

	let pageNumber = $derived(Number(page.url.searchParams.get('page') ?? 1));
	let refreshing = $derived(navigating.to?.route.id === page.route.id);

	$effect(() => {
		const type = data.type;
		const timer = setInterval(async () => {
			try {
				const response = await fetch(`${API_URL}/api/crawl/status?type=${type}`);
				if (response.ok) polled = await response.json();
			} catch {
				// A refresh that fails changes nothing on screen; the next one
				// will either work or the numbers will visibly stop moving.
			}
		}, REFRESH * 1000);

		return () => clearInterval(timer);
	});

	function toPage(n) {
		const next = new URLSearchParams(page.url.searchParams);
		next.set('page', String(n));
		goto(`/crawler?${next}`, { noScroll: true });
	}

	function show(type) {
		// Page one: page nine of the movies means nothing in the series list.
		goto(type === 'movie' ? '/crawler' : `/crawler?type=${type}`, { noScroll: true });
	}

	/** 'no_poster' reads as a column name; 'no poster' reads as a reason. */
	function reason(key) {
		return key.replaceAll('_', ' ');
	}

	function number(value) {
		return typeof value === 'number' ? formatNumber(value) : '—';
	}

	/** Clock time the crawl should end — easier to read than "33.2h" on a phone. */
	function finish() {
		if (etaHours === null) return '—';
		const at = new Date(Date.now() + etaHours * 3600 * 1000);
		// The viewer's own zone and language, not the browser's guess at either —
		// this is a clock time somebody compares against the one on their wall.
		const zone = { timeZone: i18n.timezone };
		const day =
			at.toDateString() === new Date().toDateString()
				? ''
				: `${new Intl.DateTimeFormat(i18n.tag, { ...zone, weekday: 'short' }).format(at)} `;

		return (
			day +
			new Intl.DateTimeFormat(i18n.tag, { ...zone, hour: '2-digit', minute: '2-digit' }).format(at)
		);
	}

	function ago(iso) {
		if (!iso) return t('crawler.never');
		const seconds = Math.max(0, Math.round((Date.now() - new Date(iso)) / 1000));
		if (seconds < 60) return t('crawler.secondsAgo', { n: seconds });
		if (seconds < 3600) return t('crawler.minutesAgo', { n: Math.round(seconds / 60) });
		if (seconds < 86400) return t('crawler.hoursAgo', { n: Math.round(seconds / 3600) });
		return t('crawler.daysAgo', { n: Math.round(seconds / 86400) });
	}
</script>

<svelte:head><title>{t('crawler.title')} — Feelm</title></svelte:head>

<div class="frame page">
	<header class="masthead">
		<div>
			<span class="eyebrow"><Icon name={data.type} size={14} />{t('crawler.catalog')}</span>
			<h1 class="display">{t('crawler.title')}</h1>
			<div class="types">
				<button type="button" class="btn btn-sm" class:btn-primary={data.type === 'movie'} onclick={() => show('movie')}>
					{t('type.movie.plural')}
				</button>
				<button type="button" class="btn btn-sm" class:btn-primary={data.type === 'series'} onclick={() => show('series')}>
					{t('type.series.plural')}
				</button>
			</div>
		</div>
		{#if status}
			<span class="state" class:on={status.running}>
				{#if status.running}<Spinner size={14} />{/if}
				{status.running ? t('crawler.running') : t('crawler.idle')}
			</span>
		{/if}
	</header>

	{#if data.unreachable || !status}
		<p class="notice">{t('common.apiUnreachable')}</p>
	{:else}
		<div class="progress" role="img" aria-label={t('crawler.percentCrawled', { percent })}>
			<div class="fill" style="width: {Math.max(percent, 0.3)}%"></div>
		</div>
		<p class="pct">
			<strong>{percent}%</strong>
			<span class="faint">{t('crawler.ofTotal', { crawled: number(crawled), total: number(status.total) })}</span>
		</p>

		<dl class="stats">
			<div><dt>{t('crawler.remaining')}</dt><dd>{number(remaining)}</dd></div>
			<div><dt>{t('crawler.finishes')}</dt><dd>{finish()}</dd></div>
			<div><dt>{t('crawler.rate')}</dt><dd>{status.perSecond ? `${status.perSecond}/s` : '—'}</dd></div>
			<div><dt>{t('crawler.timeLeft')}</dt><dd>{etaHours !== null ? `${etaHours}h` : '—'}</dd></div>
			<div><dt>{t('crawler.lastTitle')}</dt><dd>{ago(status.lastAddedAt)}</dd></div>
			<div><dt>{t('crawler.refreshes')}</dt><dd>{t('crawler.everySeconds', { n: REFRESH })}</dd></div>
		</dl>

		{#if filtered.length}
			<!--
				What the crawler refused to store, and why. Series only: anyone can
				add a show to TMDB, so a good part of the export is a stub with no
				poster or no episodes. Showing the tally is what stops the filter
				being invisible — a rule quietly eating a tenth of the catalog is
				visible here rather than as titles nobody can find.
			-->
			<h2 class="section">{t('crawler.filteredOut')} <span class="faint">{number(status.filteredTotal)}</span></h2>
			<ul class="reasons">
				{#each filtered as [key, count] (key)}
					<li><span class="chip">{reason(key)}</span><span class="faint">{number(count)}</span></li>
				{/each}
			</ul>
		{/if}

		<h2 class="section">{t('crawler.recentlyCrawled')}</h2>

		{#if recent}
			<div class="results" class:refreshing aria-busy={refreshing}>
				<div class="grid-posters">
					{#each recent.items as item (item.id)}
						<PosterCard {item} showType={false} />
					{:else}
						<p class="muted">{t('crawler.nothingYet')}</p>
					{/each}
				</div>
			</div>

			<Pager page={pageNumber} pages={recent.pages} onpage={toPage} />
		{/if}
	{/if}
</div>

<style>
	.page {
		padding-top: clamp(2rem, 5vw, 3.5rem);
		padding-bottom: 4rem;
	}

	.masthead {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1.25rem;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--accent);
	}

	h1 {
		font-size: clamp(2rem, 6vw, 3rem);
		margin: 0.35rem 0 0;
	}

	.types {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.8rem;
	}

	.reasons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.25rem;
		list-style: none;
		margin: 0 0 1.5rem;
		padding: 0;
	}

	.reasons li {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
	}

	.state {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.35rem 0.75rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		font-size: 0.85rem;
		color: var(--muted);
		white-space: nowrap;
	}

	.state.on {
		border-color: var(--accent);
		color: var(--accent);
	}

	.progress {
		height: 10px;
		border-radius: 999px;
		background: var(--accent-soft);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		background: var(--accent);
		border-radius: 999px;
		transition: width 0.6s ease;
	}

	.pct {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		margin: 0.6rem 0 1.5rem;
	}

	.pct strong {
		font-size: 1.4rem;
	}

	/* Two columns on a phone, spreading out when there is room. */
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.75rem;
		margin: 0 0 2.5rem;
	}

	.stats div {
		padding: 0.8rem 0.9rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
	}

	dt {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
	}

	dd {
		margin: 0.3rem 0 0;
		font-size: 1.15rem;
		font-variant-numeric: tabular-nums;
	}

	.section {
		font-size: 1.1rem;
		margin: 0 0 1rem;
	}

	.results {
		position: relative;
	}

	.results .grid-posters {
		transition: opacity 0.15s ease;
	}

	.results.refreshing .grid-posters {
		opacity: 0.45;
		pointer-events: none;
	}

</style>
