<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { GlassCard, GlassInfoCard, LoadingSpinner } from '@hominio/brand';
	import { createAuthClient } from '@hominio/auth';

	const authClient = createAuthClient();
	const session = authClient.useSession();

	// Hardcoded vibes list - can be expanded later
	const vibes = [
		{
			id: 'charles',
			name: 'Charles',
			role: 'Hotel Concierge',
			description: 'Charles Vibe: Menu, Wellness, Hotel-Services. Hominio can query this vibe for restaurant menus, spa bookings, and hotel concierge services.',
			color: 'from-[#45b8c8] to-[#2da6b4]', // Secondary brand color gradient
			avatar: '/brand/agents/charles.png'
		},
		{
			id: 'karl',
			name: 'Karl',
			role: 'Calendar Assistant',
			description: 'Karl Vibe: Calendar Operations. Hominio can query this vibe to create, edit, view, and delete calendar entries.',
			color: 'from-[#45b8c8] to-[#2da6b4]', // Secondary brand color gradient (same as Charles)
			avatar: '/brand/agents/karl.png'
		}
	];
	// Legacy alias for backward compatibility
	const agents = vibes;

	// Listen for actionSkill events and navigate to appropriate vibe page
	onMount(() => {
		const handleActionSkillEvent = (event: Event) => {
			const customEvent = event as CustomEvent;
			const { vibeId, agentId, skillId, args } = customEvent.detail;
			const effectiveVibeId = vibeId || agentId;
			
			// Navigate to the vibe page - it will handle the skill execution
			if (effectiveVibeId && (effectiveVibeId === 'charles' || effectiveVibeId === 'karl')) {
				console.log('[Me] Navigating to vibe page:', effectiveVibeId, 'for skill:', skillId);
				
				// Store pending actionSkill in sessionStorage in case event is missed during navigation
				try {
					sessionStorage.setItem('pendingActionSkill', JSON.stringify({
						vibeId: effectiveVibeId,
						agentId: effectiveVibeId, // Legacy support
						skillId,
						args: args || {}
					}));
				} catch (err) {
					console.warn('[Me] Failed to store pending actionSkill:', err);
				}
				
				goto(`/me/${effectiveVibeId}`);
			}
		};

		window.addEventListener('actionSkill', handleActionSkillEvent);

		return () => {
			window.removeEventListener('actionSkill', handleActionSkillEvent);
		};
	});

</script>

<div class="relative min-h-screen overflow-x-hidden bg-glass-gradient px-6 pt-[env(safe-area-inset-top)] pb-[calc(3.5rem+env(safe-area-inset-bottom))]">

	<div class="relative z-10 mb-8 text-center md:mb-12">
		<h1 class="mb-1 text-3xl font-bold tracking-tight text-slate-900 md:mb-2 md:text-4xl lg:text-5xl">Hominio Vibes</h1>
		<p class="text-sm font-normal text-slate-600 md:text-base">Hominio can intelligently query these vibes in the background. Just ask naturally - for example, "make a calendar entry" or "show me the menu".</p>
	</div>

	<!-- Vibes Grid -->
	<div class="grid relative z-10 gap-4 mx-auto mb-8 max-w-6xl md:gap-8 md:mb-12 md:grid-cols-2 lg:grid-cols-3">
		{#each vibes as vibe (vibe.id)}
		<GlassCard 
			lifted={true} 
			class="overflow-hidden relative p-4 md:p-8"
		>
				<!-- Gradient Background -->
				<div class="absolute inset-0 bg-gradient-to-br {vibe.color} opacity-5"></div>
				
				<!-- Mobile: Horizontal Layout -->
				<div class="flex relative flex-row items-start gap-3 md:hidden">
					<!-- Left: Avatar and Name -->
					<div class="flex-shrink-0 flex flex-col items-center">
						<img 
							src={vibe.avatar} 
							alt={vibe.name}
							class="w-12 h-12 rounded-full object-cover mb-1"
						/>
						<h2 class="text-sm font-bold text-slate-900 text-center">
							{vibe.name} Vibe
						</h2>
					</div>
					
					<!-- Right: Description -->
					<div class="flex-1 min-w-0">
						<div class="mb-1">
							<div class="inline-block rounded-full bg-gradient-to-r {vibe.color} px-2 py-0.5 text-xs font-semibold text-white">
								{vibe.role}
							</div>
						</div>
						<p class="text-xs leading-tight text-slate-600">
							{vibe.description}
						</p>
					</div>
				</div>

				<!-- Tablet/Desktop: Vertical Centered Layout -->
				<div class="hidden md:flex relative flex-col items-center text-center">
					<!-- Avatar -->
					<div class="mb-2">
						<img 
							src={vibe.avatar} 
							alt={vibe.name}
							class="w-16 h-16 rounded-full object-cover"
						/>
					</div>
					
					<!-- Name -->
					<h2 class="mb-2 text-2xl font-bold text-slate-900">
						{vibe.name} Vibe
					</h2>
					
					<!-- Role -->
					<div class="mb-4 inline-block rounded-full bg-gradient-to-r {vibe.color} px-4 py-1 text-sm font-semibold text-white">
						{vibe.role}
					</div>
					
					<!-- Description -->
					<p class="text-sm leading-relaxed text-slate-600">
						{vibe.description}
					</p>
				</div>
			</GlassCard>
		{/each}
	</div>
</div>
