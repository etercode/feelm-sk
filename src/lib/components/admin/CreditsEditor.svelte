<!--
	Who is credited on one work.

	Lives on the work's page rather than on a person's, because that is the
	direction the problem arrives from: a cast list is wrong, and it is wrong
	about one film.

	A person is named rather than picked from a list. An unfamiliar name creates
	them — which is exactly what the crawler does, and the alternative is making
	somebody go and create the person first, then come back. The type-ahead is
	there to make reusing an existing person the easy path, so the same actor
	does not become two rows.
-->
<script>
	import * as api from '$lib/api/client.js';
	import Icon from '$lib/components/Icon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import ConfirmAction from '$lib/components/admin/ConfirmAction.svelte';

	let { workId } = $props();

	const roleLabels = {
		cast: 'Cast',
		director: 'Director',
		writer: 'Writer',
		creator: 'Creator',
		developer: 'Developer',
		publisher: 'Publisher',
		author: 'Author'
	};

	let credits = $state([]);
	let roles = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let busyId = $state(null);

	async function load() {
		const data = await api.adminCredits(workId);
		credits = data.items;
		roles = data.roles;
	}

	$effect(() => {
		workId;
		loading = true;
		load()
			.then(() => (error = null))
			.catch((e) => (error = e.message ?? 'Could not load the credits.'))
			.finally(() => (loading = false));
	});

	/* ---- adding ---- */

	let draft = $state({ person: '', role: 'cast', character: '' });
	let adding = $state(false);
	let suggestions = $state([]);

	$effect(() => {
		const q = draft.person.trim();
		if (q.length < 2) {
			suggestions = [];
			return;
		}

		let live = true;
		const timer = setTimeout(() => {
			api
				.adminPeopleSearch(q, 6)
				.then((d) => {
					if (live) suggestions = d.items;
				})
				.catch(() => {});
		}, 250);

		return () => {
			live = false;
			clearTimeout(timer);
		};
	});

	let isCast = $derived(draft.role === 'cast');

	async function add(event) {
		event.preventDefault();
		adding = true;
		error = null;

		try {
			await api.adminAddCredit(workId, {
				person: draft.person.trim(),
				role: draft.role,
				character: isCast ? draft.character.trim() : undefined
			});
			draft = { person: '', role: draft.role, character: '' };
			suggestions = [];
			await load();
		} catch (e) {
			error = message(e);
		} finally {
			adding = false;
		}
	}

	/* ---- editing a row ---- */

	let editing = $state(null);
	let editDraft = $state({ role: '', character: '', position: 0 });

	function startEdit(credit) {
		editing = credit.id;
		editDraft = {
			role: credit.role,
			character: credit.character ?? '',
			position: credit.position
		};
	}

	async function saveEdit(credit) {
		busyId = credit.id;
		error = null;
		try {
			await api.adminUpdateCredit(credit.id, {
				role: editDraft.role,
				character: editDraft.role === 'cast' ? editDraft.character : '',
				position: Number(editDraft.position) || 0
			});
			editing = null;
			await load();
		} catch (e) {
			error = message(e);
		} finally {
			busyId = null;
		}
	}

	async function remove(credit) {
		busyId = credit.id;
		error = null;
		try {
			await api.adminDeleteCredit(credit.id);
			await load();
		} catch (e) {
			error = message(e);
		} finally {
			busyId = null;
		}
	}

	function message(e) {
		const known = {
			duplicate_credit: 'That person already has that credit on this title.',
			person_and_role_required: 'Give a name and a role.',
			person_required: 'Give a name.'
		};
		return known[e.body?.error] ?? e.body?.detail ?? e.message ?? 'Could not save.';
	}

	let cast = $derived(credits.filter((c) => c.role === 'cast'));
	let crew = $derived(credits.filter((c) => c.role !== 'cast'));
</script>

