<script>
	import { goto } from '$app/navigation';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import GoogleButton from '$lib/components/GoogleButton.svelte';
	import { t } from '$lib/i18n/index.svelte.js';
	import { session } from '$lib/state/session.svelte.js';

	let login = $state('');
	let password = $state('');
	let error = $state(null);
	let busy = $state(false);

	async function submit(event) {
		event.preventDefault();
		busy = true;
		error = null;
		const result = await session.signIn(login, password);
		busy = false;
		if (!result.ok) {
			error = result.error;
			return;
		}
		goto(`/u/${session.user.username}`);
	}

	async function demo() {
		busy = true;
		error = null;
		const result = await session.signInAsDemo();
		busy = false;
		if (!result.ok) {
			error = result.error;
			return;
		}
		goto(`/u/${session.user.username}`);
	}
</script>

<svelte:head><title>{t('auth.signInTitle')} — Feelm</title></svelte:head>

<AuthShell
	title={t('auth.welcomeBack')}
	intro={t('auth.welcomeBackIntro')}
>
	<form onsubmit={submit}>
		<label>
			<span class="eyebrow">{t('auth.username')}</span>
			<input class="field" bind:value={login} placeholder="kaan" autocomplete="username" />
		</label>

		<label>
			<span class="eyebrow">{t('auth.password')}</span>
			<input
				class="field"
				type="password"
				bind:value={password}
				autocomplete="current-password"
			/>
		</label>

		{#if error}<p class="error">{error}</p>{/if}

		<button type="submit" class="btn btn-primary wide" disabled={busy}>
			{busy ? t('auth.signingIn') : t('nav.signIn')}
		</button>

		<button type="button" class="btn wide ghost" disabled={busy} onclick={demo}>
			{t('auth.tryDemo')}
		</button>
	</form>

	<GoogleButton label="signin_with" onerror={(message) => (error = message)} />

	<p class="alt muted">
		{t('auth.noAccount')} <a href="/register">{t('auth.createOne')}</a>
	</p>
</AuthShell>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		margin-bottom: 1.25rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.wide {
		width: 100%;
		margin-top: 0.4rem;
	}

	.ghost {
		background: transparent;
		border: 1px solid var(--line);
		color: var(--ink);
	}

	.error {
		margin: 0;
		color: var(--danger);
		font-size: 0.88rem;
	}

	.alt {
		margin: 0;
		font-size: 0.88rem;
	}

	.alt a {
		color: var(--brand);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
