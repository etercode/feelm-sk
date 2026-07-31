<!--
	One account, in full.

	Split into panels that each save on their own, so a mistyped email cannot
	roll back a role change made in the same sitting. The PATCH is genuinely
	partial — each panel sends only its own fields — which is why the endpoint
	is a PATCH and /api/me is not.

	What a moderator may see and what they may change are different questions:
	they get the whole page, and the parts only an administrator may touch are
	disabled rather than hidden. Knowing a control exists is not the same as
	being able to use it, and hiding it just makes the refusal confusing.
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as api from '$lib/api/client.js';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import ConfirmAction from '$lib/components/admin/ConfirmAction.svelte';
	import StatTiles from '$lib/components/admin/StatTiles.svelte';
	import { session } from '$lib/state/session.svelte.js';

	let id = $derived(Number(page.params.id));

	let user = $state(null);
	let loading = $state(true);
	let loadError = $state(null);

	$effect(() => {
		const wanted = id;
		let live = true;
		loading = true;

		api
			.adminUser(wanted)
			.then((data) => {
				if (!live) return;
				user = data;
				profile = {
					username: data.username,
					name: data.name,
					tagline: data.tagline ?? '',
					location: data.location ?? '',
					bio: data.bio ?? ''
				};
				account = { email: data.email ?? '', emailVerified: data.emailVerified };
				roles = [...data.roles];
				loadError = null;
			})
			.catch((e) => {
				if (live) loadError = e.status === 404 ? 'No such account.' : e.message;
			})
			.finally(() => {
				if (live) loading = false;
			});

		return () => {
			live = false;
		};
	});

	/* ---- panels ---- */

	let profile = $state({ username: '', name: '', tagline: '', location: '', bio: '' });
	let account = $state({ email: '', emailVerified: false });
	let roles = $state([]);
	let password = $state('');

	let saving = $state(null);
	let saved = $state(null);
	let error = $state(null);

	/** Every panel saves the same way: name it, send it, say so. */
	async function save(panel, body) {
		saving = panel;
		error = null;
		saved = null;

		try {
			user = await api.adminUpdateUser(id, body);
			roles = [...user.roles];
			saved = panel;
			setTimeout(() => saved === panel && (saved = null), 2500);
		} catch (e) {
			error = message(e);
		} finally {
			saving = null;
		}
	}

	function saveProfile(event) {
		event.preventDefault();
		return save('profile', {
			username: profile.username.trim(),
			name: profile.name.trim(),
			tagline: profile.tagline,
			location: profile.location,
			bio: profile.bio
		});
	}

	function saveAccount(event) {
		event.preventDefault();
		return save('account', {
			email: account.email.trim(),
			emailVerified: account.emailVerified
		});
	}

	function saveRoles(event) {
		event.preventDefault();
		return save('roles', { roles });
	}

	async function savePassword(event) {
		event.preventDefault();
		saving = 'password';
		error = null;
		saved = null;

		try {
			await api.adminSetPassword(id, password);
			password = '';
			saved = 'password';
			setTimeout(() => saved === 'password' && (saved = null), 2500);
		} catch (e) {
			error = message(e);
		} finally {
			saving = null;
		}
	}

	async function removeAvatar() {
		saving = 'avatar';
		try {
			user = await api.adminDeleteAvatar(id);
		} catch (e) {
			error = message(e);
		} finally {
			saving = null;
		}
	}

	async function remove() {
		try {
			await api.adminDeleteUser(id);
			goto('/admin/users');
		} catch (e) {
			error = message(e);
		}
	}

	async function restore() {
		saving = 'restore';
		try {
			user = await api.adminRestoreUser(id);
		} catch (e) {
			error = message(e);
		} finally {
			saving = null;
		}
	}

	function message(e) {
		const code = e.body?.error;
		const known = {
			username_already_used: 'That username is taken.',
			email_already_used: 'That email already has an account.',
			no_email_to_verify: 'Give them an address before marking it verified.',
			cannot_demote_self: 'You cannot remove your own administrator role.',
			cannot_delete_self: 'You cannot delete your own account.',
			roles_require_admin: 'Only an administrator can change roles.',
			already_deleted: 'That account is already deleted.',
			not_deleted: 'That account is not deleted.',
			name_required: 'A display name is required.',
			username_required: 'A username is required.'
		};
		if (code && known[code]) return known[code];
		if (e.body?.detail) return e.body.detail;
		return e.message ?? 'Could not save.';
	}

	const roleLabels = { ROLE_ADMIN: 'Administrator', ROLE_MODERATOR: 'Moderator' };

	let isSelf = $derived(user?.id === session.user?.id);

	let tiles = $derived(
		user
			? [
					{ key: 'entries', label: 'Shelf', value: user.stats.entries, icon: 'bookmark' },
					{ key: 'reviews', label: 'Reviews', value: user.stats.reviews, icon: 'quote' },
					{ key: 'followers', label: 'Followers', value: user.stats.followers, icon: 'users' },
					{ key: 'following', label: 'Following', value: user.stats.following, icon: 'user' }
				]
			: []
	);

	/** @param {string|null} iso */
	function stamp(iso) {
		return iso ? new Date(iso).toLocaleString() : '—';
	}
