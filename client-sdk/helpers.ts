/**
 * Client-side helper functions for Memory Protocol
 * These are utilities specifically for client applications using the Memory Protocol
 */

import type {
	AgentMemoryRegistry,
	AppInfo,
	ContextOptions,
	ContextResult,
	MemoryProvider,
	PermissionResult,
	ProviderSelectionCriteria,
} from "@wamp/protocol";
import { isProtocolAvailable } from "@wamp/protocol";

// Extend Window interface to include agentMemory
declare global {
	interface Window {
		agentMemory?: AgentMemoryRegistry;
	}
}

/**
 * Wait for the Memory Protocol to become available
 * @param timeout - Maximum time to wait in milliseconds (default: 2000)
 * @returns Promise that resolves with the protocol or null if timeout
 */
export function waitForProtocol(
	timeout = 2000,
): Promise<AgentMemoryRegistry | null> {
	return new Promise((resolve) => {
		if (isProtocolAvailable()) {
			resolve(window.agentMemory as AgentMemoryRegistry);
			return;
		}

		const timeoutId = setTimeout(() => {
			cleanup();
			resolve(null);
		}, timeout);

		const handleReady = () => {
			cleanup();
			resolve(window.agentMemory || null);
		};

		const cleanup = () => {
			clearTimeout(timeoutId);
			window.removeEventListener("agentMemoryReady", handleReady);
		};

		window.addEventListener("agentMemoryReady", handleReady);
	});
}

/**
 * Select the best provider based on criteria
 */
export function selectBestProvider(
	criteria: ProviderSelectionCriteria = {},
): MemoryProvider | null {
	if (!isProtocolAvailable()) {
		return null;
	}

	const providers = window.agentMemory?.getProviders() || [];

	if (providers.length === 0) {
		return null;
	}

	// Filter by preferred providers
	if (criteria.preferredProviders?.length) {
		const preferred = providers.filter((p: MemoryProvider) =>
			criteria.preferredProviders?.includes(p.providerId),
		);
		if (preferred.length > 0) {
			return preferred[0]; // Return first preferred
		}
	}

	// Filter by required features
	if (criteria.requiredFeatures?.length) {
		const compatible = providers.filter((p: MemoryProvider) => {
			const providerInfo = p.getProviderInfo();
			return criteria.requiredFeatures?.every((feature: string) =>
				providerInfo.features.includes(feature),
			);
		});
		if (compatible.length > 0) {
			return compatible[0];
		}
	}

	// Default to first provider
	return providers[0];
}

/**
 * Get provider by name
 */
export function getProviderByName(name: string): MemoryProvider | undefined {
	if (!isProtocolAvailable()) {
		return undefined;
	}

	const providers = window.agentMemory?.getProviders() || [];
	return providers.find(
		(p: MemoryProvider) => p.providerName.toLowerCase() === name.toLowerCase(),
	);
}

/**
 * Get context safely with error handling
 */
export async function getContextSafely(
	options?: ContextOptions,
	providerId?: string,
): Promise<ContextResult | null> {
	try {
		if (!isProtocolAvailable() || !window.agentMemory) {
			return null;
		}

		return await window.agentMemory.getContext(options, providerId);
	} catch (error) {
		console.warn("Failed to get context:", error);
		return null;
	}
}

/**
 * Check permissions for all available providers
 */
export async function checkAllPermissions(
	appInfo: AppInfo,
): Promise<Record<string, boolean>> {
	if (!isProtocolAvailable()) return {};

	const providers = window.agentMemory?.getProviders();
	const results: Record<string, boolean> = {};

	for (const provider of providers || []) {
		try {
			results[provider.providerId] = provider.isPermissionGranted(
				appInfo.domain,
			);
		} catch (error) {
			console.warn(
				`Failed to check permissions for ${provider.providerId}:`,
				error,
			);
			results[provider.providerId] = false;
		}
	}

	return results;
}

/**
 * Request permissions from all available providers
 */
export async function requestAllPermissions(
	appInfo: AppInfo,
): Promise<Record<string, PermissionResult>> {
	if (!isProtocolAvailable()) return {};

	const providers = window.agentMemory?.getProviders();
	const results: Record<string, PermissionResult> = {};

	for (const provider of providers || []) {
		try {
			results[provider.providerId] = await provider.requestPermission(appInfo);
		} catch (error) {
			console.warn(
				`Failed to request permissions for ${provider.providerId}:`,
				error,
			);
			results[provider.providerId] = {
				granted: false,
				isFirstTime: false,
				permissions: [],
			};
		}
	}

	return results;
}
