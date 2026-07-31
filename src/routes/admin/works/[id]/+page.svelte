<!--
	One title, corrected.

	Grouped into what a person actually edits together: what it is called, what
	it says, the artwork, and how it is classified. Each panel saves on its own,
	so a mistyped year cannot roll back a rewritten description.

	Some fields are shown but not editable, and that is deliberate. Type and
	slug are identity — the slug is in every link anybody has to this title.
	The external score is written by a database trigger. Popularity and vote
	counts are TMDB's measurements, not opinions. Showing them greyed out
	answers "why can't I change this?" better than hiding them would.
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as api from '$lib/api/client.js';
	import Icon from '$lib/components/Icon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import ConfirmAction from '$lib/components/admin/ConfirmAction.svelte';
	import { session } from '$lib/state/session.svelte.js';

	let id = $derived(Number(page.params.id));

	let work = $state(null);
	let loading = $state(true);
	let loadError = $state(null);
	let genres = $state([]);

	let naming = $state({ title: '', originalTitle: '', year: '', releaseDate: '' });
	let words = $state({ tagline: '', overview: '' });
	let art = $state({ poster: '', backdrop: '' });
	let facts = $state({
		runtimeMinutes: '',
		certification: '',
		originalLanguage: '',
		pageCount: '',
		publisher: ''
	});
	let chosenGenres = $state([]);

	$effect(() => {
		api
			.adminGenres()
			.then((d) => (genres = d.items))
			.catch(() => {});
	});

	$effect(() => {
		const wanted = id;
		let live = true;
		loading = true;

		api
			.adminWork(wanted)
			.then((data) => {
				if (!live) return;
				apply(data);
				loadError = null;
			})
			.catch((e) => {
				if (live) loadError = e.status === 404 ? 'No such title.' : e.message;
			})
			.finally(() => {
				if (live) loading = false;
			});

		return () => {
			live = false;
		};
	});

	/** Server answer -> the form. Nulls become empty strings; inputs want those. */
	function apply(data) {
		work = data;
		naming = {
			title: data.title ?? '',
			originalTitle: data.originalTitle ?? '',
			year: data.year ?? '',
			releaseDate: data.releaseDate ?? ''
		};
		words = { tagline: data.tagline ?? '', overview: data.overview ?? '' };
		art = { poster: data.posterPath ?? '', backdrop: data.backdropPath ?? '' };
		facts = {
			runtimeMinutes: data.runtimeMinutes ?? '',
			certification: data.certification ?? '',
			originalLanguage: data.originalLanguage ?? '',
			pageCount: data.pageCount ?? '',
			publisher: data.publisher ?? ''
		};
		chosenGenres = [...(data.genres ?? [])];
	}

	let saving = $state(null);
	let saved = $state(null);
	let error = $state(null);

	async function save(panel, body) {
		saving = panel;
		error = null;
		saved = null;

		try {
			apply(await api.adminUpdateWork(id, body));
			saved = panel;
			setTimeout(() => saved === panel && (saved = null), 2500);
		} catch (e) {
			error = message(e);
		} finally {
			saving = null;
		}
	}

	/** Empty number inputs must go as null, not as the string "". */
	function num(value) {
		const trimmed = String(value ?? '').trim();
		return trimmed === '' ? null : Number(trimmed);
	}

	function saveNaming(event) {
		event.preventDefault();
		return save('naming', {
			title: naming.title,
			originalTitle: naming.originalTitle,
			year: num(naming.year),
			releaseDate: naming.releaseDate
		});
	}

	function saveWords(event) {
		event.preventDefault();
		return save('words', { tagline: words.tagline, overview: words.overview });
	}

	function saveArt(event) {
		event.preventDefault();
		return save('art', { poster: art.poster, backdrop: art.backdrop });
	}

	function saveFacts(event) {
		event.preventDefault();
		return save('facts', {
			runtimeMinutes: num(facts.runtimeMinutes),
			certification: facts.certification,
			originalLanguage: facts.originalLanguage,
			pageCount: num(facts.pageCount),
			publisher: facts.publisher,
			genres: chosenGenres
		});
	}

	async function hide() {
		try {
			await api.adminHideWork(id);
			apply(await api.adminWork(id));
		} catch (e) {
			error = message(e);
		}
	}

	async function restore() {
		saving = 'restore';
		try {
			apply(await api.adminRestoreWork(id));
		} catch (e) {
			error = message(e);
		} finally {
			saving = null;
		}
	}

	function message(e) {
		const known = {
			title_required: 'A title is required.',
			invalid_date: 'That release date could not be read. Use YYYY-MM-DD.',
			already_deleted: 'This title is already hidden.',
			not_deleted: 'This title is not hidden.'
		};
		return known[e.body?.error] ?? e.body?.detail ?? e.message ?? 'Could not save.';
	}

	function toggleGenre(name) {
		chosenGenres = chosenGenres.includes(name)
			? chosenGenres.filter((g) => g !== name)
			: [...chosenGenres, name];
	}

	/** @param {string} iso */
	function stamp(iso) {
		return iso ? new Date(iso).toLocaleString() : '—';
	}
