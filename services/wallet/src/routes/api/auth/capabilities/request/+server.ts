import { api } from "$lib/api-helpers";
import { isTrustedOrigin } from "$lib/utils/domain";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/public";
import { env as privateEnv } from "$env/dynamic/private";

/**
 * Request Capability Endpoint
 * 
 * 3rd party services/agents can request capabilities via this endpoint
 * Returns redirect URL to wallet approval page with callback URL
 */
export const POST: RequestHandler = async ({ request }) => {
    // Validate origin for CORS
    const origin = request.headers.get("origin");
    if (origin && !isTrustedOrigin(origin)) {
        return api.json(
            { error: "Unauthorized: Untrusted origin" },
            { status: 403 }
        );
    }

    try {
        // Get authenticated session
        const session = await api.getAuthenticatedSession(request);

        const body = await request.json();
        const { resource, actions, message, callback_url, device_id } = body;

        // Validate required fields
        if (!resource || !actions || !Array.isArray(actions)) {
            return api.json(
                { error: "Invalid request: resource and actions are required" },
                { status: 400 }
            );
        }

        // Determine owner of the resource
        // For api:voice resources, admin is always the owner
        // For other resources, require owner_id in the request body
        let ownerId = body.owner_id;
        if (!ownerId) {
            // Auto-detect owner for api:voice (admin)
            if (resource.type === 'api' && resource.namespace === 'voice') {
                ownerId = privateEnv.ADMIN;
                if (!ownerId) {
                    return api.json(
                        { error: "Admin not configured" },
                        { status: 500 }
                    );
                }
            } else {
                return api.json(
                    { error: "Invalid request: owner_id is required for this resource type" },
                    { status: 400 }
                );
            }
        }

        // Extract principal
        const requesterPrincipal = `user:${session.user.id}` as const;

        // Create capability request
        const requestId = await api.caps.requestCapability(
            requesterPrincipal,
            {
                type: resource.type,
                namespace: resource.namespace,
                id: resource.id,
                device_id: device_id || resource.device_id,
            },
            actions,
            ownerId,
            message,
            callback_url
        );

        // Build redirect URL to wallet approval page
        // Use env var or derive from request origin in production
        let walletDomain = env.PUBLIC_DOMAIN_WALLET;
        if (!walletDomain) {
            // Try to derive from request origin
            const origin = request.headers.get('origin') || request.headers.get('referer');
            if (origin) {
                try {
                    const originUrl = new URL(origin);
                    const hostname = originUrl.hostname;
                    // If origin is from wallet service, use it; otherwise construct wallet domain
                    if (hostname.includes('wallet.') || hostname === 'wallet.hominio.me') {
                        walletDomain = hostname;
                    } else if (hostname.startsWith('app.')) {
                        walletDomain = hostname.replace('app.', 'wallet.');
                    } else {
                        walletDomain = `wallet.${hostname.replace(/^www\./, '')}`;
                    }
                } catch {
                    // Invalid origin, fall back to default
                    walletDomain = 'wallet.hominio.me';
                }
            } else {
                // No origin header, use production default
                walletDomain = 'wallet.hominio.me';
            }
        }
        // Remove protocol if present
        walletDomain = walletDomain.replace(/^https?:\/\//, '');
        const protocol = walletDomain.startsWith('localhost') || walletDomain.startsWith('127.0.0.1') ? 'http' : 'https';
        const redirectUrl = `${protocol}://${walletDomain}/capabilities/requests/${requestId}${callback_url ? `?callback=${encodeURIComponent(callback_url)}` : ''}`;

        // Add CORS headers if origin is present
        const responseHeaders: HeadersInit = {};
        if (origin) {
            responseHeaders["Access-Control-Allow-Origin"] = origin;
            responseHeaders["Access-Control-Allow-Credentials"] = "true";
            responseHeaders["Access-Control-Allow-Methods"] = "POST, OPTIONS";
            responseHeaders["Access-Control-Allow-Headers"] = "Content-Type, Cookie";
        }

        return api.json({
            requestId,
            redirectUrl,
        }, { headers: responseHeaders });
    } catch (error) {
        console.error("[capabilities/request] Error:", error);
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return api.json(
                { error: error.message },
                { status: 401 }
            );
        }
        // Add CORS headers even on error
        const errorHeaders: HeadersInit = {};
        if (origin) {
            errorHeaders["Access-Control-Allow-Origin"] = origin;
            errorHeaders["Access-Control-Allow-Credentials"] = "true";
            errorHeaders["Access-Control-Allow-Methods"] = "POST, OPTIONS";
            errorHeaders["Access-Control-Allow-Headers"] = "Content-Type, Cookie";
        }

        return api.json(
            {
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500, headers: errorHeaders }
        );
    }
};

/**
 * Handle OPTIONS preflight requests
 */
export const OPTIONS: RequestHandler = async ({ request }) => {
    const origin = request.headers.get("origin");
    const headers = new Headers();

    if (origin && isTrustedOrigin(origin)) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Credentials", "true");
        headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type, Cookie");
        headers.set("Access-Control-Max-Age", "86400"); // 24 hours
    }

    return new Response(null, { status: 204, headers });
};

