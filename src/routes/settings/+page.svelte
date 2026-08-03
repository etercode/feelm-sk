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
	import { i18n, t } from '$lib/i18n/index.svelte.js';
	import { LOCALES } from '$lib/i18n/locales.js';
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
			pictureError = t('settings.notAnImage');
		} else if (file.size > 8 * 1024 * 1024) {
			pictureError = t('settings.tooBig');
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
			pictureError = message(error, t('settings.uploadFailed'));
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
			pictureError = message(error, t('settings.removeFailed'));
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
			profileError = t('settings.nameRequired');
			return;
		}

		savingProfile = true;
		profileError = null;
		profileSaved = false;
		try {
			session.applyUser(await api.updateProfile(profile));
			profileSaved = true;
		} catch (error) {
			profileError = message(error, t('settings.profileFailed'));
		} finally {
			savingProfile = false;
		}
	}

	/* ---- language and timezone ------------------------------------------
	 *
	 * The dropdowns apply immediately, before anything is sent: the page you
	 * are reading is the preview, and waiting on a round trip to find out what
	 * Azerbaijani looks like would be a strange way to choose a language.
	 * Saving is what makes the choice follow the account to the next device;
	 * without it the cookie still remembers, on this browser.
	 */

	let savingRegion = $state(false);
	let regionError = $state(null);
	let regionSaved = $state(false);

	/**
	 * Every zone the runtime knows, grouped by the first part of the name.
	 *
	 * `Intl.supportedValuesOf` rather than a list of our own: the tz database
	 * is updated by the platform several times a year, and a hardcoded subset
	 * would be a release of ours every time a country changed its mind about
	 * daylight saving. The fallback is for a runtime old enough not to have it,
	 * where the two entries that matter are the one they are on and UTC.
	 */
	let zoneGroups = $derived.by(() => {
		let zones;
		try {
			zones = Intl.supportedValuesOf('timeZone');
		} catch {
			zones = [...new Set(['UTC', i18n.timezone, i18n.guessTimezone()])];
		}

		/** @type {Map<string, string[]>} */
		const groups = new Map();
		for (const zone of zones) {
			// "Asia/Baku" files under Asia; "UTC" has no slash and files alone.
			const area = zone.includes('/') ? zone.slice(0, zone.indexOf('/')) : 'UTC';
			if (!groups.has(area)) groups.set(area, []);
			groups.get(area).push(zone);
		}

		return [...groups];
	});

	/** The clock in the chosen zone, so a wrong guess is visible rather than filed. */
	let nowInZone = $derived.by(() => {
		try {
			return new Intl.DateTimeFormat(i18n.tag, {
				timeZone: i18n.timezone,
				hour: '2-digit',
				minute: '2-digit',
				weekday: 'short'
			}).format(new Date());
		} catch {
			return '—';
		}
	});

	/** @param {string} locale */
	function pickLanguage(locale) {
		i18n.choose(locale);
		regionSaved = false;
		regionError = null;
	}

	/** @param {string} zone */
	function pickZone(zone) {
		i18n.choose(i18n.locale, zone);
		regionSaved = false;
		regionError = null;
	}

	async function saveRegion(event) {
		event.preventDefault();
		savingRegion = true;
		regionError = null;
		regionSaved = false;

		try {
			session.applyUser(
				await api.updatePreferences({ locale: i18n.locale, timezone: i18n.timezone })
			);
			regionSaved = true;
		} catch (error) {
			regionError = message(error, t('settings.preferencesFailed'));
		} finally {
			savingRegion = false;
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
			passwordError = t('settings.passwordShort');
			return;
		}
		if (passwords.next !== passwords.confirm) {
			passwordError = t('settings.passwordMismatch');
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
					? t('settings.wrongPassword')
					: message(error, t('settings.passwordFailed'));
		} finally {
			savingPassword = false;
		}
	}

	/** @param {unknown} error @param {string} fallback */
	function message(error, fallback) {
		if (!(error instanceof ApiError)) return fallback;

		return (
			{
				file_too_large: t('settings.fileTooLarge'),
				unsupported_type: t('settings.unsupportedType'),
				unreadable_image: t('settings.unreadableImage'),
				image_too_large: t('settings.imageTooLarge'),
				password_unchanged: t('settings.passwordUnchanged')
			}[error.body?.error] ?? fallback
		);
	}
</script>

<svelte:head><title>{t('settings.title')} — Feelm</title></svelte:head>

