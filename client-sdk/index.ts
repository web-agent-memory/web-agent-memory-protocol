/**
 * Simplified Memory Protocol Client SDK
 * Functional approach instead of class-based design
 */

import type {
	AppInfo,
	ContextOptions,
	ContextProvisionResult,
	ContextResult,
	Memory,
	MemoryProvider,
	ProtocolStatus,
	WebAgentContext,
	WebAgentContextOptions,
} from "@wamp/protocol";
import { isProtocolAvailable, TimeUtils } from "@wamp/protocol";

// Import waitForProtocol helper for internal use
import { waitForProtocol } from "./helpers";

// Re-export helper functions for external use
export {
	checkAllPermissions,
	getContextSafely,
	getProviderByName,
	requestAllPermissions,
	selectBestProvider,
} from "./helpers";

// Simplified configuration interface
export interface MemorySDKConfig {
	/** Application name (shown in permission dialogs) */
	appName: string;
	/** Unique application identifier */
	appId: string;
	/** Use mock data in development (default: false) */
	mockMode?: boolean;
	/** Show install prompt if no providers available (default: true) */
	showInstallPrompt?: boolean;
	/** Preferred provider ID */
	preferredProvider?: string;
	/** Enable debug logging (default: false) */
	debug?: boolean;
	/** Agent type for context provision (default: "assistant") */
	agentType?: "assistant" | "chatbot" | "tool" | "service" | "other";
	/** Agent version identifier */
	agentVersion?: string;
	/** Enable write operations for context sharing (default: false) */
	enableWrite?: boolean;
	/** Default session ID for context grouping */
	sessionId?: string;
}

// Simplified client interface
export interface MemoryClient {
	/** Whether the protocol is available */
	readonly available: boolean;
	/** Whether any providers are installed */
	readonly providersInstalled: boolean;
	/** Whether permission is granted for the current domain */
	readonly permissionGranted: boolean;
	/** Active provider information */
	readonly provider: MemoryProvider | null;
	/** Configuration used for initialization */
	readonly config: MemorySDKConfig;
	/** Internal property for mock mode */
	readonly __mockMode?: boolean;
	/** Internal property for protocol reference */
	readonly __protocol?: import("@wamp/protocol").AgentMemoryRegistry;
}

/**
 * Initialize the SDK with configuration
 */
export async function initMemoryClient(
	config: MemorySDKConfig,
): Promise<MemoryClient> {
	// Validate configuration
	if (!config.appName || !config.appId) {
		throw new Error("MemoryClientSDK: appName and appId are required");
	}

	if (config.appId.length < 3) {
		throw new Error(
			"MemoryClientSDK: appId must be at least 3 characters long",
		);
	}

	// Handle mock mode
	if (config.mockMode) {
		return {
			available: true,
			providersInstalled: true,
			permissionGranted: true,
			provider: null,
			config,
			__mockMode: true,
		} as MemoryClient & { __mockMode: true };
	}

	// Wait for protocol to be available
	const protocol = await waitForProtocol(2000);

	if (!protocol) {
		// No protocol available
		return {
			available: false,
			providersInstalled: false,
			permissionGranted: false,
			provider: null,
			config,
		};
	}

	// Protocol available - create client
	const providers = protocol.getProviders();
	const selectedProvider = config.preferredProvider
		? protocol.getProvider(config.preferredProvider)
		: providers[0];

	return {
		available: true,
		providersInstalled: providers.length > 0,
		get permissionGranted() {
			return selectedProvider?.isPermissionGranted() || false;
		},
		provider: selectedProvider || null,
		config,
		__protocol: protocol,
	};
}

/**
 * Get context from a client
 */
