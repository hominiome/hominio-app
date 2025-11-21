import { auth } from "$lib/auth.server";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { isTrustedOrigin } from "$lib/utils/domain";

export async function handle({ event, resolve }) {
	// Skip BetterAuth handling for our custom endpoints
	// These endpoints are handled by their respective route handlers
	const url = new URL(event.request.url);
	const pathname = url.pathname;
	
	// Skip BetterAuth for custom endpoints
	if (
		pathname === '/api/auth/verify' ||
		pathname.startsWith('/api/auth/capabilities')
	) {
		// Let SvelteKit handle this route normally (don't intercept with BetterAuth)
		return resolve(event);
	}

	// Handle CORS preflight requests for BetterAuth API
	if (event.request.method === 'OPTIONS') {
		const origin = event.request.headers.get('origin');
		const headers = new Headers();
		
		if (origin && isTrustedOrigin(origin)) {
			headers.set('Access-Control-Allow-Origin', origin);
			headers.set('Access-Control-Allow-Credentials', 'true');
			headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
			headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
			headers.set('Access-Control-Max-Age', '86400'); // 24 hours
		}
		
		return new Response(null, { status: 204, headers });
	}

	// Handle BetterAuth requests (all other /api/auth/* routes)
	const response = await svelteKitHandler({ event, resolve, auth, building });
	
	// Add CORS headers to BetterAuth responses
	const origin = event.request.headers.get('origin');
	if (origin && isTrustedOrigin(origin)) {
		response.headers.set('Access-Control-Allow-Origin', origin);
		response.headers.set('Access-Control-Allow-Credentials', 'true');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
	}
	
	return response;
}

