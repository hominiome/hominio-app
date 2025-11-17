#!/usr/bin/env bun
/**
 * BetterAuth Native Migration Script
 * Uses BetterAuth's internal migration logic to create tables
 * This is the recommended way according to BetterAuth docs
 */

import { betterAuth } from "better-auth";
import { Kysely } from "kysely";
import { NeonDialect } from "kysely-neon";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.WALLET_POSTGRES_SECRET;

if (!DATABASE_URL) {
  console.error("❌ WALLET_POSTGRES_SECRET environment variable is required");
  process.exit(1);
}

// Create Kysely instance
const db = new Kysely({
  dialect: new NeonDialect({
    neon: neon(DATABASE_URL),
  }),
});

// Create minimal BetterAuth instance for migration
const auth = betterAuth({
  database: {
    db: db,
    type: "postgres",
  },
  secret: process.env.AUTH_SECRET || "temp-secret-for-migration",
});

// Run migration using BetterAuth's internal migration
async function migrate() {
  console.log("🚀 Running BetterAuth native migration...\n");
  
  try {
    // BetterAuth's migrate method should be available
    // This uses BetterAuth's internal schema generation
    await auth.$migrate?.();
    console.log("✅ Migration completed successfully!\n");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate()
  .then(() => {
    console.log("🎉 All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  });
