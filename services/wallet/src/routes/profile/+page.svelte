<script lang="ts">
	import { onMount } from 'svelte';
	import { createAuthClient } from '@hominio/auth';
	import { goto } from '$app/navigation';
	import type { Capability, CapabilityRequest } from '@hominio/caps';

	const authClient = createAuthClient();
	const session = authClient.useSession();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let capabilities = $state<Capability[]>([]);
	let requests = $state<CapabilityRequest[]>([]);
	let activeTab = $state<'granted' | 'pending'>('granted');
	let dataLoaded = $state(false);

	$effect(() => {
		// Handle session state changes
		if ($session.isPending) {
			// Still loading session
			return;
		}
		
		if (!$session.data?.user) {
			// Not authenticated - redirect to sign in
			loading = false;
			goto('/?callback=' + encodeURIComponent(window.location.href));
			return;
		}
		
		// User is authenticated - load data if not already loaded
		if (!dataLoaded) {
			loading = true;
			Promise.all([loadCapabilities(), loadRequests()])
				.catch((err) => {
					console.error('[profile] Error loading data:', err);
					error = err instanceof Error ? err.message : 'Failed to load profile data';
				})
				.finally(() => {
					loading = false;
					dataLoaded = true;
				});
		}
	});

	async function loadCapabilities() {
		if (!$session.data?.user) {
			console.log('[profile] Cannot load capabilities: no user session');
			return;
		}
		
		try {
			console.log('[profile] Loading capabilities...');
			const response = await fetch('/api/auth/capabilities', {
				credentials: 'include',
			});
			console.log('[profile] Capabilities response status:', response.status);
			if (!response.ok) {
				const errorText = await response.text();
				console.error('[profile] Capabilities error response:', errorText);
				throw new Error(`Failed to load capabilities: ${response.status} ${errorText}`);
			}
			const data = await response.json();
			console.log('[profile] Capabilities loaded:', data.capabilities?.length || 0);
			capabilities = data.capabilities || [];
		} catch (err) {
			console.error('[profile] Error loading capabilities:', err);
			error = err instanceof Error ? err.message : 'Failed to load capabilities';
		}
	}

	async function loadRequests() {
		if (!$session.data?.user) {
			console.log('[profile] Cannot load requests: no user session');
			return;
		}
		
		try {
			console.log('[profile] Loading requests...');
			const response = await fetch('/api/auth/capabilities/requests?status=pending', {
				credentials: 'include',
			});
			console.log('[profile] Requests response status:', response.status);
			if (!response.ok) {
				const errorText = await response.text();
				console.error('[profile] Requests error response:', errorText);
				throw new Error(`Failed to load requests: ${response.status} ${errorText}`);
			}
			const data = await response.json();
			console.log('[profile] Requests loaded:', data.requests?.length || 0);
			requests = data.requests || [];
		} catch (err) {
			console.error('[profile] Error loading requests:', err);
			// Don't override error if capabilities already set one
			if (!error) {
				error = err instanceof Error ? err.message : 'Failed to load requests';
			}
		}
	}

	async function revokeCapability(capabilityId: string) {
		try {
			const response = await fetch(`/api/auth/capabilities/${capabilityId}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			if (!response.ok) {
				throw new Error('Failed to revoke capability');
			}
			// Reload capabilities
			await loadCapabilities();
		} catch (err) {
			console.error('Error revoking capability:', err);
			error = err instanceof Error ? err.message : 'Failed to revoke capability';
		}
	}

</script>

<div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
	<div class="mx-auto max-w-4xl">
		{#if loading || $session.isPending}
			<div class="flex items-center justify-center py-12">
				<div class="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-cyan-400"></div>
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-500/20 p-4 text-red-400">{error}</div>
		{:else if $session.data?.user}
			<h1 class="mb-8 text-4xl font-bold text-white">Profile</h1>
			
			<!-- Profile Section -->
			<div class="mb-8 rounded-lg border border-white/10 bg-white/5 p-8">
				<div class="flex flex-col items-center gap-6 md:flex-row md:items-start">
					<!-- Profile Image -->
					{#if $session.data.user.image}
						<img
							src={$session.data.user.image}
							alt={$session.data.user.name || 'Profile'}
							class="h-32 w-32 rounded-full border-2 border-white/20 object-cover"
						/>
					{:else}
						<div class="flex h-32 w-32 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 text-4xl font-bold text-white">
							{($session.data.user.name || $session.data.user.email || 'U')[0].toUpperCase()}
						</div>
					{/if}

					<!-- User Info -->
					<div class="flex-1 text-center md:text-left">
						<h2 class="mb-2 text-2xl font-bold text-white">
							{$session.data.user.name || 'No name'}
						</h2>
						<div class="mb-4 space-y-2">
							<div class="flex items-center justify-center gap-2 md:justify-start">
								<svg
									class="h-5 w-5 text-white/60"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									/>
								</svg>
								<span class="text-white/80">{$session.data.user.email || 'No email'}</span>
							</div>
							<div class="flex items-center justify-center gap-2 md:justify-start">
								<svg
									class="h-5 w-5 text-white/60"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
									/>
								</svg>
								<span class="font-mono text-sm text-white/60">ID: {$session.data.user.id}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Capabilities Section -->
			<div class="mb-8">
				<h2 class="mb-6 text-2xl font-bold text-white">Capabilities</h2>

				<!-- Tabs -->
				<div class="mb-6 flex gap-4 border-b border-white/10">
					<button
						onclick={() => (activeTab = 'granted')}
						class="px-4 py-2 font-medium transition-colors {activeTab === 'granted'
							? 'border-b-2 border-cyan-400 text-cyan-400'
							: 'text-white/60 hover:text-white'}"
					>
						My Capabilities ({capabilities.length})
					</button>
					<button
						onclick={() => (activeTab = 'pending')}
						class="px-4 py-2 font-medium transition-colors {activeTab === 'pending'
							? 'border-b-2 border-cyan-400 text-cyan-400'
							: 'text-white/60 hover:text-white'}"
					>
						Pending Requests ({requests.length})
					</button>
				</div>

				{#if activeTab === 'granted'}
					<!-- My Capabilities Tab -->
					<div class="space-y-4">
						{#if capabilities.length === 0}
							<div class="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-white/60">
								No capabilities granted yet.
							</div>
						{:else}
							{#each capabilities as capability}
								<div class="rounded-lg border border-white/10 bg-white/5 p-6">
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<div class="mb-2 flex items-center gap-2">
												<span class="text-sm font-medium text-white/60">Principal:</span>
												<span class="text-white">{capability.principal}</span>
											</div>
											<div class="mb-2 flex items-center gap-2">
												<span class="text-sm font-medium text-white/60">Resource:</span>
												<span class="text-white">
													{capability.resource.type}:{capability.resource.namespace}
													{capability.resource.id ? `:${capability.resource.id}` : ''}
													{capability.resource.device_id ? ` (device: ${capability.resource.device_id})` : ''}
												</span>
											</div>
											<div class="mb-2 flex items-center gap-2">
												<span class="text-sm font-medium text-white/60">Actions:</span>
												<span class="text-white">{capability.actions.join(', ')}</span>
											</div>
											<div class="text-sm text-white/40">
												Granted: {new Date(capability.created_at).toLocaleString()}
											</div>
										</div>
										<button
											onclick={() => revokeCapability(capability.id)}
											class="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
										>
											Revoke
										</button>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				{:else}
					<!-- Pending Requests Tab -->
					<div class="space-y-4">
						{#if requests.length === 0}
							<div class="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-white/60">
								No pending requests.
							</div>
						{:else}
							{#each requests as request}
								<div class="rounded-lg border border-white/10 bg-white/5 p-6">
									<div class="mb-4">
										<div class="mb-2 flex items-center gap-2">
											<span class="text-sm font-medium text-white/60">Requester:</span>
											<span class="text-white">{request.requester_principal}</span>
										</div>
										<div class="mb-2 flex items-center gap-2">
											<span class="text-sm font-medium text-white/60">Resource:</span>
											<span class="text-white">
												{request.resource.type}:{request.resource.namespace}
												{request.resource.id ? `:${request.resource.id}` : ''}
												{request.resource.device_id ? ` (device: ${request.resource.device_id})` : ''}
											</span>
										</div>
										<div class="mb-2 flex items-center gap-2">
											<span class="text-sm font-medium text-white/60">Actions:</span>
											<span class="text-white">{request.actions.join(', ')}</span>
										</div>
										{#if request.message}
											<div class="mb-2 text-sm text-white/60">
												<strong>Message:</strong> {request.message}
											</div>
										{/if}
										<div class="text-sm text-white/40">
											Requested: {new Date(request.created_at).toLocaleString()}
										</div>
									</div>
									<div class="flex gap-3">
										<a
											href="/capabilities/requests/{request.id}"
											class="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30"
										>
											Review Request
										</a>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