export async function getContext(
	client: MemoryClient,
	options?: ContextOptions,
): Promise<ContextResult> {
	// Mock mode implementation
	if (client.__mockMode) {
		return {
			success: true,
			data: {
				memories: [
					{
						text: "Mock memory for development",
						relevance: 0.8,
						timestamp: Date.now(),
						source: "mock",
					},
				],
			},
			metadata: {
				generatedAt: Date.now(),
				provider: { id: "mock", name: "Mock Provider", version: "1.0.0" },
				dataSource: {
					timeRange: options?.timeRange || TimeUtils.lastDays(7),
					categories: options?.categories || ["mock"],
				},
				isMockData: true,
			},
		};
	}

	// Standard implementation
	if (!client.available) {
		return {
			success: false,
			error: {
				code: "NOT_AVAILABLE",
				message:
					"Memory Protocol is not available. Please install a compatible extension.",
				recoverable: true,
				suggestedAction: "Install a memory extension",
			},
			metadata: {
				generatedAt: Date.now(),
				provider: { id: "none", name: "None", version: "0.0.0" },
				dataSource: {
					timeRange: { start: 0, end: 0 },
					categories: [],
				},
			},
		};
	}

	// Get the protocol from client
	const protocol = client.__protocol;
	if (!protocol) {
		return {
			success: false,
			error: {
				code: "NOT_AVAILABLE",
				message: "Memory Protocol is not available",
				recoverable: false,
			},
			metadata: {
				generatedAt: Date.now(),
				provider: { id: "none", name: "None", version: "0.0.0" },
				dataSource: {
					timeRange: { start: 0, end: 0 },
					categories: [],
				},
			},
		};
	}

	return await protocol.getContext(
		options || {},
		client.config.preferredProvider,
	);
}

/**
 * Request permission for a client
 */
export async function requestPermission(
	client: MemoryClient,
	appInfo?: AppInfo,
): Promise<{
	granted: boolean;
	capabilities?: { read: boolean; write: boolean };
}> {
	if (client.__mockMode) {
		return {
			granted: true,
			capabilities: { read: true, write: true },
		};
	}

	if (!client.available || !client.provider) {
		return { granted: false };
	}

	const requestInfo =
		appInfo ||
		({
			appName: client.config.appName,
			appId: client.config.appId,
			description: `${client.config.appName} would like to access your browsing context to provide personalized experiences.`,
			requestedCapabilities: {
				read: true,
				write: client.config.enableWrite || false,
			},
		} as AppInfo & {
			requestedCapabilities: {
				read: boolean;
				write: boolean;
			};
		});

	try {
		const result = await client.provider.requestPermission(requestInfo);
		return {
			granted: result.granted,
			capabilities: (result as any).capabilities,
		};
	} catch (_error) {
		return { granted: false };
	}
}

/**
 * Check if the protocol is available
 */
export function isAvailable(): boolean {
	return isProtocolAvailable();
}

/**
 * Check specific permissions for a client
 */
export function hasPermission(
	client: MemoryClient,
	capability: "read" | "write",
): boolean {
	if (client.__mockMode) {
		return true;
	}

	if (!client.available || !client.provider) {
		return false;
	}

	// Check if provider supports permission checking
	if (typeof (client.provider as any).isPermissionGranted === "function") {
		return (client.provider as any).isPermissionGranted(undefined, capability);
	}

	// Fall back to basic permission check
	return client.permissionGranted;
}

/**
 * Get protocol status
 */
export async function getProtocolStatus(): Promise<ProtocolStatus | null> {
	const protocol = await waitForProtocol(1000);
	return protocol?.getStatus() || null;
}

/**
 * Provide context to extension providers
 */
export async function provideContext(
	client: MemoryClient,
	context: Omit<
		WebAgentContext,
		"agentId" | "agentName" | "timestamp" | "domain"
	>,
	options?: WebAgentContextOptions,
): Promise<ContextProvisionResult> {
	if (client.__mockMode) {
		// Mock response for development
		return {
			success: true,
			processed: true,
			acknowledged: true,
			memoriesAccepted: context.memories.length,
			memoriesRejected: 0,
			contextId: `mock_${Date.now()}`,
			storedUntil: Date.now() + 24 * 60 * 60 * 1000,
			storageLocation: "memory",
			processingTimeMs: 10,
			sizeBytes: JSON.stringify(context).length,
			metadata: {
				providerId: "mock",
				timestamp: Date.now(),
				version: "1.0.0",
			},
		};
	}

	if (!client.available || !client.__protocol) {
		return {
			success: false,
			processed: false,
			acknowledged: false,
			memoriesAccepted: 0,
			memoriesRejected: context.memories.length,
			error: {
				code: "NOT_AVAILABLE",
				message: "Memory Protocol is not available",
				recoverable: true,
				suggestedAction: "Install a compatible extension",
			},
		};
	}

	// Create full web agent context
	const webAgentContext: WebAgentContext = {
		agentId: client.config.appId,
		agentName: client.config.appName,
		agentVersion: client.config.agentVersion,
		agentType: client.config.agentType || "assistant",
		timestamp: Date.now(),
		domain:
			typeof window !== "undefined" ? window.location.hostname : "localhost",
		sessionId: client.config.sessionId,
		...context,
	};

	try {
		return await client.__protocol.provideContext(
			webAgentContext,
			options,
			client.config.preferredProvider,
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
		};
	}
}

