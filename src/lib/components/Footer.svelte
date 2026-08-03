<script>
	import { types, typeKeys } from '$lib/data/types.js';
	import { t } from '$lib/i18n/index.svelte.js';

	const year = new Date().getFullYear();
</script>

<footer>
	<div class="frame inner">
		<div class="about">
			<span class="wordmark"><em>feel</em>m</span>
			<p class="muted">{t('footer.blurb')}</p>
		</div>

		<nav>
			<span class="eyebrow">{t('footer.browse')}</span>
			{#each typeKeys as key (key)}
				<a href={types[key].browse}>{types[key].plural}</a>
			{/each}
			<a href="/feed">{t('nav.feed')}</a>
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
