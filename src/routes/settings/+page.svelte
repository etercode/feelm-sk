<!--
	Your own account: the picture, the profile, the password.

	Everything here is about you, so nothing on this page needs a username in
	the URL — it always edits whoever is signed in.
-->
<script>
	import { goto } from '$app/navigation';
	import * as api from '$lib/api/client.js';
	import { ApiError } from '$lib/api/client.js';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ImageCropper from '$lib/components/ImageCropper.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { session } from '$lib/state/session.svelte.js';

	let ready = $state(false);

	$effect(() => {
		session.hydrate().then(() => {
			ready = true;
			if (!session.user) goto('/login');
		});
	});

	/* ---- picture ---------------------------------------------------- */

	/** @type {File | null} */
	let picked = $state(null);
	let uploading = $state(false);
	let pictureError = $state(null);

	/** @type {HTMLInputElement | undefined} */
	let fileInput = $state();

	function choose(event) {
		const file = event.currentTarget.files?.[0];
		pictureError = null;
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			pictureError = 'That file is not an image.';
		} else if (file.size > 8 * 1024 * 1024) {
			pictureError = 'Pictures need to be under 8 MB.';
		} else {
			picked = file;
		}

		// Cleared so choosing the same file twice still fires a change.
		event.currentTarget.value = '';
	}

	/** @param {Blob} blob */
	async function upload(blob) {
		uploading = true;
		pictureError = null;
		try {
			session.applyUser(await api.uploadAvatar(blob));
			picked = null;
		} catch (error) {
			pictureError = message(error, 'Could not upload that picture.');
		} finally {
			uploading = false;
		}
	}

	async function removePicture() {
		uploading = true;
		pictureError = null;
		try {
			session.applyUser(await api.deleteAvatar());
		} catch (error) {
			pictureError = message(error, 'Could not remove the picture.');
		} finally {
			uploading = false;
		}
	}

	/* ---- profile ------------------------------------------------------ */

	let profile = $state(null);
	let savingProfile = $state(false);
	let profileError = $state(null);
	let profileSaved = $state(false);

	// Seeded once the signed-in user arrives, and left alone after that so
	// typing is never overwritten by a background refresh.
	$effect(() => {
		if (session.user && profile === null) {
			profile = {
				name: session.user.name ?? '',
				tagline: session.user.tagline ?? '',
				location: session.user.location ?? '',
				bio: session.user.bio ?? ''
			};
		}
	});

	async function saveProfile(event) {
		event.preventDefault();
		if (!profile.name.trim()) {
			profileError = 'A display name is required.';
			return;
		}

		savingProfile = true;
		profileError = null;
		profileSaved = false;
		try {
			session.applyUser(await api.updateProfile(profile));
			profileSaved = true;
		} catch (error) {
			profileError = message(error, 'Could not save your profile.');
		} finally {
			savingProfile = false;
		}
	}

	/* ---- password ----------------------------------------------------- */

	let passwords = $state({ current: '', next: '', confirm: '' });
	let savingPassword = $state(false);
	let passwordError = $state(null);
	let passwordSaved = $state(false);

	async function savePassword(event) {
		event.preventDefault();
		passwordError = null;
		passwordSaved = false;

		if (passwords.next.length < 8) {
			passwordError = 'The new password needs at least 8 characters.';
			return;
		}
		if (passwords.next !== passwords.confirm) {
			passwordError = 'The two new passwords do not match.';
			return;
		}

		savingPassword = true;
		try {
			await api.changePassword({
				currentPassword: passwords.current,
				newPassword: passwords.next
			});
			passwords = { current: '', next: '', confirm: '' };
			passwordSaved = true;
		} catch (error) {
			passwordError =
				error instanceof ApiError && error.status === 403
					? 'That is not your current password.'
					: message(error, 'Could not change your password.');
		} finally {
			savingPassword = false;
		}
	}

	/** @param {unknown} error @param {string} fallback */
	function message(error, fallback) {
		if (!(error instanceof ApiError)) return fallback;

		return (
			{
				file_too_large: 'That picture is too large.',
				unsupported_type: 'Use a JPEG, PNG or WebP.',
				unreadable_image: 'That file could not be read as an image.',
				image_too_large: 'That picture has too many pixels.',
				password_unchanged: 'That is the password you already have.'
			}[error.body?.error] ?? fallback
		);
	}
</script>

<svelte:head><title>Settings — Feelm</title></svelte:head>