/**
 * Contribute memories directly to extension providers
 */
export async function contributeMemory(
	client: MemoryClient,
	memories: Memory[],
	source?: string,
): Promise<ContextProvisionResult> {
	if (client.__mockMode) {
		// Mock response for development
		return {
			success: true,
			processed: true,
			acknowledged: true,
			memoriesAccepted: memories.length,
			memoriesRejected: 0,
			contextId: `mock_${Date.now()}`,
			storedUntil: Date.now() + 24 * 60 * 60 * 1000,
			storageLocation: "memory",
			processingTimeMs: 5,
			sizeBytes: JSON.stringify(memories).length,
			metadata: {
				providerId: "mock",
				timestamp: Date.now(),
				version: "1.0.0",
			},
		};
	}

	if (!client.available || !client.__protocol) {
		return {
			success: false,
			processed: false,
			acknowledged: false,
			memoriesAccepted: 0,
			memoriesRejected: memories.length,
			error: {
				code: "NOT_AVAILABLE",
				message: "Memory Protocol is not available",
				recoverable: true,
				suggestedAction: "Install a compatible extension",
			},
		};
	}

	try {
		return await client.__protocol.contributeMemory(
			memories,
			source || client.config.appName,
			client.config.preferredProvider,
		);
	} catch (error) {
		return {
			success: false,
			processed: false,
			acknowledged: false,
			memoriesAccepted: 0,
			memoriesRejected: memories.length,
			error: {
				code: "PROVIDER_ERROR",
				message:
					error instanceof Error ? error.message : "Unknown error occurred",
				recoverable: false,
			},
		};
	}
}

/**
 * Helper function to create memories from text content
 */
export function createMemories(
	content: string | string[],
	options?: {
		source?: string;
		relevance?: number;
		timestamp?: number;
		metadata?: Record<string, unknown>;
	},
): Memory[] {
	const contents = Array.isArray(content) ? content : [content];
	const defaultOptions = {
		source: "user-input",
		relevance: 0.8,
		timestamp: Date.now(),
		metadata: {},
		...options,
	};

	return contents.map((text) => ({
		text: text.trim(),
		relevance: defaultOptions.relevance,
		timestamp: defaultOptions.timestamp,
		source: defaultOptions.source,
		metadata: defaultOptions.metadata,
	}));
}

/**
 * Helper function to create conversation context from chat history
 */
export function createConversationContext(
	messages: Array<{ role: string; content: string; timestamp?: number }>,
	options?: {
		contextType?: "conversation" | "task" | "document" | "analysis" | "other";
		categories?: string[];
		relevanceScore?: number;
		persistent?: boolean;
	},
): Omit<WebAgentContext, "agentId" | "agentName" | "timestamp" | "domain"> {
	const memories = messages.map((message, index) => ({
		text: `${message.role}: ${message.content}`,
		relevance: 0.7 + (index / messages.length) * 0.3, // Later messages are more relevant
		timestamp:
			message.timestamp || Date.now() - (messages.length - index) * 60000,
		source: "conversation",
		metadata: {
			role: message.role,
			messageIndex: index,
			totalMessages: messages.length,
		},
	}));

	return {
		memories,
		contextType: options?.contextType || "conversation",
		categories: options?.categories || ["chat", "conversation"],
		relevanceScore: options?.relevanceScore || 0.8,
		persistent: options?.persistent || false,
		source: {
			type: "user-input",
			description: "Conversation history provided by web agent",
			confidence: 0.9,
		},
	};
}
