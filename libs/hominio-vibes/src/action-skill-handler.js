/**
 * Action Skill Handler
 * Generic handler for actionSkill tool calls
 * Routes to appropriate function based on vibe and skill ID
 */

import { loadVibeConfig } from './vibe-loader.js';
// Legacy import support
import { loadVibeConfig as loadAgentConfig } from './vibe-loader.js';
import { loadFunction } from './function-loader.js';
import { loadDataContext } from './data-context-loader.js';
import { getCalendarContextString } from '../lib/functions/calendar-store.js';

/**
 * Handle actionSkill tool call
 * @param {Object} params - Tool call parameters
 * @param {string} params.vibeId - Vibe ID (e.g., 'charles')
 * @param {string} params.skillId - Skill ID (e.g., 'show-menu')
 * @param {Object} params.args - Skill arguments
 * @param {Object} options - Handler options
 * @param {string} options.userId - Current user ID (optional)
 * @param {string[]} [options.activeVibeIds] - Currently active vibe IDs (for validation)
 * @returns {Promise<import('./types.ts').FunctionResult>}
 */
export async function handleActionSkill(
	{ vibeId, skillId, args },
	{ userId, activeVibeIds = [] }
) {
	try {
		// Support legacy agentId parameter for backwards compatibility
		const effectiveVibeId = vibeId || (args && args.agentId) || null;
		
		if (!effectiveVibeId) {
			return {
				success: false,
				error: 'Vibe ID is required. Use queryVibeContext first to load the vibe context.'
			};
		}
		
		// 1. Load vibe config
		const vibeConfig = await loadVibeConfig(effectiveVibeId);
		
		// 2. Find skill in config
		const skill = vibeConfig.skills.find(s => s.id === skillId);
		if (!skill) {
			return {
				success: false,
				error: `Skill "${skillId}" not found in vibe "${effectiveVibeId}"`
			};
		}
		
		// 3. Load function implementation
		const functionImpl = await loadFunction(skill.functionId);
		
		// 4. Load data context (JSON-based, no queries)
		// Use skill-specific dataContext if available, otherwise fall back to vibe-level dataContext
		const skillDataContext = skill.dataContext 
			? (Array.isArray(skill.dataContext) ? skill.dataContext : [skill.dataContext])
			: [];
		
		// Combine vibe-level and skill-specific data context
		const combinedDataContext = [
			...(vibeConfig.dataContext || []),
			...skillDataContext
		];
		
		// Create temporary vibe config with combined context for loadDataContext
		const tempVibeConfig = {
			...vibeConfig,
			dataContext: combinedDataContext
		};
		
		let dataContextString = await loadDataContext(tempVibeConfig);
		
		// Inject calendar context for calendar-related skills
		if (effectiveVibeId === 'karl' || skillId?.includes('calendar')) {
			try {
				const calendarContext = await getCalendarContextString();
				if (calendarContext) {
					dataContextString = dataContextString 
						? `${dataContextString}\n\n${calendarContext}`
						: calendarContext;
				}
			} catch (error) {
				console.warn('[ActionSkill] Failed to load calendar context:', error);
				// Continue without calendar context if it fails
			}
		}
		
		// 5. Build function context
		const context = {
			dataContext: dataContextString, // String format for LLM prompt
			rawDataContext: combinedDataContext, // Raw data context including skill-specific context
			skillDataContext: skillDataContext, // Skill-specific data context (for easy access)
			userId,
			vibeId: effectiveVibeId,
			// Legacy alias for backwards compatibility
			agentId: effectiveVibeId
		};
		
		// 6. Execute function handler
		const result = await functionImpl.handler(args || {}, context);
		
		return result;
	} catch (error) {
		console.error('[ActionSkill] Error handling actionSkill:', error);
		return {
			success: false,
			error: error.message || 'Unknown error executing skill'
		};
	}
}

