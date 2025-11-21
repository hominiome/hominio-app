/**
 * Utility functions for working with Zero schemas
 * Provides helpers to get schema IDs dynamically using name-scoped identifiers
 * Format: @scope/schema-name-v1 (e.g., @hominio/hotel-v1)
 */

import { allSchemas } from './synced-queries';

/**
 * Get the hotel schema ID by querying schemas and finding the one with exact name "@scope/hotel-v1"
 * Uses exact name-scoped identifier match: @scope/hotel-v1 (e.g., @hominio/hotel-v1)
 * 
 * @param zero - Zero client instance
 * @param scope - Username scope (e.g., "@hominio"), defaults to "@hominio"
 * @returns Promise<string | null> - The hotel schema ID (nanoid), or null if not found
 */
export async function getHotelSchemaId(zero: any, scope: string = "@hominio"): Promise<string | null> {
  try {
    const schemasQuery = allSchemas();
    const schemasView = zero.materialize(schemasQuery);
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        schemasView.destroy();
        resolve(null);
      }, 5000); // 5 second timeout
      
      schemasView.addListener((schemas: any[]) => {
        clearTimeout(timeout);
        const schemasArray = Array.from(schemas || []);
        
        // Find schema with exact name-scoped identifier
        const schemaName = `${scope}/hotel-v1`;
        const hotelSchema = schemasArray.find((schema: any) => {
          return schema.name === schemaName;
        });
        
        schemasView.destroy();
        
        if (hotelSchema) {
          resolve(hotelSchema.id);
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('[schema-utils] Error getting hotel schema ID:', error);
    return null;
  }
}

/**
 * Get hotel schema ID synchronously from a list of schemas
 * Uses exact name-scoped identifier match: @scope/hotel-v1 (e.g., @hominio/hotel-v1)
 * 
 * @param schemas - Array of schema objects
 * @param scope - Username scope (e.g., "@hominio"), defaults to "@hominio"
 * @returns string | null - The hotel schema ID (nanoid), or null if not found
 */
export function getHotelSchemaIdFromSchemas(schemas: any[], scope: string = "@hominio"): string | null {
  const schemaName = `${scope}/hotel-v1`; // Exact name-scoped identifier
  const hotelSchema = schemas.find((schema: any) => {
    return schema.name === schemaName;
  });
  
  return hotelSchema?.id || null;
}

/**
 * Get schema by name-scoped identifier (e.g., "@hominio/hotel-v1")
 * 
 * @param schemas - Array of schema objects
 * @param schemaName - Name-scoped schema identifier (e.g., "@hominio/hotel-v1")
 * @returns Schema object or null if not found
 */
export function getSchemaByName(schemas: any[], schemaName: string): any | null {
  const schema = schemas.find((s: any) => s.name === schemaName);
  return schema || null;
}