<div class="frame page">
	{#if !ready || !session.user}
		<p class="muted loading"><Spinner size={16} /> Loading your account…</p>
	{:else}
		<header class="masthead">
			<div>
				<span class="eyebrow">Your account</span>
				<h1 class="display">Settings</h1>
			</div>
			<a class="btn btn-sm" href="/u/{session.user.username}">
				View profile<Icon name="right" size={14} />
			</a>
		</header>

		<section class="card panel">
			<h2>Picture</h2>
			<p class="muted note">
				Square works best. Without one you get your initials, which is a perfectly good
				answer.
			</p>

			{#if picked}
				<ImageCropper
					file={picked}
					busy={uploading}
					onsave={upload}
					oncancel={() => (picked = null)}
				/>
			{:else}
				<div class="picture">
					<Avatar user={session.user} size={96} ring />
					<div class="picture-actions">
						<button
							type="button"
							class="btn btn-sm"
							disabled={uploading}
							onclick={() => fileInput?.click()}
						>
							{session.user.avatar ? 'Change picture' : 'Upload a picture'}
						</button>
						{#if session.user.avatar}
							<button
								type="button"
								class="btn btn-sm btn-ghost"
								disabled={uploading}
								onclick={removePicture}
							>
								Remove
							</button>
						{/if}
					</div>
				</div>
			{/if}

			<input
				bind:this={fileInput}
				type="file"
				class="sr-only"
				accept="image/jpeg,image/png,image/webp"
				onchange={choose}
			/>

			{#if pictureError}<p class="error">{pictureError}</p>{/if}
		</section>

		{#if profile}
			<section class="card panel">
				<h2>Profile</h2>
				<p class="muted note">
					Your handle stays <strong>@{session.user.username}</strong> — people have links to it.
				</p>

				<form onsubmit={saveProfile}>
					<label>
						<span class="eyebrow">Display name</span>
						<input class="field" bind:value={profile.name} maxlength="100" />
					</label>

					<label>
						<span class="eyebrow">Tagline</span>
						<input
							class="field"
							bind:value={profile.tagline}
							maxlength="255"
							placeholder="One line under your name"
						/>
					</label>

					<label>
						<span class="eyebrow">Location</span>
						<input class="field" bind:value={profile.location} maxlength="120" />
					</label>

					<label>
						<span class="eyebrow">About</span>
						<textarea class="field" rows="4" bind:value={profile.bio} maxlength="2000"></textarea>
					</label>

					<div class="row-end">
						{#if profileError}<p class="error">{profileError}</p>{/if}
						{#if profileSaved}<p class="ok">Saved.</p>{/if}
						<button type="submit" class="btn btn-primary" disabled={savingProfile}>
							{savingProfile ? 'Saving…' : 'Save profile'}
						</button>
					</div>
				</form>
			</section>
		{/if}

		<section class="card panel">
			<h2>Password</h2>
			<p class="muted note">
				Your current password is required — a stolen session should not be enough to lock you
				out.
			</p>

			<form onsubmit={savePassword}>
				<label>
					<span class="eyebrow">Current password</span>
					<input
						class="field"
						type="password"
						bind:value={passwords.current}
						autocomplete="current-password"
					/>
				</label>

				<label>
					<span class="eyebrow">New password</span>
					<input
						class="field"
						type="password"
						bind:value={passwords.next}
						autocomplete="new-password"
					/>
				</label>

				<label>
					<span class="eyebrow">Repeat new password</span>
					<input
						class="field"
						type="password"
						bind:value={passwords.confirm}
						autocomplete="new-password"
					/>
				</label>

				<div class="row-end">
					{#if passwordError}<p class="error">{passwordError}</p>{/if}
					{#if passwordSaved}<p class="ok">Password changed.</p>{/if}
					<button type="submit" class="btn btn-primary" disabled={savingPassword}>
						{savingPassword ? 'Changing…' : 'Change password'}
					</button>
				</div>
			</form>
		</section>
	{/if}
</div>

<style>
	.page {
		padding-top: clamp(2rem, 5vw, 3.5rem);
		padding-bottom: 4rem;
		max-width: 48rem;
	}

	.loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 4rem 0;
	}

	.masthead {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1.5rem;
	}

	h1 {
		font-size: clamp(2rem, 6vw, 3rem);
		margin-top: 0.35rem;
	}

	.panel {
		padding: clamp(1.1rem, 3vw, 1.6rem);
		margin-bottom: 1.25rem;
	}

	h2 {
		font-size: 1.15rem;
	}

	.note {
		margin: 0.3rem 0 1.1rem;
		font-size: 0.88rem;
	}

	.picture {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		flex-wrap: wrap;
	}

	.picture-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
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
		line-height: 1.5;
	}

	.row-end {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.9rem;
		flex-wrap: wrap;
		margin-top: 0.3rem;
	}

	.error {
		margin: 0;
		color: var(--danger);
		font-size: 0.88rem;
	}

	.ok {
		margin: 0;
		color: var(--ok);
		font-size: 0.88rem;
	}
</style>
