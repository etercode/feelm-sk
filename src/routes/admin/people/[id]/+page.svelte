<!--
	One person, their filmography, and the merge.

	The merge is why this page exists. The crawler identifies a person by a slug
	made from their name, so every spelling TMDB has ever sent becomes its own
	row — the same actor as "Bong Joon-ho", "Bong Joon Ho" and "봉준호" is three
	people holding three parts of one filmography, and nothing but a person
	looking at them can tell.

	It is not reversible, so it asks for the name to be typed and says plainly
	what will happen, including that credits duplicated across both are dropped
	rather than doubled.
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as api from '$lib/api/client.js';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import ConfirmAction from '$lib/components/admin/ConfirmAction.svelte';
	import { session } from '$lib/state/session.svelte.js';

	let id = $derived(Number(page.params.id));

	let person = $state(null);
	let loading = $state(true);
	let loadError = $state(null);
	let creditPage = $state(1);

	let form = $state({ name: '', photo: '', externalId: '' });

	$effect(() => {
		const wanted = id;
		const p = creditPage;
		let live = true;
		loading = true;

		api
			.adminPerson(wanted, { page: p, limit: 40 })
			.then((data) => {
				if (!live) return;
				person = data;
				form = {
					name: data.name ?? '',
					photo: data.photoPath ?? '',
					externalId: data.externalId ?? ''
				};
				loadError = null;
			})
			.catch((e) => {
				if (live) loadError = e.status === 404 ? 'No such person.' : e.message;
			})
			.finally(() => {
				if (live) loading = false;
			});

		return () => {
			live = false;
		};
	});

	let saving = $state(null);
	let saved = $state(false);
	let error = $state(null);

	async function save(event) {
		event.preventDefault();
		saving = 'profile';
		error = null;
		saved = false;

		try {
			const updated = await api.adminUpdatePerson(id, {
				name: form.name,
				photo: form.photo,
				externalId: form.externalId
			});
			person = { ...person, ...updated };
			form = {
				name: updated.name ?? '',
				photo: updated.photoPath ?? '',
				externalId: updated.externalId ?? ''
			};
			saved = true;
			setTimeout(() => (saved = false), 2500);
		} catch (e) {
			error = message(e);
		} finally {
			saving = null;
		}
	}

	async function removePerson() {
		try {
			await api.adminDeletePerson(id, person.creditCount > 0);
			goto('/admin/people');
		} catch (e) {
			error = message(e);
		}
	}

	function message(e) {
		const known = {
			name_required: 'A name is required.',
			person_has_credits: 'They still have credits. Merge them into somebody instead.',
			cannot_merge_into_self: 'That is the same person.'
		};
		return known[e.body?.error] ?? e.body?.detail ?? e.message ?? 'Could not save.';
	}

	/* ---- merging ---- */

	let merging = $state(false);
	let mergeTerm = $state('');
	let candidates = $state([]);
	let searching = $state(false);
	let target = $state(null);
	let mergeError = $state(null);
	let mergeBusy = $state(false);

	$effect(() => {
		const q = mergeTerm.trim();
		if (q.length < 2) {
			candidates = [];
			return;
		}

		let live = true;
		searching = true;
		const timer = setTimeout(() => {
			api
				.adminPeopleSearch(q, 10)
				.then((d) => {
					if (live) candidates = d.items.filter((c) => c.id !== id);
				})
				.catch(() => {})
				.finally(() => {
					if (live) searching = false;
				});
		}, 250);

		return () => {
			live = false;
			clearTimeout(timer);
		};
	});

	function openMerge() {
		mergeTerm = '';
		candidates = [];
		target = null;
		mergeError = null;
		merging = true;
	}

	async function doMerge() {
		mergeBusy = true;
		mergeError = null;
		try {
			await api.adminMergePeople(id, target.id);
			merging = false;
			goto(`/admin/people/${target.id}`);
		} catch (e) {
			mergeError = message(e);
		} finally {
			mergeBusy = false;
		}
	}

	const roleLabels = {
		cast: 'Cast',
		director: 'Director',
		writer: 'Writer',
		creator: 'Creator',
		developer: 'Developer',
		publisher: 'Publisher',
		author: 'Author'
	};
</script>

<svelte:head><title>{person ? person.name : 'Person'} — Admin — Feelm</title></svelte:head>

