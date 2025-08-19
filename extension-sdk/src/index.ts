/**
 * Simplified Memory Protocol Extension SDK
 * Fully functional approach with no classes
 */

import type {
	AgentMemoryRegistry,
	AppInfo,
	ContextOptions,
	ContextProvisionResult,
	MemoryContext,
	MemoryProvider,
	PermissionResult,
	PermissionType,
	ProtocolError,
	ProviderCapabilities,
	ProviderInfo,
	WebAgentContext,
	WebAgentContextOptions,
} from "@wamp/protocol";
import { createStorageKeys } from "@wamp/protocol";

// Simplified provider configuration
export interface ProviderConfig {
	providerId: string;
	providerName: string;
	version: string;
	description?: string;
	author?: string;
	website?: string;
	features?: string[];
	permissions?: string[];
	maxTopK?: number;
	supportedFormats?: string[];
	supportedCategories?: string[];

	// Context provision support
	supportsContextProvision?: boolean;
	maxWebAgentContextSize?: number; // Max size in bytes for web agent context
	webAgentStorageLimit?: number; // Max number of web agent contexts to store
	allowedAgentTypes?: string[]; // Which agent types are allowed
}

// Context data structure
export interface ContextData {
	memories: Array<{
		text: string;
		relevance: number;
		timestamp: number;
		source: string;
		metadata?: Record<string, unknown>;
	}>;
}

// Permission storage
export interface PermissionStorage {
	[domain: string]: {
		granted: boolean;
		grantedAt: number;
		permissions: PermissionType[];
		capabilities: {
			read: boolean;
			write: boolean;
		};
		appInfo?: AppInfo;
		revokedAt?: number;
		lastUsed?: number;
	};
}

// Web agent context storage
export interface WebAgentContextStorage {
	[contextId: string]: {
		context: WebAgentContext;
		receivedAt: number;
		processed: boolean;
		expiresAt?: number;
		size: number;
	};
}

// Provider context handler
export type WebAgentContextHandler = (
	context: WebAgentContext,
	opions?: WebAgentContextOptions,
) => Promise<ContextProvisionResult>;

