<!--
	Notification channels. Telegram is the only one so far.

	Lives under /admin/settings rather than being it: settings is a section with
	an index, and the next thing added — email, a webhook, whatever it is —
	should be a sibling of this page rather than a second panel bolted onto a
	page named after one vendor.

	The flow is built around the one thing about Telegram bots that catches
	everybody: a bot cannot open a conversation. It can only reply to a chat
	that has messaged it first, so asking for a chat id up front is asking
	somebody to go and find a number they have no way of knowing. Instead the
	page says what to do — message the bot — and then offers the chats that
	answered, by name.

	The token is write-only. It arrives as ••••1234 and the field is empty; type
	a new one to replace it, or use Remove to clear it. A blank field means
	"leave it alone", because a form that wipes a secret when you did not touch
	it is a trap.
-->
<script>
	import * as api from '$lib/api/client.js';
	import Icon from '$lib/components/Icon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { session } from '$lib/state/session.svelte.js';

	let state = $state(null);
	let loading = $state(true);
	let saving = $state(false);
	let note = $state(null);
	let error = $state(null);

	/** Typed in, never read back. Cleared the moment it is saved. */
	let token = $state('');
	let chats = $state([]);
	let looking = $state(false);

	$effect(() => {
		session.hydrate().then(() => {
			api
				.adminTelegram()
				.then((data) => (state = data))
				.catch((e) => (error = e.message))
				.finally(() => (loading = false));
		});
	});

	/** @param {Record<string, any>} patch */
	async function save(patch) {
		saving = true;
		note = null;
		error = null;

		try {
			state = await api.adminSaveTelegram(patch);
			token = '';
			note = 'Saved.';
		} catch (e) {
			error = e.message;
		} finally {
			saving = false;
		}
	}

	async function findChats() {
		looking = true;
		note = null;
		error = null;
		chats = [];

		try {
			const data = await api.adminTelegramChats();
			chats = data.chats ?? [];
			if (!chats.length) {
				error =
					data.error ??
					`No chat has messaged the bot yet. Open ${state?.bot ? '@' + state.bot : 'the bot'} in Telegram, send it /start, then press this again.`;
			}
		} catch (e) {
			error = e.message;
		} finally {
			looking = false;
		}
	}

	async function sendTest() {
		note = null;
		error = null;

		try {
			await api.adminTelegramTest();
			note = 'Test message sent — check the chat.';
		} catch (e) {
			error = e.body?.error ?? e.message;
		}
	}
</script>

<svelte:head><title>Notifications — Settings — Admin — Feelm</title></svelte:head>

<header class="masthead">
	<a class="back" href="/admin/settings"><Icon name="left" size={13} /> Settings</a>
	<h1 class="display">Notifications</h1>
	<p class="muted">Where background jobs report when they finish or fail.</p>
</header>

