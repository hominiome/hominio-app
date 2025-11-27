/**
 * Vibe Context Builder
 * Builds context strings for vibe queries
 * Used by queryVibeContext tool to inject vibe context into conversation
 */

import { loadVibeConfig } from './vibe-loader.js';
import { buildVibeContext } from './system-instruction-builder.js';
import { getCalendarContextString } from '../lib/functions/calendar-store.js';

/**
 * Build and return vibe context string for queryVibeContext tool
 * @param {string} vibeId - Vibe ID to query
 * @returns {Promise<string>} - Formatted vibe context string
 */
export async function buildVibeContextString(vibeId) {
	try {
		const vibeConfig = await loadVibeConfig(vibeId);
		
		// Get calendar context for Karl if applicable
		let calendarContext = null;
		if (vibeId === 'karl') {
			try {
				calendarContext = await getCalendarContextString();
			} catch (error) {
				console.warn('[VibeContext] Failed to load calendar context:', error);
			}
		}
		
		// Build vibe context
		const context = await buildVibeContext(vibeConfig, { calendarContext });
		
		return context;
	} catch (error) {
		throw new Error(`Failed to build vibe context for ${vibeId}: ${error.message}`);
	}
}

/**
 * Get list of available tools for a vibe
 * @param {string} vibeId - Vibe ID
 * @returns {Promise<string[]>} - Array of skill IDs
 */
export async function getVibeTools(vibeId) {
	try {
		const vibeConfig = await loadVibeConfig(vibeId);
		return vibeConfig.skills.map(skill => skill.id);
	} catch (error) {
		throw new Error(`Failed to get tools for vibe ${vibeId}: ${error.message}`);
	}
}