<section class="card panel">
	<h2 class="section">
		Credits
		<span class="faint count">{credits.length}</span>
	</h2>

	{#if error}<p class="error">{error}</p>{/if}

	{#if loading && credits.length === 0}
		<p class="faint pad"><Spinner size={14} /> Loading…</p>
	{:else}
		{#each [{ label: 'Cast', rows: cast }, { label: 'Crew', rows: crew }] as group (group.label)}
			{#if group.rows.length}
				<h3 class="eyebrow group">{group.label}</h3>
				<ul class="rows">
					{#each group.rows as credit (credit.id)}
						<li>
							{#if editing === credit.id}
								<div class="edit">
									<select class="field" bind:value={editDraft.role}>
										{#each roles as role (role)}
											<option value={role}>{roleLabels[role] ?? role}</option>
										{/each}
									</select>
									{#if editDraft.role === 'cast'}
										<input class="field" bind:value={editDraft.character} placeholder="Character" />
									{/if}
									<input
										class="field pos"
										type="number"
										bind:value={editDraft.position}
										min="0"
										aria-label="Billing position"
									/>
									<button
										type="button"
										class="btn btn-sm btn-primary"
										disabled={busyId === credit.id}
										onclick={() => saveEdit(credit)}
									>
										Save
									</button>
									<button type="button" class="btn btn-sm btn-ghost" onclick={() => (editing = null)}>
										Cancel
									</button>
								</div>
							{:else}
								<a class="person" href="/admin/people/{credit.person?.id}">
									{#if credit.person?.photo}
										<img src={credit.person.photo} alt="" loading="lazy" />
									{:else}
										<span class="noart"><Icon name="user" size={12} /></span>
									{/if}
									<span class="names">
										<strong>{credit.person?.name ?? 'Unknown'}</strong>
										{#if credit.character}<span class="faint">as {credit.character}</span>{/if}
									</span>
								</a>

								<div class="controls">
									<span class="chip">{roleLabels[credit.role] ?? credit.role}</span>
									{#if busyId === credit.id}
										<Spinner size={13} />
									{:else}
										<button type="button" class="btn btn-sm btn-ghost" onclick={() => startEdit(credit)}>
											Edit
										</button>
										<ConfirmAction
											label="Remove"
											prompt="Remove?"
											confirmLabel="Remove"
											onconfirm={() => remove(credit)}
										/>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		{/each}

		{#if credits.length === 0}
			<p class="faint pad">Nobody is credited on this title.</p>
		{/if}

		<form class="add" onsubmit={add}>
			<h3 class="eyebrow group">Add someone</h3>
			<div class="fields">
				<div class="typeahead">
					<input
						class="field"
						bind:value={draft.person}
						placeholder="Name"
						autocomplete="off"
						spellcheck="false"
					/>
					{#if suggestions.length && draft.person.trim().length >= 2}
						<div class="suggestions card">
							{#each suggestions as s (s.id)}
								<button
									type="button"
									onclick={() => {
										draft.person = s.name;
										suggestions = [];
									}}
								>
									<strong>{s.name}</strong>
									<span class="faint">{s.creditCount.toLocaleString()} credits</span>
								</button>
							{/each}
							<p class="note faint">
								Pick one to reuse them. A name nobody has yet creates a new person.
							</p>
						</div>
					{/if}
				</div>

				<select class="field" bind:value={draft.role} aria-label="Role">
					{#each roles as role (role)}
						<option value={role}>{roleLabels[role] ?? role}</option>
					{/each}
				</select>

				{#if isCast}
					<input class="field" bind:value={draft.character} placeholder="Character" />
				{/if}

				<button
					type="submit"
					class="btn btn-primary btn-sm"
					disabled={adding || !draft.person.trim()}
				>
					{adding ? 'Adding…' : 'Add'}
				</button>
			</div>
		</form>
	{/if}
</section>

<style>
	.panel {
		padding: clamp(1.1rem, 3vw, 1.5rem);
		margin-bottom: 1rem;
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

	.group {
		margin: 1.1rem 0 0.5rem;
	}

	.group:first-of-type {
		margin-top: 0;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.rows li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.3rem 0;
		border-bottom: 1px solid var(--line);
		flex-wrap: wrap;
	}

	.rows li:last-child {
		border-bottom: 0;
	}

	.person {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
	}

	.person img,
	.noart {
		width: 1.8rem;
		height: 1.8rem;
		flex: none;
		border-radius: 50%;
		object-fit: cover;
		background: var(--surface-2);
	}

	.noart {
		display: grid;
		place-items: center;
		color: var(--faint);
	}

	.names {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.25;
	}

	.names strong {
		font-size: 0.87rem;
	}

	.names span {
		font-size: 0.78rem;
	}

	.person:hover strong {
		color: var(--accent);
	}

	.controls {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.edit {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		width: 100%;
		flex-wrap: wrap;
		padding: 0.2rem 0;
	}

	.edit .field {
		width: auto;
		flex: 1 1 8rem;
		padding: 0.35rem 0.55rem;
		font-size: 0.85rem;
	}

	.edit .pos {
		flex: 0 0 4.5rem;
	}

	.error {
		margin: 0 0 0.8rem;
		color: var(--danger);
		font-size: 0.86rem;
	}

	.pad {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 1rem 0;
		margin: 0;
		font-size: 0.88rem;
	}

	/* Adding ------------------------------------------------------------ */

	.add {
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--line);
	}

	.fields {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.fields .field {
		width: auto;
		flex: 1 1 9rem;
		padding: 0.45rem 0.7rem;
		font-size: 0.88rem;
	}

	.typeahead {
		position: relative;
		flex: 2 1 12rem;
		min-width: 0;
	}

	.typeahead .field {
		width: 100%;
	}

	.suggestions {
		position: absolute;
		top: calc(100% + 0.3rem);
		left: 0;
		right: 0;
		z-index: 20;
		padding: 0.3rem;
		box-shadow: var(--shadow-pop);
		max-height: 15rem;
		overflow-y: auto;
	}

	.suggestions button {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.6rem;
		width: 100%;
		padding: 0.45rem 0.55rem;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: inherit;
		font: inherit;
		font-size: 0.86rem;
		text-align: left;
		cursor: pointer;
	}

	.suggestions button:hover {
		background: var(--tint-strong);
	}

	.suggestions .note {
		margin: 0.3rem 0.55rem 0.2rem;
		font-size: 0.75rem;
		line-height: 1.4;
	}
</style>