<div class="frame page">
	{#if !ready || !session.user}
		<p class="muted loading"><Spinner size={16} /> {t('settings.loadingAccount')}</p>
	{:else}
		<header class="masthead">
			<div>
				<span class="eyebrow">{t('settings.yourAccount')}</span>
				<h1 class="display">{t('settings.title')}</h1>
			</div>
			<a class="btn btn-sm" href="/u/{session.user.username}">
				{t('settings.viewProfile')}<Icon name="right" size={14} />
			</a>
		</header>

		<section class="card panel">
			<h2>{t('settings.picture')}</h2>
			<p class="muted note">{t('settings.pictureNote')}</p>

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
							{session.user.avatar ? t('settings.changePicture') : t('settings.uploadPicture')}
						</button>
						{#if session.user.avatar}
							<button
								type="button"
								class="btn btn-sm btn-ghost"
								disabled={uploading}
								onclick={removePicture}
							>
								{t('common.remove')}
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
				<h2>{t('settings.profile')}</h2>
				<p class="muted note">
					{t('settings.handleNote', { handle: `@${session.user.username}` })}
				</p>

				<form onsubmit={saveProfile}>
					<label>
						<span class="eyebrow">{t('auth.displayName')}</span>
						<input class="field" bind:value={profile.name} maxlength="100" />
					</label>

					<label>
						<span class="eyebrow">{t('auth.tagline')}</span>
						<input
							class="field"
							bind:value={profile.tagline}
							maxlength="255"
							placeholder={t('settings.taglinePlaceholder')}
						/>
					</label>

					<label>
						<span class="eyebrow">{t('settings.location')}</span>
						<input class="field" bind:value={profile.location} maxlength="120" />
					</label>

					<label>
						<span class="eyebrow">{t('settings.about')}</span>
						<textarea class="field" rows="4" bind:value={profile.bio} maxlength="2000"></textarea>
					</label>

					<div class="row-end">
						{#if profileError}<p class="error">{profileError}</p>{/if}
						{#if profileSaved}<p class="ok">{t('common.saved')}</p>{/if}
						<button type="submit" class="btn btn-primary" disabled={savingProfile}>
							{savingProfile ? t('common.saving') : t('settings.saveProfile')}
						</button>
					</div>
				</form>
			</section>
		{/if}

		<section class="card panel">
			<h2>{t('settings.region')}</h2>
			<p class="muted note">{t('settings.regionNote')}</p>

			<form onsubmit={saveRegion}>
				<label>
					<span class="eyebrow">{t('settings.language')}</span>
					<!--
						Each language names itself. Somebody hunting for Russian is
						looking for "Русский", and a list translated into whatever
						the site is currently set to is no help to the person most
						likely to be using it — the one who cannot read that.
					-->
					<select
						class="field"
						value={i18n.locale}
						onchange={(event) => pickLanguage(event.currentTarget.value)}
					>
						{#each LOCALES as language (language.code)}
							<option value={language.code}>{language.name}</option>
						{/each}
					</select>
				</label>

				<label>
					<span class="eyebrow">{t('settings.timezone')}</span>
					<select
						class="field"
						value={i18n.timezone}
						onchange={(event) => pickZone(event.currentTarget.value)}
					>
						{#each zoneGroups as [area, zones] (area)}
							<optgroup label={area}>
								{#each zones as zone (zone)}
									<option value={zone}>{zone.replaceAll('_', ' ')}</option>
								{/each}
							</optgroup>
						{/each}
					</select>
					<span class="faint hint">{t('settings.timezoneNote', { now: nowInZone })}</span>
				</label>

				<div class="row-end">
					<button
						type="button"
						class="btn btn-sm btn-ghost"
						onclick={() => pickZone(i18n.guessTimezone())}
					>
						{t('settings.useDeviceZone', { zone: i18n.guessTimezone() })}
					</button>
					{#if regionError}<p class="error">{regionError}</p>{/if}
					{#if regionSaved}<p class="ok">{t('common.saved')}</p>{/if}
					<button type="submit" class="btn btn-primary" disabled={savingRegion}>
						{savingRegion ? t('common.saving') : t('settings.savePreferences')}
					</button>
				</div>
			</form>
		</section>

		<section class="card panel">
			<h2>{t('settings.password')}</h2>
			<p class="muted note">{t('settings.passwordNote')}</p>

			<form onsubmit={savePassword}>
				<label>
					<span class="eyebrow">{t('settings.currentPassword')}</span>
					<input
						class="field"
						type="password"
						bind:value={passwords.current}
						autocomplete="current-password"
					/>
				</label>

				<label>
					<span class="eyebrow">{t('settings.newPassword')}</span>
					<input
						class="field"
						type="password"
						bind:value={passwords.next}
						autocomplete="new-password"
					/>
				</label>

				<label>
					<span class="eyebrow">{t('settings.repeatPassword')}</span>
					<input
						class="field"
						type="password"
						bind:value={passwords.confirm}
						autocomplete="new-password"
					/>
				</label>

				<div class="row-end">
					{#if passwordError}<p class="error">{passwordError}</p>{/if}
					{#if passwordSaved}<p class="ok">{t('settings.passwordChanged')}</p>{/if}
					<button type="submit" class="btn btn-primary" disabled={savingPassword}>
						{savingPassword ? t('settings.changing') : t('settings.changePassword')}
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

	/* The live clock under the zone picker. */
	.hint {
		font-size: 0.8rem;
	}

	/*
	 * "Use this device" is a shortcut, not the action — it pushes to the left
	 * so it does not sit next to Save looking like the other half of a pair.
	 */
	.row-end .btn-ghost {
		margin-right: auto;
	}
</style>