</script>

<svelte:head><title>{work ? work.title : 'Title'} — Admin — Feelm</title></svelte:head>

{#if loading && !work}
	<p class="gate muted"><Spinner size={16} /> Loading the title…</p>
{:else if loadError}
	<p class="error">{loadError}</p>
	<a class="btn btn-sm" href="/admin/works"><Icon name="left" size={14} />Back to works</a>
{:else if work}
	<a class="back faint" href="/admin/works"><Icon name="left" size={13} />Works</a>

	<header class="masthead" data-type={work.type}>
		<div class="identity">
			{#if work.poster}
				<img class="art" src={work.poster} alt="" />
			{:else}
				<span class="art noart"><Icon name={work.type} size={22} /></span>
			{/if}
			<div>
				<span class="eyebrow"><Icon name={work.type} size={13} />{work.type}</span>
				<h1 class="display">{work.title}</h1>
				<p class="meta muted">
					{work.year ?? 'no year'} · <code>{work.slug}</code>
					{#if work.hidden}<span class="chip gone">Hidden</span>{/if}
					{#if work.isUpcoming}<span class="chip">Upcoming</span>{/if}
				</p>
			</div>
		</div>

		<a class="btn btn-sm" href="/{work.type}/{work.slug}">
			View page<Icon name="external" size={13} />
		</a>
	</header>

	{#if work.hidden}
		<p class="banner">
			<Icon name="eye" size={15} />
			This title is hidden. It does not appear in search, on the site, or on anybody's shelf — but
			every shelf entry and review for it is untouched and comes back when it does.
		</p>
	{/if}

	{#if error}<p class="error">{error}</p>{/if}

	<div class="split">
		<section class="card panel">
			<h2 class="section">What it is called</h2>
			<form onsubmit={saveNaming}>
				<label>
					<span class="eyebrow">Title</span>
					<input class="field" bind:value={naming.title} />
				</label>
				<label>
					<span class="eyebrow">Original title</span>
					<input class="field" bind:value={naming.originalTitle} />
				</label>
				<div class="pair">
					<label>
						<span class="eyebrow">Year</span>
						<input class="field" type="number" bind:value={naming.year} min="1800" max="2200" />
					</label>
					<label>
						<span class="eyebrow">Release date</span>
						<input class="field" type="date" bind:value={naming.releaseDate} />
					</label>
				</div>
				<div class="foot">
					{#if saved === 'naming'}<span class="ok">Saved.</span>{/if}
					<button type="submit" class="btn btn-primary btn-sm" disabled={saving === 'naming'}>
						{saving === 'naming' ? 'Saving…' : 'Save'}
					</button>
				</div>
			</form>
		</section>

		<section class="card panel">
			<h2 class="section">What it says</h2>
			<form onsubmit={saveWords}>
				<label>
					<span class="eyebrow">Tagline</span>
					<input class="field" bind:value={words.tagline} />
				</label>
				<label>
					<span class="eyebrow">Description</span>
					<textarea class="field" rows="7" bind:value={words.overview}></textarea>
				</label>
				<div class="foot">
					{#if saved === 'words'}<span class="ok">Saved.</span>{/if}
					<button type="submit" class="btn btn-primary btn-sm" disabled={saving === 'words'}>
						{saving === 'words' ? 'Saving…' : 'Save'}
					</button>
				</div>
			</form>
		</section>
	</div>

	<section class="card panel">
		<h2 class="section">Artwork</h2>
		<form onsubmit={saveArt}>
			<div class="pair">
				<label>
					<span class="eyebrow">Poster</span>
					<input class="field" bind:value={art.poster} placeholder="https://… or /media/…" />
				</label>
				<label>
					<span class="eyebrow">Backdrop</span>
					<input class="field" bind:value={art.backdrop} placeholder="https://… or /media/…" />
				</label>
			</div>
			<p class="hint faint">
				A full URL or a path this server serves. Cleared fields fall back to nothing being drawn.
			</p>
			<div class="previews">
				{#if work.poster}<img class="p-poster" src={work.poster} alt="Current poster" />{/if}
				{#if work.backdrop}<img class="p-backdrop" src={work.backdrop} alt="Current backdrop" />{/if}
			</div>
			<div class="foot">
				{#if saved === 'art'}<span class="ok">Saved.</span>{/if}
				<button type="submit" class="btn btn-primary btn-sm" disabled={saving === 'art'}>
					{saving === 'art' ? 'Saving…' : 'Save'}
				</button>
			</div>
		</form>
	</section>

	<section class="card panel">
		<h2 class="section">How it is classified</h2>
		<form onsubmit={saveFacts}>
			<div class="grid">
				<label>
					<span class="eyebrow">Runtime (min)</span>
					<input class="field" type="number" bind:value={facts.runtimeMinutes} min="0" />
				</label>
				<label>
					<span class="eyebrow">Certification</span>
					<input class="field" bind:value={facts.certification} />
				</label>
				<label>
					<span class="eyebrow">Language</span>
					<input class="field" bind:value={facts.originalLanguage} maxlength="8" />
				</label>
				{#if work.type === 'book'}
					<label>
						<span class="eyebrow">Pages</span>
						<input class="field" type="number" bind:value={facts.pageCount} min="0" />
					</label>
					<label>
						<span class="eyebrow">Publisher</span>
						<input class="field" bind:value={facts.publisher} />
					</label>
				{/if}
			</div>

			<fieldset>
				<legend class="eyebrow">Genres</legend>
				<div class="genre-picker">
					{#each genres as g (g.slug)}
						<button
							type="button"
							class="chip"
							class:on={chosenGenres.includes(g.name)}
							onclick={() => toggleGenre(g.name)}
						>
							{g.name}
						</button>
					{/each}
				</div>
			</fieldset>

			<div class="foot">
				{#if saved === 'facts'}<span class="ok">Saved.</span>{/if}
				<button type="submit" class="btn btn-primary btn-sm" disabled={saving === 'facts'}>
					{saving === 'facts' ? 'Saving…' : 'Save'}
				</button>
			</div>
		</form>
	</section>

	<section class="card panel">
		<h2 class="section">Not editable here</h2>
		<dl class="meta-grid">
			<div><dt>Type</dt><dd>{work.type} <em>identity</em></dd></div>
			<div><dt>Slug</dt><dd><code>{work.slug}</code> <em>in every link</em></dd></div>
			<div>
				<dt>External score</dt>
				<dd>{work.externalScore ?? '—'} <em>set by a trigger</em></dd>
			</div>
			<div><dt>Popularity</dt><dd>{work.popularity ?? '—'} <em>TMDB</em></dd></div>
			<div><dt>Votes</dt><dd>{(work.voteCount ?? 0).toLocaleString()} <em>TMDB</em></dd></div>
			<div><dt>Crawled</dt><dd>{stamp(work.addedAt)}</dd></div>
		</dl>

		<!-- Both of these arrive keyed by source, not as lists. -->
		{#if Object.keys(work.externalIds ?? {}).length}
			<p class="ids">
				{#each Object.entries(work.externalIds) as [source, value] (source)}
					<span class="chip">{source}: {value}</span>
				{/each}
			</p>
		{/if}

		{#if Object.keys(work.ratings ?? {}).length}
			<p class="ids">
				{#each Object.entries(work.ratings) as [source, r] (source)}
					<span class="chip">
						{source}: {r.rating}/{r.scale}
						{#if r.votes}<span class="faint">· {r.votes.toLocaleString()} votes</span>{/if}
					</span>
				{/each}
			</p>
		{/if}
	</section>

	<section class="card panel danger-zone">
		<h2 class="section"><Icon name="warning" size={15} />Danger zone</h2>
		<div class="row-out">
			<div>
				<strong>{work.hidden ? 'Put it back in the catalog' : 'Hide from the catalog'}</strong>
				<p class="hint faint">
					{#if work.hidden}
						It reappears in search, on the site and on every shelf that held it.
					{:else}
						It disappears from search, the site and everybody's shelves. Nothing is destroyed —
						shelf entries, reviews and seen marks all survive and come back if you restore it.
						The crawler still recognises it, so it will not be added again as a duplicate.
					{/if}
				</p>
			</div>

			{#if work.hidden}
				<button
					type="button"
					class="btn btn-sm"
					disabled={!session.isAdmin || saving === 'restore'}
					onclick={restore}
				>
					<Icon name="refresh" size={13} />Restore
				</button>
			{:else}
				<ConfirmAction
					label="Hide title"
					prompt="Type the title to confirm:"
					confirmLabel="Hide"
					confirmText={work.title}
					icon="eye"
					small={false}
					disabled={!session.isAdmin}
					onconfirm={hide}
				/>
			{/if}
		</div>

		{#if !session.isAdmin}
			<p class="hint faint">Only an administrator can hide or restore a title.</p>
		{/if}
	</section>
{/if}

<style>
	.gate {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 5rem 0;
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-bottom: 0.7rem;
		font-size: 0.85rem;
	}

	.back:hover {
		color: var(--ink);
	}

	.masthead {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1.5rem;
	}

	.identity {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		min-width: 0;
	}

	.art {
		width: 4rem;
		height: 6rem;
		flex: none;
		border-radius: var(--radius);
		object-fit: cover;
		background: var(--surface-2);
	}

	.noart {
		display: grid;
		place-items: center;
		color: var(--accent);
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--accent);
		text-transform: capitalize;
	}

	h1 {
		font-size: clamp(1.5rem, 4vw, 2.2rem);
		margin: 0.25rem 0 0;
	}

	.meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0.3rem 0 0;
		font-size: 0.88rem;
	}

	code {
		font-size: 0.85em;
		padding: 0.1rem 0.3rem;
		border-radius: var(--radius-sm);
		background: var(--tint);
	}

	.chip.gone {
		border-color: color-mix(in srgb, var(--danger) 40%, transparent);
		color: var(--danger);
	}

	.banner {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.9rem 1.1rem;
		margin-bottom: 1rem;
		border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--line));
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--danger) 7%, transparent);
		font-size: 0.88rem;
		line-height: 1.5;
	}

	.split {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		align-items: start;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.panel {
		padding: clamp(1.1rem, 3vw, 1.5rem);
		margin-bottom: 1rem;
	}

	.split .panel {
		margin-bottom: 0;
	}

	.section {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin: 0 0 1rem;
		font-size: 1rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.pair,
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: 0.85rem;
	}

	textarea.field {
		resize: vertical;
		font: inherit;
		line-height: 1.55;
	}

	.hint {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.45;
	}

	.previews {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.p-poster {
		width: 4rem;
		border-radius: var(--radius-sm);
	}

	.p-backdrop {
		height: 6rem;
		border-radius: var(--radius-sm);
	}

	fieldset {
		padding: 0;
		border: 0;
	}

	legend {
		padding: 0 0 0.5rem;
	}

	.genre-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		max-height: 11rem;
		overflow-y: auto;
	}

	.genre-picker .chip {
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.genre-picker .chip:hover {
		border-color: var(--line-strong);
		color: var(--ink);
	}

	.genre-picker .chip.on {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
		font-weight: 600;
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.6rem;
	}

	.ok {
		color: var(--ok);
		font-size: 0.85rem;
	}

	.error {
		margin: 0 0 1rem;
		color: var(--danger);
		font-size: 0.88rem;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.75rem;
		margin: 0;
	}

	dt {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--faint);
	}

	dd {
		margin: 0.2rem 0 0;
		font-size: 0.88rem;
	}

	dd em {
		font-style: normal;
		font-size: 0.76rem;
		color: var(--faint);
	}

	.ids {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 1rem 0 0;
	}

	.danger-zone {
		border-color: color-mix(in srgb, var(--danger) 35%, var(--line));
	}

	.danger-zone .section {
		color: var(--danger);
	}

	.row-out {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.row-out > div {
		flex: 1 1 18rem;
		min-width: 0;
	}

	.row-out strong {
		font-size: 0.92rem;
	}

	.row-out .hint {
		margin-top: 0.2rem;
	}
</style>
