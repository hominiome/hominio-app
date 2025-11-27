/**
 * Vibe Config Loader
 * Loads vibe configuration from JSON files
 * Browser-compatible: Uses direct imports
 */

// Import configs directly - Vite will bundle them
import charlesConfig from '../lib/vibes/charles/config.json';
import karlConfig from '../lib/vibes/karl/config.json';

const vibeConfigs = {
	charles: charlesConfig,
	karl: karlConfig
};

/**
 * Load vibe configuration
 * @param {string} vibeId - Vibe ID (e.g., 'charles')
 * @returns {Promise<import('./types.ts').VibeConfig>}
 */
export async function loadVibeConfig(vibeId) {
	try {
		const config = vibeConfigs[vibeId];
		
		if (!config) {
			throw new Error(`Vibe config not found: ${vibeId}`);
		}
		
		// Validate required fields
		if (!config.id || !config.name || !config.skills) {
			throw new Error(`Invalid vibe config: missing required fields`);
		}
		
		return config;
	} catch (error) {
		throw new Error(`Failed to load vibe config: ${vibeId} - ${error.message}`);
	}
}

/**
 * Get all available vibe IDs
 * @returns {Promise<string[]>}
 */
export async function listVibes() {
	// For now, return hardcoded list
	// Later can scan lib/vibes directory
	return ['charles', 'karl'];
}

