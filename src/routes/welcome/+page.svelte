<!--
	The one screen a Google-created account sees before anything else.

	Google gives us a name and an address but no handle, so one was generated
	from the address. This is the only chance to change it: after this it is in
	every link to the profile, and sign-up has never offered to change one.

	Anybody who already has a handle is sent on — including somebody who lands
	here by typing the URL.
-->
<script>
	import { goto } from '$app/navigation';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { t } from '$lib/i18n/index.svelte.js';
	import { session } from '$lib/state/session.svelte.js';

	let ready = $state(false);
	let handle = $state('');
	let busy = $state(false);
	let error = $state(null);

	$effect(() => {
		session.hydrate().then(() => {
			ready = true;
			if (!session.user) return goto('/login');
			if (!session.user.handlePending) return goto(`/u/${session.user.username}`);
			handle ||= session.user.username ?? '';
		});
	});

	/** What the profile URL will look like, updating as they type. */
	let preview = $derived(handle.trim() || session.user?.username || '');

	async function save(event) {
		event.preventDefault();
		busy = true;
		error = null;

		const result = await session.chooseUsername(handle);
		busy = false;

		if (!result.ok) {
			error = result.error;
			return;
		}

		goto(`/u/${session.user.username}`);
	}

	async function keep() {
		handle = session.user?.username ?? '';
		await save(new Event('submit'));
	}
</script>

<svelte:head><title>{t('welcome.title')} — Feelm</title></svelte:head>

<div class="frame page">
	{#if !ready || !session.user}
		<p class="muted loading"><Spinner size={16} /> {t('welcome.moment')}</p>
	{:else}
		<div class="card panel">
			<div class="who">
				<Avatar user={session.user} size={64} ring />
				<div>
					<span class="eyebrow">{t('welcome.signedInAs')}</span>
					<p class="name">{session.user.name}</p>
				</div>
			</div>

			<h1 class="display">{t('welcome.title')}</h1>
			<p class="muted intro">{t('welcome.intro')}</p>

			<form onsubmit={save}>
				<label>
					<span class="eyebrow">{t('welcome.handle')}</span>
					<div class="entry">
						<span class="at">@</span>
						<input
							bind:value={handle}
							maxlength="180"
							autocomplete="off"
							autocapitalize="off"
							spellcheck="false"
						/>
					</div>
				</label>

				<p class="preview faint">feelm.org/u/{preview}</p>

				{#if error}<p class="error">{error}</p>{/if}

				<div class="actions">
					<button type="button" class="btn" disabled={busy} onclick={keep}>
						{t('welcome.keep', { username: session.user.username })}
					</button>
					<button type="submit" class="btn btn-primary" disabled={busy || !handle.trim()}>
						{busy ? t('common.saving') : t('welcome.confirm')}<Icon name="right" size={14} />
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 34rem;
		padding-top: clamp(2rem, 8vw, 5rem);
		padding-bottom: 4rem;
	}

	.loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 4rem 0;
	}

	.panel {
		padding: clamp(1.25rem, 4vw, 2rem);
	}

	.who {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding-bottom: 1.5rem;
	}

	.name {
		margin: 0.15rem 0 0;
		font-weight: 600;
	}

	h1 {
		font-size: clamp(1.8rem, 5vw, 2.4rem);
	}

	.intro {
		margin: 0.5rem 0 1.5rem;
		font-size: 0.94rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.entry {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.entry:focus-within {
		border-color: color-mix(in srgb, var(--brand) 60%, transparent);
	}

	.at {
		color: var(--faint);
	}

	.entry input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: none;
		outline: none;
	}

	.preview {
		margin: 0.5rem 0 0;
		font-size: 0.84rem;
		word-break: break-all;
	}

	.error {
		margin: 0.6rem 0 0;
		color: var(--danger);
		font-size: 0.88rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1.5rem;
		flex-wrap: wrap;
	}
</style>