{#if loading && !person}
	<p class="gate muted"><Spinner size={16} /> Loading…</p>
{:else if loadError}
	<p class="error">{loadError}</p>
	<a class="btn btn-sm" href="/admin/people"><Icon name="left" size={14} />Back to people</a>
{:else if person}
	<a class="back faint" href="/admin/people"><Icon name="left" size={13} />People</a>

	<header class="masthead">
		<div class="identity">
			{#if person.photo}
				<img class="face" src={person.photo} alt="" />
			{:else}
				<span class="face noart"><Icon name="user" size={26} /></span>
			{/if}
			<div>
				<h1 class="display">{person.name}</h1>
				<p class="meta muted">
					<code>{person.slug}</code>
					· {person.creditCount.toLocaleString()} credit{person.creditCount === 1 ? '' : 's'}
					{#if person.externalId}· TMDB {person.externalId}{/if}
				</p>
			</div>
		</div>

		{#if session.isAdmin}
			<button type="button" class="btn btn-sm" onclick={openMerge}>
				<Icon name="users" size={13} />Merge into…
			</button>
		{/if}
	</header>

	{#if error}<p class="error">{error}</p>{/if}

	<div class="split">
		<section class="card panel">
			<h2 class="section">Details</h2>
			<form onsubmit={save}>
				<label>
					<span class="eyebrow">Name</span>
					<input class="field" bind:value={form.name} />
					<span class="hint faint">
						Changing this changes their slug too — the crawler finds people by it, and a corrected
						name on the old slug is how a duplicate gets made.
					</span>
				</label>
				<label>
					<span class="eyebrow">Photo</span>
					<input class="field" bind:value={form.photo} placeholder="https://… or /media/…" />
				</label>
				<label>
					<span class="eyebrow">TMDB person id</span>
					<input class="field" bind:value={form.externalId} />
				</label>
				<div class="foot">
					{#if saved}<span class="ok">Saved.</span>{/if}
					<button type="submit" class="btn btn-primary btn-sm" disabled={saving === 'profile'}>
						{saving === 'profile' ? 'Saving…' : 'Save'}
					</button>
				</div>
			</form>
		</section>

		<section class="card panel danger-zone">
			<h2 class="section"><Icon name="warning" size={15} />Danger zone</h2>
			<p class="hint faint">
				{#if person.creditCount > 0}
					They are credited on {person.creditCount.toLocaleString()} thing{person.creditCount === 1
						? ''
						: 's'}. Deleting takes every one of those credits with them, permanently. If this is a
					duplicate, merge instead — that keeps the credits.
				{:else}
					Nothing is credited to them. Safe to remove.
				{/if}
			</p>
			<div class="foot">
				<ConfirmAction
					label="Delete person"
					prompt="Type the name to confirm:"
					confirmLabel="Delete"
					confirmText={person.name}
					small={false}
					disabled={!session.isAdmin}
					onconfirm={removePerson}
				/>
			</div>
			{#if !session.isAdmin}
				<p class="hint faint">Only an administrator can merge or delete.</p>
			{/if}
		</section>
	</div>

	<section class="card panel">
		<h2 class="section">
			Credited on
			<span class="faint count">{person.credits.total.toLocaleString()}</span>
		</h2>

		{#if person.credits.items.length === 0}
			<p class="faint">Nothing.</p>
		{:else}
			<ul class="works">
				{#each person.credits.items as credit (credit.id)}
					<li>
						<a class="work" href="/admin/works/{credit.work?.id}" data-type={credit.work?.type}>
							{#if credit.work?.poster}
								<img src={credit.work.poster} alt="" loading="lazy" />
							{:else}
								<span class="noart small"><Icon name={credit.work?.type ?? 'film'} size={12} /></span>
							{/if}
							<span class="title">
								<strong>{credit.work?.title ?? 'Unknown'}</strong>
								<span class="faint">
									{credit.work?.year ?? '—'}
									{#if credit.work?.hidden}· <em class="hidden-tag">hidden</em>{/if}
								</span>
							</span>
						</a>
						<span class="role">
							<span class="chip">{roleLabels[credit.role] ?? credit.role}</span>
							{#if credit.character}<span class="faint as">as {credit.character}</span>{/if}
						</span>
					</li>
				{/each}
			</ul>

			<Pager
				page={creditPage}
				pages={person.credits.pages}
				busy={loading}
				onpage={(n) => (creditPage = n)}
			/>
		{/if}
	</section>
{/if}

<Modal open={merging} title="Merge this person into another" onclose={() => (merging = false)}>
	{#if person}
		<p class="explain muted">
			Every credit on <strong>{person.name}</strong> moves to whoever you pick, and this row is
			deleted. Where both are credited on the same thing in the same role, the duplicate is dropped
			rather than doubled. This cannot be undone.
		</p>

		<label>
			<span class="eyebrow">Who are they really?</span>
			<input
				class="field"
				bind:value={mergeTerm}
				placeholder="Search by name…"
				autocomplete="off"
				spellcheck="false"
			/>
		</label>

		<div class="candidates">
			{#if searching && candidates.length === 0}
				<p class="faint pad"><Spinner size={14} /> Searching…</p>
			{:else if mergeTerm.trim().length < 2}
				<p class="faint pad">Type at least two characters.</p>
			{:else if candidates.length === 0}
				<p class="faint pad">Nobody else by that name.</p>
			{:else}
				{#each candidates as c (c.id)}
					<button
						type="button"
						class="candidate"
						class:on={target?.id === c.id}
						onclick={() => (target = c)}
					>
						{#if c.photo}
							<img src={c.photo} alt="" />
						{:else}
							<span class="noart small"><Icon name="user" size={12} /></span>
						{/if}
						<span class="names">
							<strong>{c.name}</strong>
							<span class="faint">{c.creditCount.toLocaleString()} credits · {c.slug}</span>
						</span>
						{#if target?.id === c.id}<Icon name="check" size={15} />{/if}
					</button>
				{/each}
			{/if}
		</div>

		{#if target}
			<p class="outcome">
				<Icon name="right" size={14} />
				{person.creditCount.toLocaleString()} credit{person.creditCount === 1 ? '' : 's'} move to
				<strong>{target.name}</strong>, who will have up to
				{(target.creditCount + person.creditCount).toLocaleString()}. <strong>{person.name}</strong> is
				deleted.
			</p>
		{/if}

		{#if mergeError}<p class="error">{mergeError}</p>{/if}

		<div class="foot">
			<button type="button" class="btn" onclick={() => (merging = false)}>Cancel</button>
			<ConfirmAction
				label="Merge"
				prompt="Type {person.name} to confirm:"
				confirmLabel="Merge them"
				confirmText={person.name}
				icon={null}
				small={false}
				busy={mergeBusy}
				disabled={!target}
				onconfirm={doMerge}
			/>
		</div>
	{/if}
</Modal>

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
		align-items: center;
		gap: 1rem;
		min-width: 0;
	}

	.face {
		width: 4rem;
		height: 4rem;
		flex: none;
		border-radius: 50%;
		object-fit: cover;
		background: var(--surface-2);
	}

	.noart {
		display: grid;
		place-items: center;
		color: var(--faint);
		background: var(--surface-2);
	}

	.noart.small {
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 50%;
	}

	h1 {
		font-size: clamp(1.5rem, 4vw, 2.2rem);
		margin: 0;
	}

	.meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0.3rem 0 0;
		font-size: 0.88rem;
	}

	code {
		font-size: 0.85em;
		padding: 0.1rem 0.3rem;
		border-radius: var(--radius-sm);
		background: var(--tint);
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
		gap: 0.5rem;
		margin: 0 0 1rem;
		font-size: 1rem;
	}

	.count {
		font-size: 0.82rem;
		font-weight: 400;
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

	.hint {
		margin: 0;
		font-size: 0.79rem;
		line-height: 1.45;
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.ok {
		color: var(--ok);
		font-size: 0.85rem;
	}

	.error {
		margin: 0.6rem 0 0;
		color: var(--danger);
		font-size: 0.88rem;
	}

	.danger-zone {
		border-color: color-mix(in srgb, var(--danger) 35%, var(--line));
	}

	.danger-zone .section {
		color: var(--danger);
	}

	.danger-zone .foot {
		margin-top: 1rem;
	}

	/* Filmography ------------------------------------------------------- */

	.works {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.works li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.35rem 0;
		border-bottom: 1px solid var(--line);
	}

	.works li:last-child {
		border-bottom: 0;
	}

	.work {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		min-width: 0;
		flex: 1;
	}

	.work img {
		width: 1.7rem;
		height: 2.5rem;
		flex: none;
		border-radius: var(--radius-sm);
		object-fit: cover;
		background: var(--surface-2);
	}

	.title {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.25;
	}

	.title strong {
		font-size: 0.88rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.title span {
		font-size: 0.78rem;
	}

	.work:hover strong {
		color: var(--accent);
	}

	.hidden-tag {
		font-style: normal;
		color: var(--danger);
	}

	.role {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		flex: none;
		text-align: right;
	}

	.as {
		font-size: 0.8rem;
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Merge dialog ------------------------------------------------------ */

	.explain {
		margin: 0 0 1rem;
		font-size: 0.88rem;
		line-height: 1.55;
	}

	.candidates {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		max-height: 17rem;
		overflow-y: auto;
		margin: 0.75rem 0;
	}

	.pad {
		padding: 1rem 0.2rem;
		margin: 0;
		font-size: 0.86rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.candidate {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		width: 100%;
		padding: 0.45rem 0.55rem;
		border: 1px solid transparent;
		border-radius: var(--radius);
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.candidate:hover {
		background: var(--tint);
	}

	.candidate.on {
		border-color: var(--brand);
		background: var(--brand-soft);
	}

	.candidate img {
		width: 1.8rem;
		height: 1.8rem;
		flex: none;
		border-radius: 50%;
		object-fit: cover;
	}

	.names {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
		line-height: 1.25;
	}

	.names strong {
		font-size: 0.88rem;
	}

	.names span {
		font-size: 0.78rem;
	}

	.outcome {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		margin: 0 0 0.5rem;
		padding: 0.7rem 0.85rem;
		border-radius: var(--radius);
		background: var(--tint);
		font-size: 0.86rem;
		line-height: 1.5;
	}
</style>
