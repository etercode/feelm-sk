<script>
	import { goto } from '$app/navigation';
	import AuthShell from '$lib/components/AuthShell.svelte';
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

<svelte:head><title>Sign in — Feelm</title></svelte:head>

<AuthShell
	title="Welcome back"
	intro="Pick up your shelves, your scores and the reviews you keep rewriting."
>
	<form onsubmit={submit}>
		<label>
			<span class="eyebrow">Username</span>
			<input class="field" bind:value={login} placeholder="kaan" autocomplete="username" />
		</label>

		<label>
			<span class="eyebrow">Password</span>
			<input
				class="field"
				type="password"
				bind:value={password}
				autocomplete="current-password"
			/>
		</label>

		{#if error}<p class="error">{error}</p>{/if}

		<button type="submit" class="btn btn-primary wide" disabled={busy}>
			{busy ? 'Signing in…' : 'Sign in'}
		</button>

		<button type="button" class="btn wide ghost" disabled={busy} onclick={demo}>
			Try demo (kaan)
		</button>
	</form>

	<p class="alt muted">
		No account? <a href="/register">Create one</a>
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
		color: var(--brass);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
