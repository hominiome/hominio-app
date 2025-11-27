<!--
	Calendar Entry UI Component
	Displays created or edited calendar entry with success confirmation
-->
<script>
	import { GlassCard } from '@hominio/brand';
	
	let { data, onClose } = $props();
	
	// Extract the entry (created or edited)
	const entry = $derived(data?.entry);
	const message = $derived(data?.message || 'Termin erfolgreich erstellt');
	
	// Detect if this is an edit or create based on message
	const isEdit = $derived(message?.toLowerCase().includes('aktualisiert') || message?.toLowerCase().includes('bearbeitet'));
	const actionTitle = $derived(isEdit ? 'Termin aktualisiert' : 'Termin erstellt');
	const badgeText = $derived(isEdit ? 'AKTUALISIERT' : 'NEU');
	const errorTitle = $derived(isEdit ? 'Fehler beim Aktualisieren' : 'Fehler beim Erstellen');
	const errorMessage = $derived(isEdit ? 'Der Termin konnte nicht aktualisiert werden.' : 'Der Termin konnte nicht erstellt werden.');
	
	// Helper functions for formatting
	function formatDate(dateStr) {
		if (!dateStr) return '';
		const date = new Date(dateStr + 'T00:00:00'); // Parse as local date
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		
		if (date.toDateString() === today.toDateString()) {
			return 'Heute';
		}
		if (date.toDateString() === tomorrow.toDateString()) {
			return 'Morgen';
		}
		
		return date.toLocaleDateString('de-DE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	}
	
	function formatTime(time) {
		return time; // Already in HH:MM format
	}
	
	function calculateEndTime(startTime, duration) {
		const [hours, minutes] = startTime.split(':').map(Number);
		const startMinutes = hours * 60 + minutes;
		const endMinutes = startMinutes + duration;
		const endHours = Math.floor(endMinutes / 60) % 24;
		const endMins = endMinutes % 60;
		return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
	}
	
	function formatDuration(duration) {
		if (duration < 60) {
			return `${duration} Min`;
		}
		const hours = Math.floor(duration / 60);
		const minutes = duration % 60;
		if (minutes === 0) {
			return `${hours} ${hours === 1 ? 'Std' : 'Std'}`;
		}
		return `${hours} ${hours === 1 ? 'Std' : 'Std'} ${minutes} Min`;
	}
	
	// Function to trigger viewing the calendar
	function viewCalendar() {
		// Dispatch toolCall event for the activity stream system
		const event = new CustomEvent('toolCall', {
			detail: {
				toolName: 'actionSkill',
				args: {
					vibeId: 'karl',
					skillId: 'view-calendar',
					...(entry?.date ? { date: entry.date } : {})
				},
				timestamp: Date.now()
			}
		});
		window.dispatchEvent(event);
	}
</script>

<div class="create-entry-view">
	{#if entry}
		<!-- Success Header -->
		<div class="success-header">
			<div class="success-icon-wrapper">
				<svg class="success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<h2 class="success-title">{actionTitle}</h2>
			<p class="success-message">{message}</p>
		</div>
		
		<!-- Entry Card -->
		<GlassCard class="new-entry-card" lifted={true}>
			<div class="entry-content">
				<!-- Time Column -->
				<div class="entry-time-column">
					<span class="time-start">{formatTime(entry.time)}</span>
					<div class="time-divider"></div>
					<span class="time-end">{calculateEndTime(entry.time, entry.duration)}</span>
				</div>
				
				<!-- Details Column -->
				<div class="entry-details">
					<div class="entry-header">
						<h3 class="entry-title">{entry.title}</h3>
						<span class="new-badge">{badgeText}</span>
					</div>
					
					<div class="entry-meta">
						<div class="meta-item">
							<svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
								<line x1="16" y1="2" x2="16" y2="6"></line>
								<line x1="8" y1="2" x2="8" y2="6"></line>
								<line x1="3" y1="10" x2="21" y2="10"></line>
							</svg>
							<span class="meta-text">{formatDate(entry.date)}</span>
						</div>
						
						<div class="meta-item">
							<svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10"></circle>
								<polyline points="12 6 12 12 16 14"></polyline>
							</svg>
							<span class="meta-text">{formatDuration(entry.duration)}</span>
						</div>
					</div>
					
					{#if entry.description}
						<p class="entry-description">{entry.description}</p>
					{/if}
				</div>
			</div>
		</GlassCard>
		
		<!-- Action Button -->
		<button class="view-calendar-button" onclick={viewCalendar}>
			<svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
				<line x1="16" y1="2" x2="16" y2="6"></line>
				<line x1="8" y1="2" x2="8" y2="6"></line>
				<line x1="3" y1="10" x2="21" y2="10"></line>
			</svg>
			<span>Kalender anzeigen</span>
		</button>
	{:else}
		<!-- Error State -->
		<div class="error-state">
			<GlassCard class="error-card">
				<div class="error-content">
					<svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<h3 class="error-title">{errorTitle}</h3>
					<p class="error-message">{errorMessage}</p>
				</div>
			</GlassCard>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		--entry-primary: var(--color-secondary-500); /* Secondary brand color (teal) */
		--entry-primary-soft: rgba(45, 166, 180, 0.1);
		--entry-success: #10b981; /* Emerald-500 */
		--entry-text: #1e293b;
		--entry-text-light: #64748b;
	}

	.create-entry-view {
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
		padding: 1.5rem;
		font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	}
	
	/* Success Header */
	.success-header {
		text-align: center;
		margin-bottom: 2rem;
	}
	
	.success-icon-wrapper {
		width: 4rem;
		height: 4rem;
		margin: 0 auto 1rem;
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 100%);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	@keyframes scaleIn {
		from {
			transform: scale(0);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
	
	.success-icon {
		width: 2rem;
		height: 2rem;
		color: var(--entry-success);
	}
	
	.success-title {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--entry-text);
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.02em;
	}
	
	.success-message {
		font-size: 1rem;
		color: var(--entry-text-light);
		margin: 0;
		font-weight: 500;
	}
	
	/* New Entry Card */
	:global(.new-entry-card) {
		padding: 0 !important;
		border: 2px solid rgba(16, 185, 129, 0.2) !important;
		background: rgba(255, 255, 255, 0.7) !important;
		box-shadow: 0 8px 30px rgba(16, 185, 129, 0.1) !important;
		border-radius: 1.25rem !important;
		overflow: hidden;
		margin-bottom: 1.5rem;
		animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	@keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	
	.entry-content {
		display: flex;
		flex-direction: row;
		align-items: stretch;
	}
	
	/* Time Column */
	.entry-time-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(45, 166, 180, 0.05) 100%);
		border-right: 2px solid rgba(16, 185, 129, 0.15);
		min-width: 100px;
	}
	
	.time-start {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--entry-text);
		line-height: 1;
	}
	
	.time-divider {
		width: 3px;
		height: 16px;
		background: var(--entry-success);
		opacity: 0.4;
		margin: 0.5rem 0;
		border-radius: 2px;
	}
	
	.time-end {
		font-size: 1rem;
		font-weight: 600;
		color: var(--entry-text-light);
	}
	
	/* Details Column */
	.entry-details {
		flex: 1;
		padding: 1.5rem 2rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	
	.entry-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
		gap: 1rem;
	}
	
	.entry-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--entry-text);
		margin: 0;
		line-height: 1.3;
		flex: 1;
	}
	
	.new-badge {
		font-size: 0.7rem;
		background: var(--entry-success);
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 99px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		flex-shrink: 0;
	}
	
	.entry-meta {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	
	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	
	.meta-icon {
		width: 18px;
		height: 18px;
		color: var(--entry-primary);
		flex-shrink: 0;
	}
	
	.meta-text {
		font-size: 0.95rem;
		color: var(--entry-text-light);
		font-weight: 500;
	}
	
	.entry-description {
		font-size: 1rem;
		color: var(--entry-text-light);
		line-height: 1.6;
		margin: 0.5rem 0 0 0;
		padding-top: 1rem;
		border-top: 1px solid rgba(148, 163, 184, 0.15);
	}
	
	/* View Calendar Button */
	.view-calendar-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem 2rem;
		background: linear-gradient(135deg, var(--entry-primary) 0%, rgba(45, 166, 180, 0.9) 100%);
		color: white;
		border: none;
		border-radius: 1rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 20px rgba(45, 166, 180, 0.2);
	}
	
	.view-calendar-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 30px rgba(45, 166, 180, 0.3);
	}
	
	.view-calendar-button:active {
		transform: translateY(0);
	}
	
	.button-icon {
		width: 20px;
		height: 20px;
	}
	
	/* Error State */
	.error-state {
		margin-top: 2rem;
	}
	
	:global(.error-card) {
		padding: 2rem !important;
		text-align: center;
	}
	
	.error-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	
	.error-icon {
		width: 3rem;
		height: 3rem;
		color: #ef4444;
	}
	
	.error-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--entry-text);
		margin: 0;
	}
	
	.error-message {
		font-size: 0.95rem;
		color: var(--entry-text-light);
		margin: 0;
	}
	
	/* Mobile Responsive */
	@media (max-width: 640px) {
		.create-entry-view {
			padding: 1rem;
		}
		
		.success-title {
			font-size: 1.5rem;
		}
		
		.entry-content {
			flex-direction: column;
		}
		
		.entry-time-column {
			flex-direction: row;
			padding: 1rem 1.5rem;
			border-right: none;
			border-bottom: 2px solid rgba(16, 185, 129, 0.15);
			justify-content: flex-start;
			gap: 1rem;
			width: 100%;
		}
		
		.time-divider {
			width: 16px;
			height: 3px;
			margin: 0;
		}
		
		.entry-details {
			padding: 1.25rem 1.5rem;
		}
		
		.entry-title {
			font-size: 1.25rem;
		}
	}
</style>

