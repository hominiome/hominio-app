<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { GlassCard, LoadingSpinner } from '@hominio/brand';
	import { createAuthClient } from '@hominio/auth';
	import { handleActionSkill, loadVibeConfig } from '@hominio/vibes';
	import { nanoid } from 'nanoid';
	import ActivityStreamItem from '$lib/components/ActivityStreamItem.svelte';

	const authClient = createAuthClient();
	const session = authClient.useSession();

	// Activity Stream State
	type ActivityItem = {
		id: string;
		timestamp: number;
		toolName: string;
		args: any;
		status: 'pending' | 'success' | 'error';
		result?: any;
		error?: string;
		isExpanded: boolean;
	};

	let activities = $state<ActivityItem[]>([]);
	let streamContainer: HTMLElement;

	// Auto-scroll to bottom when activities change
	$effect(() => {
		if (activities.length && streamContainer) {
			// Wait for DOM update
			tick().then(() => {
				window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
			});
		}
	});

	async function handleToolCall(toolName: string, args: any) {
		const id = nanoid();
		const timestamp = Date.now();
		
		// Create new activity item
		const newItem: ActivityItem = {
			id,
			timestamp,
			toolName,
			args,
			status: 'pending',
			isExpanded: true // Expand new item by default
		};

		// Collapse previous items
		activities = activities.map(item => ({
			...item,
			isExpanded: false
		}));

		// Add new item to bottom
		activities = [...activities, newItem];

		// Process the tool call
		if (toolName === 'actionSkill') {
			await processActionSkill(newItem);
		} else if (toolName === 'queryVibeContext') {
			// Just a log, mark as success immediately
			updateActivityStatus(id, 'success');
            // Auto-collapse context queries after a short delay so they don't take up space?
            // The user said "keep the 2nd last view as 'history collapsed'". 
            // Query items are small anyway.
		}
	}

	function updateActivityStatus(id: string, status: 'success' | 'error', result?: any, error?: string) {
		activities = activities.map(item => {
			if (item.id === id) {
				return { ...item, status, result, error };
			}
			return item;
		});
	}

	async function processActionSkill(item: ActivityItem) {
		try {
			const { vibeId, skillId, agentId, ...restArgs } = item.args;
			const effectiveVibeId = vibeId || agentId;
			
			if (!effectiveVibeId || !skillId) {
				throw new Error('Missing vibeId or skillId');
			}

			const userId = $session.data?.user?.id;
			
			// Execute skill
			const result = await handleActionSkill(
				{ vibeId: effectiveVibeId, skillId, args: restArgs },
				{
					userId,
					activeVibeIds: [effectiveVibeId] 
				}
			);

			if (result.success) {
				updateActivityStatus(item.id, 'success', result.data);
				
				// Send updated context back to voice session if available
				if (result.data?.calendarContext || result.data?.menuContext || result.data?.wellnessContext) {
					const contextText = result.data.calendarContext || result.data.menuContext || result.data.wellnessContext;
					const updateEvent = new CustomEvent('updateVoiceContext', {
						detail: { text: contextText }
					});
					window.dispatchEvent(updateEvent);
				}
			} else {
				console.error('[Me] Skill execution failed:', result.error);
				updateActivityStatus(item.id, 'error', undefined, result.error);
			}
		} catch (err) {
			console.error('[Me] Error executing skill:', err);
			updateActivityStatus(item.id, 'error', undefined, err instanceof Error ? err.message : 'Unknown error');
		}
	}

	onMount(() => {
		// Listen for unified toolCall events
		const handleToolCallEvent = (event: Event) => {
			const customEvent = event as CustomEvent;
			const { toolName, args } = customEvent.detail;
			handleToolCall(toolName, args);
		};

		window.addEventListener('toolCall', handleToolCallEvent);

		// Check for pending actionSkill from sessionStorage (legacy support for navigation)
		const checkPendingActionSkill = async () => {
			try {
				const pendingStr = sessionStorage.getItem('pendingActionSkill');
				if (pendingStr) {
					const pending = JSON.parse(pendingStr);
					sessionStorage.removeItem('pendingActionSkill');
					console.log('[Me] Found pending actionSkill:', pending);
					handleToolCall('actionSkill', pending);
				}
			} catch (err) {
				console.warn('[Me] Failed to check pending actionSkill:', err);
			}
		};
		
		checkPendingActionSkill();

		return () => {
			window.removeEventListener('toolCall', handleToolCallEvent);
		};
	});

    function toggleItem(id: string) {
        activities = activities.map(item => {
            if (item.id === id) {
                return { ...item, isExpanded: !item.isExpanded };
            }
            return item;
        });
    }
</script>

<div class="relative min-h-screen bg-glass-gradient px-4 pt-[env(safe-area-inset-top)] pb-[calc(6rem+env(safe-area-inset-bottom))] flex flex-col" bind:this={streamContainer}>
	
	<!-- Header -->
	<div class="pt-8 pb-6 text-center">
		<h1 class="text-2xl font-bold tracking-tight text-slate-900/80">Hominio Activity</h1>
		<p class="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Live Stream</p>
	</div>

	<!-- Activity Stream -->
	<div class="flex-1 w-full max-w-3xl mx-auto flex flex-col gap-4 justify-end min-h-[50vh]">
		{#if activities.length === 0}
			<div class="flex flex-col items-center justify-center py-20 text-slate-400/50">
				<div class="mb-4 p-4 rounded-full bg-white/20 backdrop-blur-sm">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
				</div>
				<p class="text-sm">Waiting for activity...</p>
				<p class="text-xs mt-2">Ask Hominio to do something</p>
			</div>
		{:else}
            <!-- Render items in chronological order (newest at bottom) -->
			{#each activities as item (item.id)}
				<ActivityStreamItem 
					item={item} 
					isExpanded={item.isExpanded}
                    onToggle={() => toggleItem(item.id)}
				/>
			{/each}
		{/if}
	</div>
    
    <!-- Spacer for bottom nav -->
    <div class="h-12"></div>
</div>
