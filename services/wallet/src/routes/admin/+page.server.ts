import { requireAdmin } from "$lib/api-helpers";
import { getUserInfoBatch } from "$lib/user-helpers";
import { getAllCapabilityRequests, getAllCapabilities } from "@hominio/caps";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
    try {
        // Require admin access
        await requireAdmin(event.request);

        // Get all pending capability requests (admin can see all requests)
        const requests = await getAllCapabilityRequests("pending");

        // Get all granted capabilities
        const capabilities = await getAllCapabilities();

        // Extract user IDs from requesters
        const requestUserIds = requests
            .map(req => {
                const match = req.requester_principal.match(/^user:(.+)$/);
                return match ? match[1] : null;
            })
            .filter((id): id is string => id !== null);

        // Extract user IDs from capabilities
        const capabilityUserIds = capabilities
            .map(cap => {
                const match = cap.principal.match(/^user:(.+)$/);
                return match ? match[1] : null;
            })
            .filter((id): id is string => id !== null);

        // Combine and deduplicate user IDs
        const allUserIds = [...new Set([...requestUserIds, ...capabilityUserIds])];

        // Fetch user info for all users
        const userInfoMap = await getUserInfoBatch(allUserIds);

        // Add user info to each request
        const requestsWithUserInfo = requests.map(req => {
            const match = req.requester_principal.match(/^user:(.+)$/);
            const userId = match ? match[1] : null;
            const userInfo = userId ? userInfoMap.get(userId) : null;

            return {
                ...req,
                userInfo: userInfo || {
                    id: userId || req.requester_principal,
                    name: null,
                    email: null,
                    image: null,
                },
            };
        });

        // Add user info to each capability
        const capabilitiesWithUserInfo = capabilities.map(cap => {
            const match = cap.principal.match(/^user:(.+)$/);
            const userId = match ? match[1] : null;
            const userInfo = userId ? userInfoMap.get(userId) : null;

            return {
                ...cap,
                userInfo: userInfo || {
                    id: userId || cap.principal,
                    name: null,
                    email: null,
                    image: null,
                },
            };
        });

        return {
            requests: requestsWithUserInfo,
            capabilities: capabilitiesWithUserInfo,
        };
    } catch (err) {
        console.error("[admin/+page.server] Error loading admin page:", err);

        // If it's already a SvelteKit error, re-throw it
        if (err && typeof err === 'object' && 'status' in err) {
            throw err;
        }

        // Otherwise, convert to proper error
        if (err instanceof Error) {
            console.error("[admin/+page.server] Error details:", {
                message: err.message,
                stack: err.stack,
                name: err.name
            });

            if (err.message.includes("Forbidden") || err.message.includes("Admin access required")) {
                throw error(403, "Forbidden: Admin access required");
            }
            if (err.message.includes("Unauthorized")) {
                throw error(401, "Unauthorized: Must be logged in");
            }
        }

        throw error(500, `Failed to load admin page: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
};

