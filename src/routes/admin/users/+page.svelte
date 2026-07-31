<!--
	Every account, searchable.

	Filtering and paging are the server's job, the same as the profile shelf:
	the table asks for one page at a time and never holds the whole list. All of
	it lives in the query string, so a filtered view is a link — which matters
	when the thing you want to show somebody is "these four accounts".
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as api from '$lib/api/client.js';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import ConfirmAction from '$lib/components/admin/ConfirmAction.svelte';
	import DataTable from '$lib/components/admin/DataTable.svelte';
	import Toolbar from '$lib/components/admin/Toolbar.svelte';
	import { session } from '$lib/state/session.svelte.js';

	const columns = [
		{ key: 'user', label: 'Account', sort: 'username' },
		{ key: 'email', label: 'Email', hideNarrow: true },
		{ key: 'roles', label: 'Roles' },
		{ key: 'entries', label: 'Shelf', align: 'end', hideNarrow: true },
		{ key: 'reviews', label: 'Reviews', align: 'end', hideNarrow: true },
		{ key: 'joined', label: 'Joined', sort: 'recent', align: 'end' },
		{ key: 'actions', label: '', align: 'end' }
	];

	const roleOptions = [
		{ value: '', label: 'Any role' },
		{ value: 'ROLE_ADMIN', label: 'Administrators' },
		{ value: 'ROLE_MODERATOR', label: 'Moderators' }
	];

	const statusOptions = [
		{ value: '', label: 'Active' },
		{ value: 'deleted', label: 'Deleted' },
		{ value: 'all', label: 'Everyone' }
	];

	// The URL is the state. Every control writes to it and the load reads it,
	// so back and reload both land exactly where you were.
	let params = $derived(page.url.searchParams);
	let term = $derived(params.get('q') ?? '');
	let role = $derived(params.get('role') ?? '');
	let status = $derived(params.get('status') ?? '');
	let sort = $derived(params.get('sort') ?? 'recent');
	let pageNumber = $derived(Number(params.get('page') ?? 1));

	let result = $state({ items: [], total: 0, pages: 0 });
	let loading = $state(true);
	let error = $state(null);

	let creating = $state(false);
	let busyId = $state(null);

	$effect(() => {
		// Read every filter up front so the effect re-runs when any changes.
		const query = { q: term, role, status, sort, page: pageNumber, limit: 25 };

		// Typing into the search box fires several of these in a row, and they
		// do not have to come back in order. A slower earlier answer must not
		// overwrite a newer one.
		let live = true;
		loading = true;

		api
			.adminUsers(query)
			.then((data) => {
				if (!live) return;
				result = data;
				error = null;
			})
			.catch((e) => {
				if (live) error = e.message ?? 'Could not load accounts.';
			})
			.finally(() => {
				if (live) loading = false;
			});

		return () => {
			live = false;
		};
	});

	/** Writes one filter into the URL, always resetting to the first page. */
	function set(key, value) {
		const next = new URLSearchParams(page.url.searchParams);
		if (value === '' || value === null) next.delete(key);
		else next.set(key, String(value));
		if (key !== 'page') next.delete('page');
		goto(`/admin/users?${next}`, { noScroll: true, keepFocus: true });
	}

	async function reload() {
		result = await api.adminUsers({ q: term, role, status, sort, page: pageNumber, limit: 25 });
	}

	async function remove(user) {
		busyId = user.id;
		try {
			await api.adminDeleteUser(user.id);
			await reload();
		} catch (e) {
			error = e.body?.error ?? e.message;
		} finally {
			busyId = null;
		}
	}

	async function restore(user) {
		busyId = user.id;
		try {
			await api.adminRestoreUser(user.id);
			await reload();
		} catch (e) {
			error = e.body?.error ?? e.message;
		} finally {
			busyId = null;
		}
	}

	/* ---- creating ---- */

	let form = $state({ username: '', name: '', email: '', password: '', roles: [] });
	let saving = $state(false);
	let formError = $state(null);

	function openCreate() {
		form = { username: '', name: '', email: '', password: '', roles: [] };
		formError = null;
		creating = true;
	}

	async function create(event) {
		event.preventDefault();
		saving = true;
		formError = null;

		try {
			const made = await api.adminCreateUser({
				username: form.username.trim(),
				name: form.name.trim() || form.username.trim(),
				email: form.email.trim() || undefined,
				password: form.password,
				roles: form.roles
			});
			creating = false;
			goto(`/admin/users/${made.id}`);
		} catch (e) {
			formError = message(e);
		} finally {
			saving = false;
		}
	}

	function message(e) {
		const code = e.body?.error;
		if (code === 'username_already_used') return 'That username is taken.';
		if (code === 'email_already_used') return 'That email already has an account.';
		if (e.body?.detail) return e.body.detail;
		return e.message ?? 'Could not save.';
	}

	/** @param {string} iso */
	function day(iso) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	const roleLabels = { ROLE_ADMIN: 'Administrator', ROLE_MODERATOR: 'Moderator' };
</script>

<svelte:head><title>Users — Admin — Feelm</title></svelte:head>

