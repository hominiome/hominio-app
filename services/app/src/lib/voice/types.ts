/**
 * Voice Call Types
 * Shared types for voice call services
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
export type AIState = 'listening' | 'thinking' | 'speaking' | 'idle';
export type ToolCallHandler = (toolName: string, args: any, contextString?: string, result?: any) => void;

