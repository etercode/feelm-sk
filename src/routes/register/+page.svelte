<script>
	import { goto } from '$app/navigation';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import GoogleButton from '$lib/components/GoogleButton.svelte';
	import { t } from '$lib/i18n/index.svelte.js';
	import { session } from '$lib/state/session.svelte.js';

	let username = $state('');
	let name = $state('');
	let email = $state('');
	let tagline = $state('');
	let password = $state('');
	let repeat = $state('');
	let error = $state(null);
	let busy = $state(false);

	// Only once they have typed something in it, so the form does not scold
	// somebody who is still filling it in.
	let mismatch = $derived(repeat.length > 0 && password !== repeat);

	async function submit(event) {
		event.preventDefault();

		if (password !== repeat) {
			error = t('auth.mismatchError');
			return;
		}

		busy = true;
		error = null;
		const result = await session.register({ username, name, email, tagline, password });
		busy = false;
		if (!result.ok) {
			error = result.error;
			return;
		}
		goto(`/u/${session.user.username}`);
	}
</script>

<svelte:head><title>{t('auth.registerTitle')} — Feelm</title></svelte:head>

<AuthShell
	title={t('auth.startLog')}
	intro={t('auth.startLogIntro')}
>
	<form onsubmit={submit}>
		<label>
			<span class="eyebrow">{t('auth.username')}</span>
			<input class="field" bind:value={username} placeholder="yourhandle" autocomplete="username" />
		</label>

		<label>
			<span class="eyebrow">{t('auth.displayName')}</span>
			<input class="field" bind:value={name} placeholder={t('auth.yourName')} autocomplete="name" />
		</label>

		<label>
			<span class="eyebrow">{t('auth.email')}</span>
			<input
				class="field"
				type="email"
				bind:value={email}
				placeholder="you@example.com"
				autocomplete="email"
			/>
		</label>

		<label>
			<span class="eyebrow">{t('auth.password')}</span>
			<input
				class="field"
				type="password"
				bind:value={password}
				placeholder={t('auth.passwordHint')}
				autocomplete="new-password"
			/>
		</label>

		<label>
			<span class="eyebrow">{t('auth.repeatPassword')}</span>
			<input
				class="field"
				class:wrong={mismatch}
				type="password"
				bind:value={repeat}
				autocomplete="new-password"
				aria-invalid={mismatch}
			/>
			{#if mismatch}<span class="hint error">{t('auth.mismatch')}</span>{/if}
		</label>

		<label>
			<span class="eyebrow">{t('auth.tagline')}</span>
			<input class="field" bind:value={tagline} placeholder={t('auth.taglinePlaceholder')} />
		</label>

		{#if error}<p class="error">{error}</p>{/if}

		<button type="submit" class="btn btn-primary wide" disabled={busy || mismatch}>
			{busy ? t('auth.creating') : t('auth.createAccount')}
		</button>
	</form>

	<GoogleButton label="signup_with" onerror={(message) => (error = message)} />

	<p class="alt muted">
		{t('auth.haveOne')} <a href="/login">{t('nav.signIn')}</a>
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

	.error {
		margin: 0;
		color: var(--danger);
		font-size: 0.88rem;
	}

	.hint {
		font-size: 0.8rem;
	}

	.field.wrong {
		border-color: var(--danger);
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
