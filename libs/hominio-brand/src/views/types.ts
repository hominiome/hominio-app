/**
 * Calendar View Types
 * Shared TypeScript interfaces for calendar views
 */

/**
 * Calendar Entry Data Interface
 */
export interface CalendarEntry {
	id: string;
	date: string; // YYYY-MM-DD format
	time: string; // HH:MM format
	duration: number; // Duration in minutes
	title: string;
	description?: string;
}

