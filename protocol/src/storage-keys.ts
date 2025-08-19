/**
 * Storage Keys Constants for Agent Memory Protocol
 *
 * Centralized constants for localStorage and chrome.storage keys
 * to ensure consistency across the entire codebase.
 */

/**
 * Base storage keys - these are used as-is or as prefixes
 */
export const STORAGE_KEYS = {
	/** Base key for permission storage */
	PERMISSIONS_BASE: "agentMemoryPermissions",

	/** Base key for web agent context storage */
	WEB_AGENT_CONTEXT_BASE: "agentMemoryWebAgentContext",

	/** Extension settings storage */
	EXTENSION_SETTINGS: "agentMemorySettings",

	/** UI prompt dismissal tracking */
	UI_PROMPT_DISMISSED: "agent-memory-prompt-dismissed",

	/** Analytics/logging storage */
	ANALYTICS_LOG: "agentMemoryAnalyticsLog",
} as const;

/**
 * Generate provider-specific storage keys
 */
export const createStorageKeys = (providerId: string) => ({
	/** Provider-specific permission storage */
	permissions: `${STORAGE_KEYS.PERMISSIONS_BASE}_${providerId}`,

	/** Provider-specific web agent context storage */
	webAgentContext: `${STORAGE_KEYS.WEB_AGENT_CONTEXT_BASE}_${providerId}`,

	/** Provider-specific analytics */
	analytics: `${STORAGE_KEYS.ANALYTICS_LOG}_${providerId}`,
});

/**
 * UI Element IDs and CSS class prefixes
 */
export const UI_ELEMENTS = {
	/** Base prefix for all Agent Memory UI elements */
	PREFIX: "agent-memory",

	/** Install prompt dialog ID */
	INSTALL_PROMPT_ID: "agent-memory-install-prompt",

	/** Permission dialog ID base */
	PERMISSION_DIALOG_PREFIX: "agent-memory-permission",
} as const;

/**
 * Event names used throughout the protocol
 */
export const EVENTS = {
	/** Dispatched when the agent memory registry is ready */
	READY: "agentMemoryReady",

	/** Dispatched when a provider is registered */
	PROVIDER_REGISTERED: "agentMemoryProviderRegistered",

	/** Dispatched when a provider is unregistered */
	PROVIDER_UNREGISTERED: "agentMemoryProviderUnregistered",

	/** Dispatched when permission is granted */
	PERMISSION_GRANTED: "agentMemoryPermissionGranted",

	/** Dispatched when permission is revoked */
	PERMISSION_REVOKED: "agentMemoryPermissionRevoked",

	/** Dispatched when context is provided */
	CONTEXT_PROVIDED: "agentMemoryContextProvided",

	/** Dispatched when context is received */
	CONTEXT_RECEIVED: "agentMemoryContextReceived",

	/** Dispatched when context is processed */
	CONTEXT_PROCESSED: "agentMemoryContextProcessed",
} as const;

/**
 * Type definitions for better type safety
 */
export type StorageKey = keyof typeof STORAGE_KEYS;
export type EventName = keyof typeof EVENTS;
export type UIElement = keyof typeof UI_ELEMENTS;
