<script>
	import Icon from '$lib/components/Icon.svelte';
	import { types, typeKeys } from '$lib/data/types.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { session } from '$lib/state/session.svelte.js';

	const year = new Date().getFullYear();
</script>

<footer>
	<div class="frame inner">
		<div class="about">
			<span class="wordmark"><em>feel</em>m</span>
			<p class="muted">{t('footer.blurb')}</p>

			<!--
				Under the brand rather than in the link column: it is who we are
				rather than somewhere else on the site, and it leaves the page.
				"Discord" is a proper noun and stays in every language, the same
				way IMDb and TMDB do elsewhere.
			-->
			<a
				class="social"
				href="https://discord.gg/JWPKRfH2b"
				target="_blank"
				rel="noreferrer noopener"
				title={t('footer.discord')}
			>
				<Icon name="discord" size={17} filled />
				<span>Discord</span>
			</a>
		</div>

		<nav>
			<span class="eyebrow">{t('footer.browse')}</span>
			{#each typeKeys as key (key)}
				<a href={types[key].browse}>{types[key].plural}</a>
			{/each}
			{#if session.user}
				<a href="/feed">{t('nav.feed')}</a>
			{/if}
		</nav>

		<div class="colophon">
			<span class="eyebrow">{t('footer.catalog')}</span>
			<!--
				This said "N titles loaded", counting the front page's cache — so it
				read "96" for a catalog of seven hundred thousand, and it was the
				last reason every page in the site had to load that cache. The page
				it links to has the real number.
			-->
			<p class="muted">
				{t('footer.crawlerNote')} <a href="/crawler">{t('footer.crawlerLink')}</a>
			</p>
		</div>
	</div>

	<div class="frame base muted">
		<span>© {year} Feelm</span>
		<span class="faint">{t('footer.credit')}</span>
	</div>
</footer>

<style>
	footer {
		margin-top: clamp(3rem, 8vw, 6rem);
		border-top: 1px solid var(--line);
		background: linear-gradient(to bottom, transparent, var(--tint));
	}

	.inner {
		display: grid;
		grid-template-columns: 1.4fr 0.7fr 1.2fr;
		gap: clamp(1.5rem, 5vw, 4rem);
		padding-block: clamp(2rem, 5vw, 3.5rem);
	}

	.wordmark {
		font-family: var(--font-display);
		font-size: 1.5rem;
	}

	.wordmark em {
		font-style: italic;
		color: var(--brand);
	}

	/*
	 * A pill rather than another link in a list of links: it is the one thing
	 * down here that leaves the site, and it should not read as a fifth item
	 * in the browse column.
	 */
	.social {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.45rem 0.85rem;
		border: 1px solid var(--line);
		border-radius: 99px;
		color: var(--muted);
		font-size: 0.85rem;
		font-weight: 500;
		transition:
			color 0.18s ease,
			border-color 0.18s ease,
			background 0.18s ease;
	}

	.social:hover {
		color: var(--ink);
		border-color: var(--line-strong);
		background: var(--tint);
	}

	p {
		margin: 0.6rem 0 0;
		font-size: 0.9rem;
		max-width: 34ch;
	}

	nav {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		font-size: 0.9rem;
	}

	nav a {
		color: var(--muted);
		transition: color 0.18s ease;
	}

	nav a:hover {
		color: var(--brand);
	}

	.eyebrow {
		margin-bottom: 0.3rem;
	}

	.base {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-block: 1.1rem;
		border-top: 1px solid var(--line);
		font-size: 0.82rem;
	}

	@media (max-width: 760px) {
		.inner {
			grid-template-columns: 1fr;
		}
	}
</style>
