/**
 * Memory Protocol Core Helper Functions
 * Essential utilities for working with the Memory Protocol
 */

/**
 * Check if the Memory Protocol is available in the current window
 */
export function isProtocolAvailable(): boolean {
	return typeof window !== "undefined" && window.agentMemory !== undefined;
}
