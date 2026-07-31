<script>
	import { goto } from '$app/navigation';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import GoogleButton from '$lib/components/GoogleButton.svelte';
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
			error = 'The two passwords do not match.';
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

<svelte:head><title>Create an account — Feelm</title></svelte:head>

<AuthShell
	title="Start a log"
	intro="Rate what you finish, write the one review you stand behind, and follow people whose taste you trust."
>
	<form onsubmit={submit}>
		<label>
			<span class="eyebrow">Username</span>
			<input class="field" bind:value={username} placeholder="yourhandle" autocomplete="username" />
		</label>

		<label>
			<span class="eyebrow">Display name</span>
			<input class="field" bind:value={name} placeholder="Your name" autocomplete="name" />
		</label>

		<label>
			<span class="eyebrow">Email</span>
			<input
				class="field"
				type="email"
				bind:value={email}
				placeholder="you@example.com"
				autocomplete="email"
			/>
		</label>

		<label>
			<span class="eyebrow">Password</span>
			<input
				class="field"
				type="password"
				bind:value={password}
				placeholder="At least 8 characters"
				autocomplete="new-password"
			/>
		</label>

		<label>
			<span class="eyebrow">Repeat password</span>
			<input
				class="field"
				class:wrong={mismatch}
				type="password"
				bind:value={repeat}
				autocomplete="new-password"
				aria-invalid={mismatch}
			/>
			{#if mismatch}<span class="hint error">These do not match yet.</span>{/if}
		</label>

		<label>
			<span class="eyebrow">One line about your taste</span>
			<input class="field" bind:value={tagline} placeholder="Rewatcher. Slow games. Long books." />
		</label>

		{#if error}<p class="error">{error}</p>{/if}

		<button type="submit" class="btn btn-primary wide" disabled={busy || mismatch}>
			{busy ? 'Creating…' : 'Create account'}
		</button>
	</form>

	<GoogleButton label="signup_with" onerror={(message) => (error = message)} />

	<p class="alt muted">
		Already have one? <a href="/login">Sign in</a>
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
