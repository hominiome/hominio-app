/**
 * Query Data Context Tool Handler
 * Handles dynamic data context queries (menu, wellness, calendar)
 */

import { handleQueryDataContext as handleVibesQueryDataContext } from '@hominio/vibes';

export interface QueryDataContextResult {
	success: boolean;
	schemaId: string;
	data?: any;
	error?: string;
	// Note: contextString is not returned because context is injected via injectFn
}

export async function handleQueryDataContext(
	schemaId: string,
	params: Record<string, any>,
	injectFn: (content: { turns: string; turnComplete: boolean }) => void
): Promise<QueryDataContextResult> {
	try {
		const result = await handleVibesQueryDataContext({
			schemaId,
			params,
			injectFn
		});

		return {
			success: result.success,
			schemaId,
			data: result.data,
			error: result.error
		};
	} catch (err) {
		console.error(`[hominio-voice] Failed to query data context for ${schemaId}:`, err);
		return {
			success: false,
			schemaId,
			error: `Failed to query data context: ${err instanceof Error ? err.message : 'Unknown error'}`
		};
	}
}

