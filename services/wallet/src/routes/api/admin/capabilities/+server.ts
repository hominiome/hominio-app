import { api, requireAdmin } from "$lib/api-helpers";
import { getUserInfoBatch } from "$lib/user-helpers";
import { getAllCapabilities } from "@hominio/caps";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
    try {
        await requireAdmin(request);

        // Get all capabilities
        const capabilities = await getAllCapabilities();

        // Extract user IDs from capabilities
        const capabilityUserIds = capabilities
            .map(cap => {
                const match = cap.principal.match(/^user:(.+)$/);
                return match ? match[1] : null;
            })
            .filter((id): id is string => id !== null);

        // Fetch user info for all users
        const userInfoMap = await getUserInfoBatch(capabilityUserIds);

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

        return api.json({ capabilities: capabilitiesWithUserInfo });
    } catch (error) {
        console.error("[admin/capabilities] Error:", error);
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

