import { api, requireAdmin } from "$lib/api-helpers";
import { getUserInfoBatch } from "$lib/user-helpers";
import { getAllCapabilityRequests } from "@hominio/caps";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
    try {
        await requireAdmin(request);

        // Get all pending requests (admin can see all requests)
        const requests = await getAllCapabilityRequests("pending");

        // Extract user IDs from requesters
        const requestUserIds = requests
            .map(req => {
                const match = req.requester_principal.match(/^user:(.+)$/);
                return match ? match[1] : null;
            })
            .filter((id): id is string => id !== null);

        // Fetch user info for all requesters
        const userInfoMap = await getUserInfoBatch(requestUserIds);

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

        return api.json({ requests: requestsWithUserInfo });
    } catch (error) {
        console.error("[admin/capability-requests] Error:", error);
        if (error instanceof Error && error.message.includes("Forbidden")) {
            return api.json(
                { error: error.message },
                { status: 403 }
            );
        }
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return api.json(
                { error: error.message },
                { status: 401 }
            );
        }
        return api.json(
            {
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
};

