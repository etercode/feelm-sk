<script>
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import { t } from '$lib/i18n/index.svelte.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';

	let { user, size = '' } = $props();

	let following = $derived(
		session.user ? library.isFollowing(session.user.id, user.id) : false
	);
	let isSelf = $derived(session.user?.id === user.id);

	function toggle() {
		if (!session.user) return goto('/login');
		library.toggleFollow(session.user.id, user.id);
	}
</script>

{#if !isSelf}
	<button type="button" class="btn {size} {following ? '' : 'btn-primary'}" onclick={toggle}>
		<Icon name={following ? 'check' : 'plus'} size={14} stroke={2.2} />
		{following ? t('follow.following') : t('follow.follow')}
	</button>
{/if}
