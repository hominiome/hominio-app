import { createAuthClient as createBetterAuthClient } from "better-auth/svelte";
import { polarClient } from "@polar-sh/better-auth";

/**
 * Get the wallet service API URL from environment variable
 * Defaults to localhost:4201 for development
 * Works in both browser and server contexts
 */
function getWalletApiUrl() {
  // Use import.meta.env for Vite/SvelteKit (works in both browser and server)
  const walletDomain = import.meta.env.PUBLIC_DOMAIN_WALLET || 'localhost:4201';
  const protocol = walletDomain.startsWith('localhost') || walletDomain.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${walletDomain}/api/auth`;
}

/**
 * Create BetterAuth client configured for wallet service
 * @param {Object} options - Configuration options
 * @param {string} options.baseURL - Override base URL (defaults to wallet service)
 */
export function createAuthClient(options = {}) {
  const baseURL = options.baseURL || getWalletApiUrl();
  
  return createBetterAuthClient({
    baseURL,
    plugins: [polarClient()],
  });
}

// Export default instance
export const authClient = createAuthClient();

