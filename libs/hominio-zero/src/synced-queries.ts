// Client-side synced query definitions - Projects only
// This file must only be imported on the client side (browser)
// Synced queries require Zero client which is not available during SSR
import { syncedQuery } from '@rocicorp/zero';
import z from 'zod';
import { builder } from './schema';

/**
 * ========================================
 * PROJECT QUERIES
 * ========================================
 */

/**
 * Get all projects, ordered by creation date (newest first)
 */
export const allProjects = syncedQuery(
  'allProjects',
  z.tuple([]), // No arguments needed
  () => {
    return builder.project.orderBy('createdAt', 'desc');
  }
);

/**
 * ========================================
 * SCHEMA QUERIES
 * ========================================
 */

/**
 * Get all schemas
 */
export const allSchemas = syncedQuery(
  'allSchemas',
  z.tuple([]), // No arguments needed
  () => {
    return builder.schema;
  }
);

/**
 * Get a schema by ID
 */
export const schemaById = syncedQuery(
  'schemaById',
  z.tuple([z.string()]), // schemaId
  (schemaId) => {
    return builder.schema.where('id', '=', schemaId);
  }
);

/**
 * Get a schema by title (searches in data->>'title')
 * Note: This requires server-side support - Zero doesn't support JSONB queries directly
 * For now, use allSchemas and filter client-side, or use schemaById if you know the ID
 */
export const schemaByTitle = syncedQuery(
  'schemaByTitle',
  z.tuple([z.string()]), // title
  (title) => {
    // Note: Zero doesn't support JSONB queries directly
    // This will need server-side filtering in get-queries.ts
    // For now, return all schemas and filter client-side
    return builder.schema;
  }
);

/**
 * ========================================
 * DATA QUERIES
 * ========================================
 */

/**
 * Get all data entries for a specific schema
 */
export const allDataBySchema = syncedQuery(
  'allDataBySchema',
  z.tuple([z.string()]), // schemaId
  (schemaId) => {
    return builder.data.where('schema', '=', schemaId);
  }
);

/**
 * Get a data entry by ID
 */
export const dataById = syncedQuery(
  'dataById',
  z.tuple([z.string()]), // dataId
  (dataId) => {
    return builder.data.where('id', '=', dataId);
  }
);

