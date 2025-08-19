/**
 * RegistryManager - Functional approach to manage Memory Protocol registry injection and provider registration
 *
 * Handles:
 * - Auto-injection of the protocol registry if not present
 * - Provider registration with the registry
 * - Event management and lifecycle
 * - Multiple provider support
 */

import type {
	AgentMemoryRegistry,
	ContextMetadata,
	ContextOptions,
	ContextResult,
	MemoryProvider,
	ProtocolError,
	ProviderContextResult,
} from "@wamp/protocol";

export interface RegistryConfig {
	autoInject?: boolean;
	protocolVersion?: string;
	specVersion?: string;
	debug?: boolean;
}

/**
 * Convert ProviderContextResult to ContextResult
 */
function convertToContextResult(
	providerResult: ProviderContextResult,
	providerId: string,
): ContextResult {
	const metadata: ContextMetadata = {
		...providerResult.metadata,
		generatedAt: providerResult.metadata?.generatedAt ?? Date.now(),
		provider: providerResult.metadata?.provider ?? {
			id: providerId,
			name: "Unknown Provider",
			version: "1.0.0",
		},
		dataSource: providerResult.metadata?.dataSource ?? {
			timeRange: { start: 0, end: 0 },
			categories: [],
		},
	};

	const error: ProtocolError | undefined = providerResult.error
		? {
				code: "PROVIDER_ERROR",
				message: providerResult.error,
				recoverable: false,
			}
		: undefined;

	return {
		success: providerResult.success,
		data: providerResult.data,
		error,
		metadata,
	};
}

/**
 * Initialize the registry manager
 */
export function initializeRegistry(config: RegistryConfig = {}): void {
	const finalConfig = {
		autoInject: config.autoInject ?? true,
		protocolVersion: config.protocolVersion ?? "1.0.0",
		specVersion: config.specVersion ?? "1.0",
		debug: config.debug ?? false,
	};

	if (finalConfig.autoInject) {
		ensureRegistryExists(finalConfig);
	}
}

/**
 * Register a provider with the registry
 */
export function registerProvider(
	provider: MemoryProvider,
	config: RegistryConfig = {},
): void {
	const finalConfig = {
		debug: config.debug ?? false,
	};

	if (finalConfig.debug) {
		console.log(
			`[RegistryManager] Registering provider: ${provider.providerId}`,
		);
	}

	// Register with global registry
	const registry = getRegistry();
	if (registry) {
		registry.registerProvider(provider);

		// Dispatch registration event
		dispatchEvent(
			"provider-registered",
			{
				providerId: provider.providerId,
				providerName: provider.providerName,
				version: provider.version,
			},
			registry,
		);

		// Notify that protocol is ready
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("agentMemoryReady", {
					detail: { providerId: provider.providerId },
				}),
			);
		}
	} else if (finalConfig.debug) {
		console.warn(
			"[RegistryManager] No registry available to register provider",
		);
	}
}

/**
 * Unregister a provider
 */
export function unregisterProvider(
	providerId: string,
	config: RegistryConfig = {},
): boolean {
	const finalConfig = {
		debug: config.debug ?? false,
	};

	// Remove from global registry
	const registry = getRegistry();
	if (registry) {
		const result = registry.unregisterProvider(providerId);

		if (result && finalConfig.debug) {
			dispatchEvent(
				"provider-unregistered",
				{
					providerId,
					timestamp: Date.now(),
				},
				registry,
			);
		}

		return result;
	}

	return false;
}

/**
 * Get the global registry
 */
export function getRegistry(): AgentMemoryRegistry | null {
	if (typeof window !== "undefined") {
		return (
			(window as { agentMemory?: AgentMemoryRegistry }).agentMemory || null
		);
	}
	return null;
}

/**
 * Ensure the registry exists in the global scope
 */
function ensureRegistryExists(config: RegistryConfig): void {
	if (typeof window === "undefined") {
		// Not in browser context
		return;
	}

	// Check if registry already exists
	if ((window as { agentMemory?: AgentMemoryRegistry }).agentMemory) {
		if (config.debug) {
			console.log("[RegistryManager] Registry already exists");
		}
		return;
	}

	if (config.debug) {
		console.log("[RegistryManager] Creating new registry");
	}

	// Create the registry
	const registry = createRegistry(config);
	(window as { agentMemory?: AgentMemoryRegistry }).agentMemory = registry;
}

/**
 * Create a new registry instance
 */
