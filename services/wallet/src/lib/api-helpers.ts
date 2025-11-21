/**
 * Wallet API Helpers
 * Bundled imports and utilities for SvelteKit API routes
 */

import { auth } from "$lib/auth.server";
import { json, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import * as caps from "@hominio/caps";

/**
 * Get authenticated session
 * Throws if not authenticated
 */
export async function getAuthenticatedSession(request: Request) {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session?.user) {
        throw new Error("Unauthorized: Must be logged in");
    }

    return session;
}

/**
 * Check if user is admin
 * Throws if not authenticated
 */
export async function checkAdmin(request: Request): Promise<boolean> {
    const session = await getAuthenticatedSession(request);
    const { env } = await import("$env/dynamic/private");
    const adminId = env.ADMIN;
    return adminId ? session.user.id === adminId : false;
}

/**
 * Require admin access
 * Throws if not authenticated or not admin
 */
export async function requireAdmin(request: Request) {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
        throw new Error("Forbidden: Admin access required");
    }
}

/**
 * Standard API response helpers
 */
export const api = {
    json,
    redirect,
    auth,
    getAuthenticatedSession,
    // Capability functions
    caps: {
        getCapability: caps.getCapability,
        revokeCapability: caps.revokeCapability,
        getCapabilityRequest: caps.getCapabilityRequest,
        approveCapabilityRequest: caps.approveCapabilityRequest,
        rejectCapabilityRequest: caps.rejectCapabilityRequest,
        getCapabilities: caps.getCapabilities,
        getCapabilityRequests: caps.getCapabilityRequests,
        requestCapability: caps.requestCapability,
        checkCapability: caps.checkCapability,
        grantCapability: caps.grantCapability,
    },
};

/**
 * Re-export commonly used types
 */
export type { RequestHandler };