</script>

<svelte:head><title>{user ? `@${user.username}` : 'Account'} — Admin — Feelm</title></svelte:head>

{#if loading && !user}
	<p class="gate muted"><Spinner size={16} /> Loading the account…</p>
{:else if loadError}
	<p class="error">{loadError}</p>
	<a class="btn btn-sm" href="/admin/users"><Icon name="left" size={14} />Back to users</a>
{:else if user}
	<a class="back faint" href="/admin/users"><Icon name="left" size={13} />Users</a>

	<header class="masthead">
		<div class="identity">
			<Avatar {user} size={56} ring />
			<div>
				<h1 class="display">{user.name}</h1>
				<p class="handle muted">
					@{user.username}
					{#if user.deletedAt}<span class="chip gone">Deleted</span>{/if}
					{#if isSelf}<span class="chip">You</span>{/if}
				</p>
			</div>
		</div>

		<a class="btn btn-sm" href="/u/{user.username}">
			View profile<Icon name="external" size={13} />
		</a>
	</header>

	<StatTiles {tiles} />

	{#if error}<p class="error">{error}</p>{/if}

	<div class="split">
		<section class="card panel">
			<h2 class="section">Profile</h2>
			<form onsubmit={saveProfile}>
				<label>
					<span class="eyebrow">Username</span>
					<input class="field" bind:value={profile.username} spellcheck="false" autocomplete="off" />
				</label>

				<label>
					<span class="eyebrow">Display name</span>
					<input class="field" bind:value={profile.name} autocomplete="off" />
				</label>

				<label>
					<span class="eyebrow">Tagline</span>
					<input class="field" bind:value={profile.tagline} autocomplete="off" />
				</label>

				<label>
					<span class="eyebrow">Location</span>
					<input class="field" bind:value={profile.location} autocomplete="off" />
				</label>

				<label>
					<span class="eyebrow">Bio</span>
					<textarea class="field" rows="3" bind:value={profile.bio}></textarea>
				</label>

				<div class="foot">
					{#if saved === 'profile'}<span class="ok">Saved.</span>{/if}
					<button type="submit" class="btn btn-primary btn-sm" disabled={saving === 'profile'}>
						{saving === 'profile' ? 'Saving…' : 'Save profile'}
					</button>
				</div>
			</form>
		</section>

		<div class="column">
			<section class="card panel">
				<h2 class="section">Email</h2>
				<form onsubmit={saveAccount}>
					<label>
						<span class="eyebrow">Address</span>
						<input class="field" type="email" bind:value={account.email} autocomplete="off" />
					</label>

					<label class="check">
						<input type="checkbox" bind:checked={account.emailVerified} />
						Verified
					</label>
					<p class="hint faint">
						An unverified address never links a Google sign-in to this account.
					</p>

					<div class="foot">
						{#if saved === 'account'}<span class="ok">Saved.</span>{/if}
						<button type="submit" class="btn btn-primary btn-sm" disabled={saving === 'account'}>
							{saving === 'account' ? 'Saving…' : 'Save email'}
						</button>
					</div>
				</form>
			</section>

			<section class="card panel">
				<h2 class="section"><Icon name="shield" size={15} />Roles</h2>
				<form onsubmit={saveRoles}>
					<fieldset disabled={!session.isAdmin}>
						{#each Object.entries(roleLabels) as [value, label] (value)}
							<label class="check">
								<input type="checkbox" bind:group={roles} {value} />
								{label}
							</label>
						{/each}
					</fieldset>

					{#if !session.isAdmin}
						<p class="hint faint">Only an administrator can change roles.</p>
					{:else if isSelf}
						<p class="hint faint">
							You cannot remove your own administrator role — that is the rule keeping somebody in
							this room.
						</p>
					{/if}

					<div class="foot">
						{#if saved === 'roles'}<span class="ok">Saved.</span>{/if}
						<button
							type="submit"
							class="btn btn-primary btn-sm"
							disabled={!session.isAdmin || saving === 'roles'}
						>
							{saving === 'roles' ? 'Saving…' : 'Save roles'}
						</button>
					</div>
				</form>
			</section>

			<section class="card panel">
				<h2 class="section"><Icon name="key" size={15} />Password</h2>
				<form onsubmit={savePassword}>
					<label>
						<span class="eyebrow">New password</span>
						<input
							class="field"
							type="password"
							bind:value={password}
							autocomplete="new-password"
							disabled={!session.isAdmin}
						/>
					</label>
					<p class="hint faint">
						{user.hasPassword
							? 'Setting one signs them out of every device.'
							: 'This account has no password yet — it signs in through Google.'}
					</p>

					<div class="foot">
						{#if saved === 'password'}<span class="ok">Set.</span>{/if}
						<button
							type="submit"
							class="btn btn-primary btn-sm"
							disabled={!session.isAdmin || saving === 'password' || password.length < 8}
						>
							{saving === 'password' ? 'Setting…' : 'Set password'}
						</button>
					</div>
				</form>
			</section>
		</div>
	</div>

	<section class="card panel">
		<h2 class="section">Record</h2>
		<dl class="meta">
			<div><dt>Created</dt><dd>{stamp(user.createdAt)}</dd></div>
			<div><dt>Last changed</dt><dd>{stamp(user.updatedAt)}</dd></div>
			<div><dt>Deleted</dt><dd>{stamp(user.deletedAt)}</dd></div>
			<div><dt>Handle pending</dt><dd>{user.handlePending ? 'Yes' : 'No'}</dd></div>
		</dl>
	</section>

	<section class="card panel danger-zone">
		<h2 class="section"><Icon name="warning" size={15} />Danger zone</h2>

		<div class="row-out">
			<div>
				<strong>Profile picture</strong>
				<p class="hint faint">Removes the uploaded portrait; initials are drawn instead.</p>
			</div>
			<ConfirmAction
				label="Remove picture"
				prompt="Remove it?"
				confirmLabel="Remove"
				icon="trash"
				busy={saving === 'avatar'}
				disabled={!user.avatar}
				onconfirm={removeAvatar}
			/>
		</div>

		{#if user.deletedAt}
			<div class="row-out">
				<div>
					<strong>Restore this account</strong>
					<p class="hint faint">
						Brings it back, if the handle and address are still free. Their shelf, reviews and
						follows were never touched.
					</p>
				</div>
				<button
					type="button"
					class="btn btn-sm"
					disabled={!session.isAdmin || saving === 'restore'}
					onclick={restore}
				>
					<Icon name="refresh" size={13} />Restore
				</button>
			</div>
		{:else}
			<div class="row-out">
				<div>
					<strong>Delete this account</strong>
					<p class="hint faint">
						A soft delete: the row stays and can be restored. They are signed out of every device
						immediately, and the handle @{user.username} becomes free for somebody else.
					</p>
				</div>
				<ConfirmAction
					label="Delete account"
					prompt="Type the handle to confirm:"
					confirmLabel="Delete"
					confirmText={user.username}
					small={false}
					disabled={!session.isAdmin || isSelf}
					onconfirm={remove}
				/>
			</div>
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
		align-items: center;
		gap: 0.9rem;
		min-width: 0;
	}

	h1 {
		font-size: clamp(1.6rem, 4.5vw, 2.3rem);
		margin: 0;
	}

	.handle {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
		margin: 0.25rem 0 0;
		font-size: 0.9rem;
	}

	.chip.gone {
		border-color: color-mix(in srgb, var(--danger) 40%, transparent);
		color: var(--danger);
	}

	.split {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		align-items: start;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.panel {
		padding: clamp(1.1rem, 3vw, 1.5rem);
		margin-bottom: 1rem;
	}

	.split .panel,
	.column .panel {
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

	textarea.field {
		resize: vertical;
		font: inherit;
	}

	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem;
		padding: 0;
		border: 0;
	}

	fieldset[disabled] {
		opacity: 0.55;
	}

	.check {
		flex-direction: row;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
	}

	.hint {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.45;
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.6rem;
		padding-top: 0.2rem;
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

	/* Record ------------------------------------------------------------- */

	.meta {
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
		font-variant-numeric: tabular-nums;
	}

	/* Danger zone -------------------------------------------------------- */

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
		padding: 0.9rem 0;
		border-top: 1px solid var(--line);
	}

	.row-out:first-of-type {
		border-top: 0;
		padding-top: 0;
	}

	.row-out > div {
		flex: 1 1 16rem;
		min-width: 0;
	}

	.row-out strong {
		font-size: 0.92rem;
	}

	.row-out .hint {
		margin-top: 0.2rem;
	}
</style>
