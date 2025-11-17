import { Kysely } from "kysely";
import { NeonDialect } from "kysely-neon";
import { neon } from "@neondatabase/serverless";
import { env } from "$env/dynamic/private";
import { building } from "$app/environment";

let _authDb = null;

/**
 * Create a stub database object for build time
 */
function createBuildStub() {
  const stub = {};
  // Add common Kysely methods that return the stub itself
  ['selectFrom', 'insertInto', 'updateTable', 'deleteFrom'].forEach(method => {
    stub[method] = () => stub;
  });
  // Add chaining methods
  ['where', 'set', 'values', 'execute', 'executeTakeFirst', 'executeTakeFirstOrThrow'].forEach(method => {
    stub[method] = () => stub;
  });
  return stub;
}

/**
 * Centralized database instance for auth operations
 * Uses WALLET_POSTGRES_SECRET connection string (same as auth.server.js)
 * This is the same database as used by BetterAuth
 * Lazy initialization to avoid build-time errors
 * In SvelteKit, vars without PUBLIC_ prefix are secret by default
 */
export function getAuthDb() {
  // Check if we have the connection string - if not, return stub
  const connectionString = env.WALLET_POSTGRES_SECRET;
  if (!connectionString) {
    // During build or dev (when env vars might not be set), return stub
    // This prevents crashes during development when env vars aren't configured
    if (building || process.env.NODE_ENV !== 'production') {
      console.warn('[Wallet] WALLET_POSTGRES_SECRET not set - using stub database. Auth features will not work.');
      return createBuildStub();
    }
    // At runtime in production, throw error if connection string is missing
    throw new Error("WALLET_POSTGRES_SECRET environment variable is required");
  }
  
  // If we have connection string, create real instance
  // Check if cached instance is a stub - stubs don't have Kysely's internal structure
  // A real Kysely instance will have selectFrom, insertInto, etc. as proper methods
  const isStub = !_authDb || 
                 typeof _authDb.selectFrom !== 'function' ||
                 typeof _authDb.insertInto !== 'function' ||
                 !building && connectionString && (!_authDb || Object.keys(_authDb).length === 0);
  
  if (isStub) {
    _authDb = new Kysely({
      dialect: new NeonDialect({
        neon: neon(connectionString),
      }),
    });
  }
  return _authDb;
}


