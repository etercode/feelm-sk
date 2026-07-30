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
	import PosterCard from '$lib/components/PosterCard.svelte';
	import Spinner from '$lib/components/Spinner.svelte';

	let { data } = $props();

	/** Seconds between summary refreshes. */
	const REFRESH = 10;

	// Whatever the last poll returned, or the server's render until one has.
	// Held separately so a navigation's fresh data takes over on its own.
	let polled = $state(null);
	let status = $derived(polled ?? data.status);
	let recent = $derived(data.recent);
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
		const timer = setInterval(async () => {
			try {
				const response = await fetch(`${API_URL}/api/crawl/status`);
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

	function number(value) {
		return typeof value === 'number' ? value.toLocaleString() : '—';
	}

	/** Clock time the crawl should end — easier to read than "33.2h" on a phone. */
	function finish() {
		if (etaHours === null) return '—';
		const at = new Date(Date.now() + etaHours * 3600 * 1000);
		const day = at.toDateString() === new Date().toDateString() ? '' : `${at.toLocaleDateString(undefined, { weekday: 'short' })} `;
		return day + at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}

	function ago(iso) {
		if (!iso) return 'never';
		const seconds = Math.max(0, Math.round((Date.now() - new Date(iso)) / 1000));
		if (seconds < 60) return `${seconds}s ago`;
		if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
		return `${Math.round(seconds / 86400)}d ago`;
	}
</script>

<svelte:head><title>Crawler — Feelm</title></svelte:head>

<div class="frame page">
	<header class="masthead">
		<div>
			<span class="eyebrow"><Icon name="movie" size={14} />Catalog</span>
			<h1 class="display">Crawler</h1>
		</div>
		{#if status}
			<span class="state" class:on={status.running}>
				{#if status.running}<Spinner size={14} />{/if}
				{status.running ? 'Running' : 'Idle'}
			</span>
		{/if}
	</header>

	{#if data.unreachable || !status}
		<p class="notice">The catalog API is unreachable.</p>
	{:else}
		<div class="progress" role="img" aria-label="{percent}% crawled">
			<div class="fill" style="width: {Math.max(percent, 0.3)}%"></div>
		</div>
		<p class="pct">
			<strong>{percent}%</strong>
			<span class="faint">{number(crawled)} of {number(status.total)}</span>
		</p>

		<dl class="stats">
			<div><dt>Remaining</dt><dd>{number(remaining)}</dd></div>
			<div><dt>Finishes</dt><dd>{finish()}</dd></div>
			<div><dt>Rate</dt><dd>{status.perSecond ? `${status.perSecond}/s` : '—'}</dd></div>
			<div><dt>Time left</dt><dd>{etaHours !== null ? `${etaHours}h` : '—'}</dd></div>
			<div><dt>Last title</dt><dd>{ago(status.lastAddedAt)}</dd></div>
			<div><dt>Refreshes</dt><dd>every {REFRESH}s</dd></div>
		</dl>

		<h2 class="section">Recently crawled</h2>

		{#if recent}
			<div class="results" class:refreshing aria-busy={refreshing}>
				<div class="grid-posters">
					{#each recent.items as item (item.id)}
						<PosterCard {item} showType={false} />
					{:else}
						<p class="muted">Nothing crawled yet.</p>
					{/each}
				</div>
			</div>

			{#if recent.pages > 1}
				<nav class="pager">
					<button
						type="button"
						class="btn btn-sm"
						disabled={pageNumber <= 1}
						onclick={() => toPage(pageNumber - 1)}
					>
						<Icon name="left" size={14} />Previous
					</button>
					<span class="faint">{pageNumber} / {recent.pages.toLocaleString()}</span>
					<button
						type="button"
						class="btn btn-sm"
						disabled={pageNumber >= recent.pages}
						onclick={() => toPage(pageNumber + 1)}
					>
						Next<Icon name="right" size={14} />
					</button>
				</nav>
			{/if}
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

	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem 0 0;
	}
</style>
