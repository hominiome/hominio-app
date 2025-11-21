<script lang="ts">
	import { ErrorPage } from '@hominio/brand';
	import { page } from '$app/stores';

	const status = $derived($page.status || 500);
	const message = $derived($page.error?.message || 'Internal Server Error');
</script>

<ErrorPage {status} {message} />