// Create a simple provider
export function createProvider(
	config: ProviderConfig,
	getContextData: (options?: ContextOptions) => Promise<ContextData>,
	webAgentContextHandler?: WebAgentContextHandler,
): MemoryProvider {
	// Simple permission storage using localStorage
	const storageKeys = createStorageKeys(config.providerId);
	const storageKey = storageKeys.permissions;

	// Get stored permissions
	function getStoredPermissions(): PermissionStorage {
		if (typeof window === "undefined" || typeof localStorage === "undefined") {
			return {};
		}

		try {
			const stored = localStorage.getItem(storageKey);
			return stored ? JSON.parse(stored) : {};
		} catch (error) {
			console.error("[ExtensionSDK] Error reading permissions:", error);
			return {};
		}
	}

	// Store permissions
	async function storePermissions(
		permissions: PermissionStorage,
	): Promise<void> {
		if (typeof localStorage !== "undefined") {
			try {
				localStorage.setItem(storageKey, JSON.stringify(permissions));
			} catch (error) {
				console.error("[ExtensionSDK] Error storing permissions:", error);
			}
		}
	}

	// Check if permission is granted for specific capability
	function isPermissionGranted(
		domain?: string,
		capability?: "read" | "write",
	): boolean {
		const targetDomain =
			domain ||
			(typeof window !== "undefined" && window.location?.hostname) ||
			"localhost";
		const permissions = getStoredPermissions();
		const domainPermission = permissions[targetDomain];

		if (!domainPermission?.granted || domainPermission.revokedAt) {
			return false;
		}

		// If no specific capability requested, check general permission
		if (!capability) {
			return true;
		}

		// Check specific capability
		return domainPermission.capabilities[capability] === true;
	}

	// Request permission from user
	async function requestPermission(
		appInfo: AppInfo,
	): Promise<PermissionResult> {
		const domain =
			appInfo.domain ||
			(typeof window !== "undefined" && window.location?.hostname) ||
			"localhost";

		// Check if already granted
		if (isPermissionGranted(domain)) {
			const existingPermission = getStoredPermissions()[domain];
			return {
				granted: true,
				isFirstTime: false,
				permissions: existingPermission.permissions,
				capabilities: existingPermission.capabilities,
				domain,
			} as any;
		}

		// Check if this is first time for this domain
		const permissions = getStoredPermissions();
		const existingPermission = permissions[domain];
		const isFirstTime = !existingPermission;

		// Show permission dialog with granular options
		let userResponse = {
			granted: false,
			capabilities: { read: false, write: false },
		};

		if (typeof window !== "undefined") {
			const requestedCapabilities = (appInfo as any).requestedCapabilities || {
				read: true,
				write: false,
			};

			// In a real extension, this would be a proper UI dialog with checkboxes
			// For demo, we'll use a series of confirms
			const baseMessage = isFirstTime
				? `${appInfo.appName} wants to access your browsing context. Which permissions do you want to grant?`
				: `${appInfo.appName} is requesting additional permissions. Which do you want to grant?`;

			if (window.confirm(`${baseMessage}\n\nGrant access?`)) {
				userResponse.granted = true;

				if (requestedCapabilities.read) {
					userResponse.capabilities.read = window.confirm(
						"Allow reading your browsing context?",
					);
				}
				if (requestedCapabilities.write) {
					userResponse.capabilities.write = window.confirm(
						"Allow contributing context back to your memory?",
					);
				}
			}
		} else {
			// For testing, auto-grant requested capabilities
			const requestedCapabilities = (appInfo as any).requestedCapabilities || {
				read: true,
				write: false,
			};
			userResponse = {
				granted: true,
				capabilities: {
					read: requestedCapabilities.read || true,
					write: requestedCapabilities.write || false,
				},
			};
		}

		// Build permission list based on granted capabilities
		const grantedPermissions: PermissionType[] = [];
		if (userResponse.capabilities.read) {
			grantedPermissions.push("context.read" as PermissionType);
		}
		if (userResponse.capabilities.write) {
			grantedPermissions.push("context.write" as PermissionType);
		}

		if (userResponse.granted) {
			// Store the permission
			permissions[domain] = {
				granted: true,
				grantedAt: Date.now(),
				permissions: grantedPermissions,
				capabilities: userResponse.capabilities,
				appInfo,
				lastUsed: Date.now(),
			};

			await storePermissions(permissions);

			return {
				granted: true,
				isFirstTime,
				permissions: grantedPermissions,
				capabilities: userResponse.capabilities,
				domain,
			} as any;
		} else {
			// User denied permission
			permissions[domain] = {
				granted: false,
				grantedAt: Date.now(),
				permissions: [],
				capabilities: { read: false, write: false },
				appInfo,
			};

			await storePermissions(permissions);

			return {
				granted: false,
				isFirstTime,
				permissions: [],
				capabilities: { read: false, write: false },
				domain,
			} as any;
		}
	}

	// Web agent context storage
	const webAgentStorageKey = storageKeys.webAgentContext;

	// Get stored web agent contexts
	function getStoredWebAgentContexts(): WebAgentContextStorage {
		if (typeof window === "undefined" || typeof localStorage === "undefined") {
			return {};
		}

		try {
			const stored = localStorage.getItem(webAgentStorageKey);
			const contexts = stored ? JSON.parse(stored) : {};

			// Clean up expired contexts
			const now = Date.now();
			const cleanedContexts: WebAgentContextStorage = {};

			for (const [contextId, contextData] of Object.entries(contexts)) {
				const typedContextData = contextData as WebAgentContextStorage[string];
				if (!typedContextData.expiresAt || typedContextData.expiresAt > now) {
					cleanedContexts[contextId] = typedContextData;
				}
			}

			// Store cleaned contexts back if we removed any
			if (
				Object.keys(cleanedContexts).length !== Object.keys(contexts).length
			) {
				localStorage.setItem(
					webAgentStorageKey,
					JSON.stringify(cleanedContexts),
				);
			}

			return cleanedContexts;
		} catch (error) {
			console.error("[ExtensionSDK] Error reading web agent contexts:", error);
			return {};
		}
	}

	// Store web agent contexts
	async function storeWebAgentContexts(
		contexts: WebAgentContextStorage,
	): Promise<void> {
		if (typeof localStorage !== "undefined") {
			try {
				localStorage.setItem(webAgentStorageKey, JSON.stringify(contexts));
			} catch (error) {
				console.error(
					"[ExtensionSDK] Error storing web agent contexts:",
					error,
				);
			}
		}
	}

	// Handle incoming web agent context
	async function handleWebAgentContext(
		context: WebAgentContext,
		options?: WebAgentContextOptions,
	): Promise<ContextProvisionResult> {
		const startTime = Date.now();

		try {
			// Validate permission for write context
			if (!isPermissionGranted(context.domain, "write")) {
				return {
					success: false,
					processed: false,
					acknowledged: false,
					memoriesAccepted: 0,
					memoriesRejected: context.memories.length,
					rejectionReasons: ["Permission denied for domain"],
					error: {
						code: "PERMISSION_DENIED",
						message: `Permission required for domain: ${context.domain}`,
						recoverable: true,
						suggestedAction: "Request permission from user",
					},
					processingTimeMs: Date.now() - startTime,
				};
			}

			// Check agent type restrictions
			if (config.allowedAgentTypes && context.agentType) {
				if (!config.allowedAgentTypes.includes(context.agentType)) {
					return {
						success: false,
						processed: false,
						acknowledged: false,
						memoriesAccepted: 0,
						memoriesRejected: context.memories.length,
						rejectionReasons: [`Agent type '${context.agentType}' not allowed`],
						error: {
							code: "INVALID_OPTIONS",
							message: `Agent type '${context.agentType}' is not allowed`,
							recoverable: false,
						},
						processingTimeMs: Date.now() - startTime,
					};
				}
			}

			// Check size limits
			const contextSize = JSON.stringify(context).length;
			if (
				config.maxWebAgentContextSize &&
				contextSize > config.maxWebAgentContextSize
			) {
				return {
					success: false,
					processed: false,
					acknowledged: false,
					memoriesAccepted: 0,
					memoriesRejected: context.memories.length,
					rejectionReasons: ["Context size exceeds limit"],
					error: {
						code: "INVALID_OPTIONS",
						message: "Context size exceeds maximum allowed limit",
						recoverable: false,
					},
					processingTimeMs: Date.now() - startTime,
				};
			}

			// Generate context ID
			const contextId = `${context.agentId}_${context.sessionId || "default"}_${context.timestamp}`;

			// Store context
			const storedContexts = getStoredWebAgentContexts();
			const storageLimit = config.webAgentStorageLimit || 100;

			// Remove oldest contexts if at limit
			const contextEntries = Object.entries(storedContexts);
			if (contextEntries.length >= storageLimit) {
				const sortedEntries = contextEntries.sort(
					(a, b) => a[1].receivedAt - b[1].receivedAt,
				);
				const toRemove = sortedEntries.slice(
					0,
					contextEntries.length - storageLimit + 1,
				);
				for (const [id] of toRemove) {
					delete storedContexts[id];
				}
			}

			// Calculate expiry
			const expiresAt =
				context.expiresAt ||
				(options?.storageType === "ephemeral"
					? Date.now() + 5 * 60 * 1000 // 5 minutes for ephemeral
					: Date.now() + 24 * 60 * 60 * 1000); // 24 hours default

			// Store new context
			storedContexts[contextId] = {
				context,
				receivedAt: Date.now(),
				processed: false,
				expiresAt,
				size: contextSize,
			};

			await storeWebAgentContexts(storedContexts);

			// Use custom handler if provided
			let handlerResult: ContextProvisionResult | null = null;
			if (webAgentContextHandler) {
				try {
					handlerResult = await webAgentContextHandler(context, options);
				} catch (error) {
					console.warn(
						"[ExtensionSDK] Web agent context handler failed:",
						error,
					);
				}
			}

			// Mark as processed
			storedContexts[contextId].processed = true;
			await storeWebAgentContexts(storedContexts);

			return (
				handlerResult || {
					success: true,
					processed: true,
					acknowledged: true,
					memoriesAccepted: context.memories.length,
					memoriesRejected: 0,
					contextId,
					storedUntil: expiresAt,
					storageLocation: "memory",
					processingTimeMs: Date.now() - startTime,
					sizeBytes: contextSize,
					metadata: {
						providerId: config.providerId,
						timestamp: Date.now(),
						version: config.version,
					},
				}
			);
		} catch (error) {
			return {
				success: false,
				processed: false,
				acknowledged: false,
				memoriesAccepted: 0,
				memoriesRejected: context.memories.length,
				error: {
					code: "PROVIDER_ERROR",
					message:
						error instanceof Error ? error.message : "Unknown error occurred",
					recoverable: false,
				},
				processingTimeMs: Date.now() - startTime,
			};
		}
	}

	// Get context from the provider
	async function getContext(options?: ContextOptions) {
		try {
			// Check read permissions first
			const domain =
				(typeof window !== "undefined" && window.location?.hostname) ||
				"localhost";
			if (!isPermissionGranted(domain, "read")) {
				return {
					success: false,
					error: "Permission required to access memory data",
					metadata: {
						generatedAt: Date.now(),
						provider: {
							id: config.providerId,
							name: config.providerName,
							version: config.version,
						},
						dataSource: {
							timeRange: { start: 0, end: 0 },
							categories: [],
						},
					},
				};
			}

			// Get raw context data from the extension implementation
			const contextData = await getContextData(options);

			// Build standardized response
			return {
				success: true,
				data: {
					memories: contextData.memories.slice(0, 50), // Limit to 50 memories
				},
				metadata: {
					generatedAt: Date.now(),
					provider: {
						id: config.providerId,
						name: config.providerName,
						version: config.version,
					},
					dataSource: {
						timeRange: options?.timeRange || {
							start: Date.now() - 7 * 24 * 60 * 60 * 1000,
							end: Date.now(),
						},
						categories: options?.categories || ["all"],
					},
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Unknown provider error",
				metadata: {
					generatedAt: Date.now(),
					provider: {
						id: config.providerId,
						name: config.providerName,
						version: config.version,
					},
					dataSource: {
						timeRange: { start: 0, end: 0 },
						categories: [],
					},
				},
			};
		}
	}

	// Return the provider object
	return {
		get providerId() {
			return config.providerId;
		},

		get providerName() {
			return config.providerName;
		},

		get version() {
			return config.version;
		},

		getCapabilities(): ProviderCapabilities {
			return {
				supportedOptions: {
					relevanceQuery: true,
					timeRange: true,
					topK: true,
					format: true,
					categories: true,
				},
				maxTopK: config.maxTopK ?? 50,
				formats: config.supportedFormats ?? ["structured", "narrative"],
				categories: config.supportedCategories ?? [
					"browsing",
					"search",
					"documents",
				],
			};
		},

		getProviderInfo(): ProviderInfo {
			return {
				providerId: config.providerId,
				providerName: config.providerName,
				version: config.version,
				description:
					config.description ?? `${config.providerName} memory provider`,
				author: config.author,
				website: config.website,
				features: config.features ?? ["context-retrieval"],
				permissions: config.permissions ?? ["context"],
			};
		},

		isPermissionGranted,
		requestPermission,
		getContext,

		// Context provision methods (optional)
		...(config.supportsContextProvision !== false && {
			provideContext: handleWebAgentContext,
			contributeMemory: async (
				memories: Array<{
					text: string;
					relevance: number;
					timestamp: number;
					source: string;
					metadata?: Record<string, unknown>;
				}>,
				source: string,
			) => {
				// Create a web agent context from the memories
				const context: WebAgentContext = {
					agentId: source,
					agentName: source,
					agentType: "other",
					memories,
					contextType: "other",
					timestamp: Date.now(),
					domain:
						(typeof window !== "undefined" && window.location?.hostname) ||
						"localhost",
					source: {
						type: "external-api",
						description: `Memories contributed from ${source}`,
						confidence: 1.0,
					},
				};

				return handleWebAgentContext(context);
			},
		}),
	};
}

// Initialize a simple extension
export async function initializeExtension(config: {
	providerId: string;
	providerName: string;
	version: string;
	getContextData: (options?: ContextOptions) => Promise<ContextData>;
	description?: string;
	debug?: boolean;
}): Promise<MemoryProvider> {
	// Create the provider
	const provider = createProvider(
		{
			providerId: config.providerId,
			providerName: config.providerName,
			version: config.version,
			description: config.description,
		},
		config.getContextData,
	);

	// Ensure registry exists
	ensureRegistryExists();

	// Register the provider
	const registry = getRegistry();
	if (registry) {
		registry.registerProvider(provider);

		if (config.debug) {
			console.log(`[ExtensionSDK] Registered provider: ${config.providerName}`);
		}
	} else if (config.debug) {
		console.log("[ExtensionSDK] No registry available to register provider");
	}

	return provider;
}

// Get the global registry
function getRegistry(): AgentMemoryRegistry | null {
	if (typeof window !== "undefined") {
		return (window as any).agentMemory || null;
	}
	return null;
}

// Ensure the registry exists in the global scope
function ensureRegistryExists(): void {
	if (typeof window === "undefined") {
		// Not in browser context
		return;
	}

	// Check if registry already exists
	if ((window as any).agentMemory) {
		return;
	}

	// Create the registry
	const registry = createRegistry();
	(window as any).agentMemory = registry;
}

// Create a new registry instance
function createRegistry(): AgentMemoryRegistry {
	const providers = new Map<string, MemoryProvider>();
	const listeners = new Map<string, Set<(event: CustomEvent) => void>>();

	const registry: AgentMemoryRegistry = {
		version: "1.0.0",
		spec: "1.0",
		providers,

		// Provider management
		registerProvider: (provider: MemoryProvider) => {
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

			// Convert ProviderContextResult to ContextResult
			const metadata: any = {
				...providerResult.metadata,
				generatedAt: providerResult.metadata?.generatedAt ?? Date.now(),
				provider: providerResult.metadata?.provider ?? {
					id: provider.providerId,
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
				successful.map((r) => r.data).filter(Boolean) as MemoryContext[],
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

		// Context provision methods
		provideContext: async (context, options, providerId) => {
			const provider = providerId
				? providers.get(providerId)
				: Array.from(providers.values()).find(
						(p) =>
							(p as any).provideContext &&
							p.isPermissionGranted(context.domain),
					);

			if (!provider || !(provider as any).provideContext) {
				return {
					success: false,
					processed: false,
					acknowledged: false,
					memoriesAccepted: 0,
					memoriesRejected: context.memories.length,
					error: {
						code: "NOT_AVAILABLE",
						message: "No providers support context provision",
						recoverable: true,
					} as ProtocolError,
					processingTimeMs: 0,
				};
			}

			const result = await (provider as any).provideContext(context, options);

			// Dispatch context provided event
			registry.dispatchEvent(
				new CustomEvent("context-provided", {
					detail: {
						providerId: provider.providerId,
						source: context.agentId,
						contextType: context.contextType,
						success: result.success,
					},
				}),
			);

			return result;
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
						code: "NOT_AVAILABLE",
						message: "No providers support memory contribution",
						recoverable: true,
					} as ProtocolError,
					processingTimeMs: 0,
				};
			}

			return (provider as any).contributeMemory(memories, source);
		},
	};

	return registry;
}

// Simple context merging
function mergeContexts(contexts: MemoryContext[]): MemoryContext {
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
	const memoryMap = new Map<string, any>();

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
		.slice(0, 50);

	return {
		memories,
	};
}

// Create mock context data for testing
export function createMockContextData(): ContextData {
	return {
		memories: [
			{
				text: "User is primarily engaged with software development tools and resources",
				relevance: 0.8,
				timestamp: Date.now() - 3600000,
				source: "browsing",
				metadata: { category: "programming", focus: "development" },
			},
			{
				text: "Frequently works with TypeScript, JavaScript, and web development projects",
				relevance: 0.9,
				timestamp: Date.now() - 1800000,
				source: "browsing",
				metadata: {
					keywords: [
						"typescript",
						"javascript",
						"programming",
						"web development",
					],
					category: "programming",
				},
			},
			{
				text: "Recently read Memory Protocol documentation",
				relevance: 0.8,
				timestamp: Date.now() - 1800000,
				source: "browsing",
				metadata: {
					url: "https://github.com/web-agent-memory/web-agent-memory-protocol",
					category: "documentation",
				},
			},
		],
	};
}

// Validate context data structure
export function validateContextData(data: ContextData): boolean {
	try {
		// Basic structure validation
		if (typeof data !== "object" || data === null) {
			return false;
		}

		// Validate memories
		if (!data.memories || !Array.isArray(data.memories)) {
			return false;
		}

		for (const memory of data.memories) {
			if (
				typeof memory.text !== "string" ||
				typeof memory.relevance !== "number" ||
				typeof memory.timestamp !== "number" ||
				typeof memory.source !== "string"
			) {
				return false;
			}

			if (memory.relevance < 0 || memory.relevance > 1) {
				return false;
			}

			if (!memory.text.trim() || !memory.source.trim()) {
				return false;
			}
		}

		return true;
	} catch (_error) {
		return false;
	}
}