{#if loading}
	<p class="gate muted"><Spinner size={16} /> Loading settings…</p>
{:else if !state}
	<p class="error">{error ?? 'Could not load settings.'}</p>
{:else}
	<section class="panel card">
		<header class="head">
			<div>
				<h2>Telegram</h2>
				<p class="muted">
					Backups, the nightly catalog run, deploys and server errors, sent to a chat.
				</p>
			</div>
			<span class="status" class:ok={state.configured}>
				{state.configured ? 'Connected' : 'Not set up'}
			</span>
		</header>

		{#if note}<p class="ok-note">{note}</p>{/if}
		{#if error}<p class="error">{error}</p>{/if}

		<!-- 1. the bot ---------------------------------------------------- -->
		<div class="field">
			<label for="token">Bot token</label>
			<p class="hint">
				From BotFather.
				{#if state.tokenHint}
					Stored: <code>{state.tokenHint}</code>{#if state.bot}
						— <strong>@{state.bot}</strong>{/if}. Leave blank to keep it.
				{/if}
			</p>
			<div class="row">
				<input
					id="token"
					type="password"
					autocomplete="off"
					placeholder={state.tokenHint ? 'Type a new token to replace it' : '123456:ABC-DEF…'}
					bind:value={token}
				/>
				<button class="btn btn-sm" disabled={saving || !token.trim()} onclick={() => save({ token })}>
					Save token
				</button>
				{#if state.tokenHint}
					<button
						class="btn btn-sm btn-ghost danger"
						disabled={saving}
						onclick={() => save({ clearToken: true })}
					>
						Remove
					</button>
				{/if}
			</div>
		</div>

		<!-- 2. the chat ---------------------------------------------------- -->
		<div class="field">
			<label for="chat">Chat</label>
			<p class="hint">
				A bot cannot start a conversation. Open
				{#if state.bot}<strong>@{state.bot}</strong>{:else}the bot{/if} in Telegram, send it
				<code>/start</code>, then press Find chats. For a group, add the bot to it and send a
				message there.
			</p>
			<div class="row">
				<input id="chat" type="text" placeholder="-1001234567890" value={state.chat ?? ''} readonly />
				<button class="btn btn-sm" disabled={looking || !state.tokenHint} onclick={findChats}>
					{#if looking}<Spinner size={13} />{/if} Find chats
				</button>
			</div>

			{#if chats.length}
				<ul class="chats">
					{#each chats as chat (chat.id)}
						<li>
							<button class="chat" onclick={() => save({ chat: chat.id })}>
								<Icon name="users" size={14} />
								<span class="name">{chat.name}</span>
								<span class="faint">{chat.type} · {chat.id}</span>
								{#if state.chat === chat.id}<span class="chip">in use</span>{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- 3. what to send ------------------------------------------------ -->
		<div class="field">
			<label for="master">What to send</label>
			<label class="toggle">
				<input
					id="master"
					type="checkbox"
					checked={state.enabled}
					disabled={saving}
					onchange={(e) => save({ enabled: e.currentTarget.checked })}
				/>
				<span>Notifications on</span>
			</label>

			<div class="events" class:off={!state.enabled}>
				{#each Object.entries(state.events) as [key, event] (key)}
					<label class="toggle">
						<input
							type="checkbox"
							checked={event.on}
							disabled={saving || !state.enabled}
							onchange={(e) => save({ events: { [key]: e.currentTarget.checked } })}
						/>
						<span>{event.label}</span>
					</label>
				{/each}
			</div>
		</div>

		<div class="foot">
			<button class="btn btn-sm btn-primary" disabled={!state.configured} onclick={sendTest}>
				<Icon name="mail" size={14} /> Send test message
			</button>
			{#if !state.configured}
				<span class="faint">Set a token and a chat first.</span>
			{/if}
		</div>
	</section>
{/if}

<style>
	.masthead {
		margin-bottom: 1.5rem;
	}

	.masthead h1 {
		margin: 0.35rem 0 0;
		font-size: clamp(1.7rem, 3vw, 2.2rem);
	}

	.masthead p {
		margin: 0.3rem 0 0;
		font-size: 0.9rem;
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--muted);
		font-size: 0.82rem;
	}

	.back:hover {
		color: var(--ink);
	}

	.gate {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 4rem 0;
	}

	.panel {
		padding: 1.25rem 1.4rem 1.4rem;
		background: var(--surface);
		max-width: 46rem;
	}

	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--line);
	}

	.head h2 {
		margin: 0;
		font-size: 1.05rem;
	}

	.head p {
		margin: 0.3rem 0 0;
		font-size: 0.86rem;
		max-width: 46ch;
	}

	.status {
		flex: none;
		padding: 0.25rem 0.6rem;
		border-radius: 99px;
		background: var(--tint);
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status.ok {
		background: color-mix(in srgb, var(--ok) 16%, transparent);
		color: var(--ok);
	}

	.field {
		padding-top: 1.2rem;
	}

	.field > label {
		display: block;
		font-size: 0.82rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.hint {
		margin: 0 0 0.6rem;
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--muted);
		max-width: 58ch;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	input[type='text'],
	input[type='password'] {
		flex: 1;
		min-width: 12rem;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		background: var(--page);
		color: var(--ink);
		font: inherit;
		font-size: 0.86rem;
	}

	input:read-only {
		color: var(--muted);
	}

	input:focus-visible {
		border-color: var(--brand);
		outline: none;
	}

	.chats {
		list-style: none;
		margin: 0.6rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.chat {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		background: none;
		color: var(--ink);
		font: inherit;
		font-size: 0.85rem;
		text-align: left;
		cursor: pointer;
	}

	.chat:hover {
		border-color: var(--brand);
		background: var(--brand-soft);
	}

	.chat .name {
		font-weight: 600;
	}

	.chat .faint {
		margin-left: auto;
		font-size: 0.76rem;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.86rem;
		cursor: pointer;
	}

	.events {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin: 0.7rem 0 0 1.4rem;
		padding-left: 0.8rem;
		border-left: 2px solid var(--line);
		transition: opacity 0.18s ease;
	}

	.events.off {
		opacity: 0.45;
	}

	.foot {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-top: 1.4rem;
		padding-top: 1.1rem;
		border-top: 1px solid var(--line);
		font-size: 0.8rem;
	}

	.error {
		margin: 0.8rem 0 0;
		color: var(--danger);
		font-size: 0.85rem;
	}

	.ok-note {
		margin: 0.8rem 0 0;
		color: var(--ok);
		font-size: 0.85rem;
	}

	.danger {
		color: var(--danger);
	}
</style>