function createRegistry(config: RegistryConfig): AgentMemoryRegistry {
	const providers = new Map<string, MemoryProvider>();
	const listeners = new Map<string, Set<(event: CustomEvent) => void>>();

	const registry: AgentMemoryRegistry = {
		version: config.protocolVersion ?? "1.0.0",
		spec: config.specVersion ?? "1.0",
		providers,

		// Provider management
		registerProvider: (provider: MemoryProvider) => {
			if (config.debug) {
				console.log(`[Registry] Registering provider: ${provider.providerId}`);
			}
			providers.set(provider.providerId, provider);
			registry.dispatchEvent(
				new CustomEvent("provider-registered", {
					detail: { providerId: provider.providerId },
				}),
			);
		},

		unregisterProvider: (providerId: string) => {
			const existed = providers.has(providerId);
			if (existed) {
				providers.delete(providerId);
				registry.dispatchEvent(
					new CustomEvent("provider-unregistered", {
						detail: { providerId },
					}),
				);
			}
			return existed;
		},

		getProviders: () => Array.from(providers.values()),

		getProvider: (providerId: string) => providers.get(providerId),

		// Status and discovery
		getStatus: () => {
			const providerList = Array.from(providers.values());
			return {
				available: providerList.length > 0,
				providerCount: providerList.length,
				providers: providerList.map((p) => ({
					providerId: p.providerId,
					providerName: p.providerName,
					version: p.version,
					available: true,
					permissionGranted: p.isPermissionGranted(),
					capabilities: p.getProviderInfo().features ?? [],
				})),
				protocolVersion: registry.version,
				features: [
					"multi-provider",
					"permissions",
					"context-retrieval",
					"events",
				],
			};
		},

		getInstallationInfo: () => ({
			available: providers.size > 0,
			recommendedProviders: [],
			alternativeOptions: [],
		}),

		// Context methods
		getContext: async (options, providerId) => {
			const provider = providerId
				? providers.get(providerId)
				: Array.from(providers.values())[0];

			if (!provider) {
				return {
					success: false,
					error: {
						code: "NOT_AVAILABLE",
						message: "No memory providers available",
						recoverable: true,
					} as ProtocolError,
					metadata: {
						generatedAt: Date.now(),
						provider: {
							id: "system",
							name: "Memory Protocol System",
							version: "1.0.0",
						},
						dataSource: {
							timeRange: { start: 0, end: 0 },
							categories: [],
						},
					},
				};
			}

			const providerResult = await provider.getContext(options);
			return convertToContextResult(providerResult, provider.providerId);
		},

		getAggregatedContext: async (options) => {
			const availableProviders = Array.from(providers.values()).filter((p) =>
				p.isPermissionGranted(),
			);

			if (availableProviders.length === 0) {
				return {
					success: false,
					error: {
						code: "PERMISSION_DENIED",
						message: "No providers available with permissions",
						recoverable: true,
					} as ProtocolError,
					metadata: {
						generatedAt: Date.now(),
						provider: {
							id: "system",
							name: "Memory Protocol System",
							version: "1.0.0",
						},
						dataSource: {
							timeRange: { start: 0, end: 0 },
							categories: [],
						},
						aggregationMethod: "merge" as const,
						providerCount: 0,
					},
					providers: [],
					providerResults: {},
				};
			}

			// Get context from all providers
			const results = await Promise.all(
				availableProviders.map((p) => p.getContext(options)),
			);
			const successful = results.filter((r) => r.success && r.data);

			if (successful.length === 0) {
				return {
					success: false,
					error: {
						code: "NO_DATA",
						message: "No providers returned successful context",
						recoverable: true,
					} as ProtocolError,
					metadata: {
						generatedAt: Date.now(),
						provider: {
							id: "system",
							name: "Memory Protocol System",
							version: "1.0.0",
						},
						dataSource: {
							timeRange: { start: 0, end: 0 },
							categories: [],
						},
						aggregationMethod: "merge" as const,
						providerCount: availableProviders.length,
					},
					providers: availableProviders.map((p) => p.providerId),
					providerResults: Object.fromEntries(
						results.map((result, index) => [
							availableProviders[index].providerId,
							result,
						]),
					),
				};
			}

			// Merge contexts (simplified implementation)
			const mergedContext = mergeContexts(
				successful
					.map((r) => r.data)
					.filter(Boolean) as import("@wamp/protocol").MemoryContext[],
				options,
			);

			return {
				success: true,
				data: mergedContext,
				metadata: {
					generatedAt: Date.now(),
					provider: {
						id: "aggregated",
						name: "Aggregated",
						version: "1.0.0",
					},
					dataSource: {
						timeRange: options?.timeRange ?? {
							start: Date.now() - 7 * 24 * 60 * 60 * 1000,
							end: Date.now(),
						},
						categories: ["all"],
					},
					aggregationMethod: "merge" as const,
					providerCount: successful.length,
				},
				providers: availableProviders.map((p) => p.providerId),
				providerResults: Object.fromEntries(
					results.map((result, index) => [
						availableProviders[index].providerId,
						result,
					]),
				),
			};
		},

		// Permission management
		isPermissionGranted: (providerId, domain) => {
			if (providerId) {
				const provider = providers.get(providerId);
				return provider?.isPermissionGranted(domain) ?? false;
			}
			return Array.from(providers.values()).some((p) =>
				p.isPermissionGranted(domain),
			);
		},

		requestPermission: async (appInfo, providerId) => {
			const provider = providerId
				? providers.get(providerId)
				: Array.from(providers.values())[0];

			if (!provider) {
				return {
					granted: false,
					isFirstTime: true,
					permissions: [],
				};
			}

			return provider.requestPermission(appInfo);
		},

		// Event handling
		addEventListener: (event, callback) => {
			if (!listeners.has(event)) {
				listeners.set(event, new Set());
			}
			listeners.get(event)?.add(callback);
		},

		removeEventListener: (event, callback) => {
			const eventListeners = listeners.get(event);
			if (eventListeners) {
				eventListeners.delete(callback);
				if (eventListeners.size === 0) {
					listeners.delete(event);
				}
			}
		},

		dispatchEvent: (event) => {
			const eventType = event.type;
			const eventListeners = listeners.get(eventType);
			if (eventListeners) {
				eventListeners.forEach((callback) => {
					try {
						callback(event as CustomEvent);
					} catch (error) {
						console.error(
							`[Registry] Error in event listener for ${eventType}:`,
							error,
						);
					}
				});
			}

			// Also dispatch to window
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent(`agentMemory:${eventType}`, {
						detail: (event as CustomEvent).detail || {},
					}),
				);
			}

			return true;
		},

		// Context provision methods (stub implementations)
		provideContext: async (context, options, providerId) => {
			// This is a basic stub - in a real implementation you'd find the appropriate provider
			// and delegate to its provideContext method if available
			const provider = providerId
				? providers.get(providerId)
				: Array.from(providers.values()).find((p) => (p as any).provideContext);

			if (!provider || !(provider as any).provideContext) {
				return {
					success: false,
					processed: false,
					acknowledged: false,
					memoriesAccepted: 0,
					memoriesRejected: context.memories?.length || 0,
					error: {
						code: "NOT_AVAILABLE" as const,
						message: "No providers support context provision",
						recoverable: true,
					},
				};
			}

			try {
				return await (provider as any).provideContext(context, options);
			} catch (error) {
				return {
					success: false,
					processed: false,
					acknowledged: false,
					memoriesAccepted: 0,
					memoriesRejected: context.memories?.length || 0,
					error: {
						code: "PROVIDER_ERROR" as const,
						message: error instanceof Error ? error.message : "Unknown error",
						recoverable: false,
					},
				};
			}
		},

		contributeMemory: async (memories, source, providerId) => {
			const provider = providerId
				? providers.get(providerId)
				: Array.from(providers.values()).find(
						(p) => (p as any).contributeMemory,
					);

			if (!provider || !(provider as any).contributeMemory) {
				return {
					success: false,
					processed: false,
					acknowledged: false,
					memoriesAccepted: 0,
					memoriesRejected: memories.length,
					error: {
						code: "NOT_AVAILABLE" as const,
						message: "No providers support memory contribution",
						recoverable: true,
					},
				};
			}

			try {
				return await (provider as any).contributeMemory(memories, source);
			} catch (error) {
				return {
					success: false,
					processed: false,
					acknowledged: false,
					memoriesAccepted: 0,
					memoriesRejected: memories.length,
					error: {
						code: "PROVIDER_ERROR" as const,
						message: error instanceof Error ? error.message : "Unknown error",
						recoverable: false,
					},
				};
			}
		},
	} as AgentMemoryRegistry;

	return registry;
}