<header class="masthead">
	<div>
		<span class="eyebrow"><Icon name="users" size={14} />People</span>
		<h1 class="display">Users</h1>
	</div>
	{#if session.isAdmin}
		<button type="button" class="btn btn-primary btn-sm" onclick={openCreate}>
			<Icon name="plus" size={14} />New account
		</button>
	{/if}
</header>

<Toolbar
	{term}
	onterm={(value) => set('q', value)}
	placeholder="Search by handle, name or email…"
	filters={[
		{ key: 'role', label: 'Role', value: role, options: roleOptions },
		{ key: 'status', label: 'Status', value: status, options: statusOptions }
	]}
	onfilter={set}
	total={result.total}
	noun="account"
	busy={loading}
/>

{#if error}
	<p class="error">{error}</p>
{/if}

<DataTable
	{columns}
	rows={result.items}
	{sort}
	onsort={(key) => set('sort', key)}
	{loading}
	empty="No accounts match that."
>
	{#snippet row(user, column)}
		{#if column.key === 'user'}
			<a class="who" href="/admin/users/{user.id}">
				<Avatar {user} size={30} />
				<span class="names">
					<strong>{user.name}</strong>
					<span class="faint">@{user.username}</span>
				</span>
			</a>
		{:else if column.key === 'email'}
			{#if user.email}
				<span class="mail" class:unverified={!user.emailVerified}>
					{user.email}
					{#if user.emailVerified}<Icon name="check" size={13} label="Verified" />{/if}
				</span>
			{:else}
				<span class="faint">—</span>
			{/if}
		{:else if column.key === 'roles'}
			{#if user.deletedAt}
				<span class="chip gone">Deleted</span>
			{:else if user.roles.length === 0}
				<span class="faint">User</span>
			{:else}
				<span class="roles">
					{#each user.roles as name (name)}
						<span class="chip chip-accent">{roleLabels[name] ?? name}</span>
					{/each}
				</span>
			{/if}
		{:else if column.key === 'entries'}
			<span class="num">{user.stats.entries.toLocaleString()}</span>
		{:else if column.key === 'reviews'}
			<span class="num">{user.stats.reviews.toLocaleString()}</span>
		{:else if column.key === 'joined'}
			<span class="num faint">{day(user.createdAt)}</span>
		{:else if column.key === 'actions'}
			<div class="actions">
				{#if busyId === user.id}
					<Spinner size={14} />
				{:else if user.deletedAt}
					{#if session.isAdmin}
						<button type="button" class="btn btn-sm" onclick={() => restore(user)}>
							<Icon name="refresh" size={13} />Restore
						</button>
					{/if}
				{:else}
					<a class="btn btn-sm btn-ghost" href="/admin/users/{user.id}">Edit</a>
					{#if session.isAdmin && user.id !== session.user?.id}
						<ConfirmAction
							label="Delete"
							prompt="Delete @{user.username}?"
							confirmLabel="Delete"
							onconfirm={() => remove(user)}
						/>
					{/if}
				{/if}
			</div>
		{/if}
	{/snippet}
</DataTable>

<Pager page={pageNumber} pages={result.pages} onpage={(n) => set('page', n)} />

<Modal open={creating} title="New account" onclose={() => (creating = false)}>
	<form onsubmit={create}>
		<label>
			<span class="eyebrow">Username</span>
			<input class="field" bind:value={form.username} autocomplete="off" spellcheck="false" />
		</label>

		<label>
			<span class="eyebrow">Display name</span>
			<input class="field" bind:value={form.name} autocomplete="off" />
		</label>

		<label>
			<span class="eyebrow">Email</span>
			<input class="field" type="email" bind:value={form.email} autocomplete="off" />
		</label>

		<label>
			<span class="eyebrow">Password</span>
			<input class="field" type="password" bind:value={form.password} autocomplete="new-password" />
			<span class="hint faint">At least 8 characters. They can change it afterwards.</span>
		</label>

		<fieldset>
			<legend class="eyebrow">Roles</legend>
			{#each Object.entries(roleLabels) as [value, label] (value)}
				<label class="check">
					<input type="checkbox" bind:group={form.roles} {value} />
					{label}
				</label>
			{/each}
		</fieldset>

		{#if formError}<p class="error">{formError}</p>{/if}

		<div class="foot">
			<button type="button" class="btn" onclick={() => (creating = false)}>Cancel</button>
			<button type="submit" class="btn btn-primary" disabled={saving || !form.username.trim()}>
				{saving ? 'Creating…' : 'Create account'}
			</button>
		</div>
	</form>
</Modal>

<style>
	.masthead {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1.5rem;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--brand);
	}

	h1 {
		font-size: clamp(1.8rem, 5vw, 2.6rem);
		margin: 0.3rem 0 0;
	}

	.error {
		margin: 0 0 1rem;
		color: var(--danger);
		font-size: 0.88rem;
	}

	/* Cells -------------------------------------------------------------- */

	.who {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		min-width: 0;
	}

	.who:hover strong {
		color: var(--brand);
	}

	.names {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.25;
	}

	.names span {
		font-size: 0.8rem;
	}

	.mail {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.85rem;
		color: var(--ok);
	}

	.mail.unverified {
		color: var(--muted);
	}

	.roles {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.chip.gone {
		border-color: color-mix(in srgb, var(--danger) 40%, transparent);
		color: var(--danger);
	}

	.num {
		font-variant-numeric: tabular-nums;
		font-size: 0.85rem;
	}

	.actions {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	/* Create form -------------------------------------------------------- */

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
		font-size: 0.78rem;
	}

	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem;
		padding: 0;
		border: 0;
	}

	legend {
		padding: 0 0 0.4rem;
	}

	.check {
		flex-direction: row;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
	}

	.foot {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding-top: 0.4rem;
	}
</style>
