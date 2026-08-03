<!--
	"Continue with Google".

	Google renders the button itself, inside its own iframe — that is the deal
	with Identity Services, and it is why this cannot be an ordinary <button>
	styled to match. What comes back is a signed ID token, which goes straight
	to our API; the browser never sees a Google password and we never hold one.

	The whole thing is hidden when no client id is configured, so a checkout
	without one simply has password sign-in and no broken button.
-->
<script>
	import { goto } from '$app/navigation';
	import { GOOGLE_CLIENT_ID } from '$lib/config.js';
	import { i18n, t } from '$lib/i18n/index.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { theme } from '$lib/state/theme.svelte.js';

	/**
	 * @type {{
	 *   label?: 'signin_with' | 'signup_with' | 'continue_with',
	 *   onerror?: (message: string) => void
	 * }}
	 */
	let { label = 'signin_with', onerror = () => {} } = $props();

	const SCRIPT = 'https://accounts.google.com/gsi/client';

	/** @type {HTMLDivElement | undefined} */
	let holder = $state();
	let failed = $state(false);
	let busy = $state(false);

	$effect(() => {
		if (!GOOGLE_CLIENT_ID || !holder) return;

		let cancelled = false;

		load()
			.then(() => {
				if (cancelled || !holder) return;

				window.google.accounts.id.initialize({
					client_id: GOOGLE_CLIENT_ID,
					callback: received,
					// One Tap's automatic prompt is a separate decision; this is
					// just the button.
					auto_select: false,
					cancel_on_tap_outside: true
				});

				window.google.accounts.id.renderButton(holder, {
					/*
					 * Google draws its own text, in whatever language it decides —
					 * left alone it reads the browser's, so a Turkish site would
					 * show a Russian "Sign in with Google" to somebody who has
					 * chosen Turkish on a Russian machine. This makes the one
					 * control we do not render match the ones we do.
					 */
					locale: i18n.locale,
					theme: theme.resolved === 'dark' ? 'filled_black' : 'outline',
					size: 'large',
					shape: 'pill',
					text: label,
					width: holder.clientWidth || 320,
					logo_alignment: 'center'
				});
			})
			.catch(() => {
				if (!cancelled) failed = true;
			});

		return () => {
			cancelled = true;
		};
	});

	/** Loads Google's script once, however many buttons ask for it. */
	function load() {
		if (window.google?.accounts?.id) return Promise.resolve();

		const existing = document.querySelector(`script[src="${SCRIPT}"]`);
		if (existing) {
			return new Promise((resolve, reject) => {
				existing.addEventListener('load', resolve);
				existing.addEventListener('error', reject);
			});
		}

		return new Promise((resolve, reject) => {
			const tag = document.createElement('script');
			tag.src = SCRIPT;
			tag.async = true;
			tag.onload = resolve;
			tag.onerror = reject;
			document.head.append(tag);
		});
	}

	/** @param {{ credential?: string }} response */
	async function received(response) {
		if (!response?.credential) {
			onerror(t('auth.googleNothing'));
			return;
		}

		busy = true;
		const result = await session.signInWithGoogle(response.credential);
		busy = false;

		if (!result.ok) {
			onerror(result.error);
			return;
		}

		// A brand-new account has a handle it did not choose. That is the one
		// moment it can be changed, so go there rather than to the profile.
		goto(session.user?.handlePending ? '/welcome' : `/u/${session.user.username}`);
	}
</script>

{#if GOOGLE_CLIENT_ID}
	<div class="google" class:busy>
		<div class="divider"><span>{t('auth.googleOr')}</span></div>

		{#if failed}
			<p class="muted note">{t('auth.googleFailed')}</p>
		{:else}
			<div class="holder" bind:this={holder}></div>
		{/if}

		{#if busy}<p class="muted note">{t('auth.googleSigningIn')}</p>{/if}
	</div>
{/if}

<style>
	.google {
		margin-bottom: 1.25rem;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0.25rem 0 1rem;
		color: var(--faint);
		font-size: 0.8rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--line);
	}

	/* Google's iframe sets its own width; centre whatever it decides on. */
	.holder {
		display: flex;
		justify-content: center;
		min-height: 44px;
	}

	.busy .holder {
		opacity: 0.5;
		pointer-events: none;
	}

	.note {
		margin: 0.6rem 0 0;
		font-size: 0.82rem;
		text-align: center;
	}
</style>