/**
 * Simple context merging (could be enhanced)
 */
function mergeContexts(
	contexts: import("@wamp/protocol").MemoryContext[],
	options?: ContextOptions,
): import("@wamp/protocol").MemoryContext {
	if (contexts.length === 0) {
		return {
			memories: [],
		};
	}

	if (contexts.length === 1) {
		return contexts[0];
	}

	// Merge and deduplicate memories
	const allMemories = contexts.flatMap((c) => c.memories);
	const memoryMap = new Map<string, import("@wamp/protocol").Memory>();

	allMemories.forEach((memory) => {
		const key = memory.text.toLowerCase().trim();
		const existing = memoryMap.get(key);
		if (!existing || memory.relevance > existing.relevance) {
			memoryMap.set(key, memory);
		}
	});

	// Sort by relevance and limit
	const memories = Array.from(memoryMap.values())
		.sort((a, b) => b.relevance - a.relevance)
		.slice(0, options?.topK ?? 50);

	return {
		memories,
	};
}

/**
 * Dispatch events
 */
function dispatchEvent(
	eventType: string,
	detail: unknown,
	registry: AgentMemoryRegistry,
): void {
	registry.dispatchEvent(new CustomEvent(eventType, { detail }));
}

/**
 * Inject registry globally
 */
export function injectRegistry(): void {
	initializeRegistry({ autoInject: true });
}
