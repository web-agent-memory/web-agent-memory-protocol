/**
 * Memory Protocol Browser API Type Definitions
 * Specification Version: 1.0
 */

declare global {
	interface Window {
		agentMemory?: AgentMemoryRegistry;
	}

	// Custom events for protocol lifecycle
	interface WindowEventMap {
		agentMemoryReady: CustomEvent<{ providerId: string }>;
		agentMemoryProviderRegistered: CustomEvent<{ providerId: string }>;
		agentMemoryProviderUnregistered: CustomEvent<{ providerId: string }>;
		agentMemoryPermissionGranted: CustomEvent<{
			providerId: string;
			domain: string;
		}>;
		agentMemoryPermissionRevoked: CustomEvent<{
			providerId: string;
			domain: string;
		}>;
		agentMemoryContextProvided: CustomEvent<{
			providerId: string;
			source: string;
			contextType: string;
		}>;
		agentMemoryContextReceived: CustomEvent<{
			providerId: string;
			source: string;
			processed: boolean;
		}>;
		agentMemoryContextProcessed: CustomEvent<{
			providerId: string;
			source: string;
			result: string;
		}>;
	}
}

/**
 * Main protocol registry interface
 */
export interface AgentMemoryRegistry {
	/** Protocol version */
	readonly version: string;
	/** Protocol specification version */
	readonly spec: string;

	/** Map of registered providers */
	readonly providers: Map<string, MemoryProvider>;
	/**
	 * Register a new memory provider
	 * @param provider - The provider to register
	 */
	registerProvider(provider: MemoryProvider): void;
	/**
	 * Unregister a memory provider
	 * @param providerId - The ID of the provider to unregister
	 * @returns True if the provider was unregistered, false otherwise
	 */
	unregisterProvider(providerId: string): boolean;
	/**
	 * Get all registered providers
	 * @returns An array of all registered providers
	 */
	getProviders(): MemoryProvider[];
	/**
	 * Get a specific provider by ID
	 * @param providerId - The ID of the provider to get
	 * @returns The provider if found, otherwise undefined
	 */
	getProvider(providerId: string): MemoryProvider | undefined;

	/**
	 * Get the status of the protocol and all providers
	 * @returns The current protocol status
	 */
	getStatus(): ProtocolStatus;
	/**
	 * Get installation information for recommended providers
	 * @returns Installation information
	 */
	getInstallationInfo(): InstallationInfo;

	/**
	 * Get context from a specific provider or the default provider
	 * @param options - Context request options
	 * @param providerId - Optional provider ID to use
	 * @returns A promise that resolves with the context result
	 */
	getContext(
		options?: ContextOptions,
		providerId?: string,
	): Promise<ContextResult>;
	/**
	 * Get aggregated context from all available providers
	 * @param options - Context request options
	 * @returns A promise that resolves with the aggregated context result
	 */
	getAggregatedContext(
		options?: ContextOptions,
	): Promise<AggregatedContextResult>;

	/**
	 * Provide context from a web agent to the extension
	 * @param context - The context to provide
	 * @param options - Options for providing context
	 * @param providerId - Optional provider ID to use
	 * @returns A promise that resolves with the context provision result
	 */
	provideContext(
		context: WebAgentContext,
		options?: WebAgentContextOptions,
		providerId?: string,
	): Promise<ContextProvisionResult>;
	/**
	 * Contribute memories to the extension
	 * @param memories - The memories to contribute
	 * @param source - The source of the memories
	 * @param providerId - Optional provider ID to use
	 * @returns A promise that resolves with the context provision result
	 */
	contributeMemory(
		memories: Memory[],
		source: string,
		providerId?: string,
	): Promise<ContextProvisionResult>;

	/**
	 * Check if permission is granted for a specific provider and domain
	 * @param providerId - Optional provider ID to check
	 * @param domain - Optional domain to check
	 * @returns True if permission is granted, false otherwise
	 */
	isPermissionGranted(providerId?: string, domain?: string): boolean;
	/**
	 * Request permission from the user
	 * @param appInfo - Information about the application requesting permission
	 * @param providerId - Optional provider ID to request permission from
	 * @returns A promise that resolves with the permission result
	 */
	requestPermission(
		appInfo: AppInfo,
		providerId?: string,
	): Promise<PermissionResult>;

	/**
	 * Show an install dialog for recommended providers
	 * @param options - Options for the install dialog
	 */
	showInstallDialog?(options?: InstallDialogOptions): void;

	/**
	 * Add an event listener for protocol events
	 * @param event - The event to listen for
	 * @param callback - The callback to execute when the event is fired
	 */
	addEventListener(event: string, callback: (event: CustomEvent) => void): void;
	/**
	 * Remove an event listener for protocol events
	 * @param event - The event to remove the listener from
	 * @param callback - The callback to remove
	 */
	removeEventListener(
		event: string,
		callback: (event: CustomEvent) => void,
	): void;
	/**
	 * Dispatch a protocol event
	 * @param event - The event to dispatch
	 * @returns True if the event was dispatched, false otherwise
	 */
	dispatchEvent(event: Event): boolean;
}

/**
 * Individual memory provider interface
 */
export interface MemoryProvider {
	/** Unique provider identifier */
	readonly providerId: string;
	/** Provider display name */
	readonly providerName: string;
	/** Provider version */
	readonly version: string;

	/**
	 * Get provider capabilities
	 * @returns The provider's capabilities
	 */
	getCapabilities(): ProviderCapabilities;
	/**
	 * Get provider information
	 * @returns The provider's information
	 */
	getProviderInfo(): ProviderInfo;

	/**
	 * Check if permission is granted for a domain
	 * @param domain - The domain to check
	 * @returns True if permission is granted, false otherwise
	 */
	isPermissionGranted(domain?: string): boolean;
	/**
	 * Request permission from the user
	 * @param appInfo - Information about the application requesting permission
	 * @returns A promise that resolves with the permission result
	 */
	requestPermission(appInfo: AppInfo): Promise<PermissionResult>;

	/**
	 * Get context from the provider
	 * @param options - Context request options
	 * @returns A promise that resolves with the provider context result
	 */
	getContext(options?: ContextOptions): Promise<ProviderContextResult>;

	/**
	 * Provide context from a web agent to the extension
	 * @param context - The context to provide
	 * @param options - Options for providing context
	 * @returns A promise that resolves with the context provision result
	 */
	provideContext?(
		context: WebAgentContext,
		options?: WebAgentContextOptions,
	): Promise<ContextProvisionResult>;
	/**
	 * Contribute memories to the extension
	 * @param memories - The memories to contribute
	 * @param source - The source of the memories
	 * @returns A promise that resolves with the context provision result
	 */
	contributeMemory?(
		memories: Memory[],
		source: string,
	): Promise<ContextProvisionResult>;
}

/**
 * Context request options
 */
export interface ContextOptions {
	/** Content filtering */
	relevanceQuery?: string;
	/** Time range for context retrieval */
	timeRange?: {
		/** Start time as Unix timestamp in ms (optional, defaults to beginning of time) */
		start?: number;
		/** End time as Unix timestamp in ms (optional, defaults to now) */
		end?: number;
	};
	/** Limit results to top K memories by relevance score */
	topK?: number;
	/** Categories to focus on */
	categories?: string[];

	/** Output formatting */
	format?: "raw" | "structured" | "narrative";
	/** Include metadata in the response */
	includeMetadata?: boolean;

	/** Provider-specific options */
	providerOptions?: Record<string, unknown>;
}

/**
 * Context data structure - simplified and flexible
 */
export interface MemoryContext {
	/** Array of user memories */
	memories: Memory[];
}

/**
 * A single memory item
 */
export interface Memory {
	/** Required: The memory content in natural language */
	text: string;
	/** Required: 0-1 relevance score for current context */
	relevance: number;
	/** Required: When this memory was created/observed */
	timestamp: number;
	/** Required: Where this came from (e.g., "browsing", "ide", "calendar") */
	source: string;
	/** Optional: Any additional provider-specific data */
	metadata?: Record<string, unknown>;
}

/**
 * Context result from individual provider
 */
export interface ProviderContextResult {
	/** Whether the request was successful */
	success: boolean;
	/** The context data */
	data?: MemoryContext;
	/** Error message if the request failed */
	error?: string;
	/** Additional metadata about the context */
	metadata?: Partial<ContextMetadata>;
}

/**
 * Standardized context result
 */
export interface ContextResult {
	/** Whether the request was successful */
	success: boolean;
	/** The context data */
	data?: MemoryContext;
	/** Error information if the request failed */
	error?: ProtocolError;
	/** Additional metadata about the context */
	metadata: ContextMetadata;
}

/**
 * Aggregated context from multiple providers
 */
export interface AggregatedContextResult {
	/** Whether the request was successful */
	success: boolean;
	/** The aggregated context data */
	data?: MemoryContext;
	/** Error information if the request failed */
	error?: ProtocolError;
	/** Additional metadata about the aggregated context */
	metadata: AggregatedContextMetadata;
	/** List of provider IDs that contributed to the result */
	providers: string[];
	/** Individual results from each provider */
	providerResults: Record<string, ProviderContextResult>;
}

/**
 * Metadata about the context
 */
export interface ContextMetadata {
	/** When the context was generated */
	generatedAt: number;
	/** The provider that generated the context */
	provider: {
		id: string;
		name: string;
		version: string;
	};
	/** The data source for the context */
	dataSource: {
		timeRange: {
			start?: number;
			end?: number;
		};
		categories: string[];
	};
	/** Whether the data is mock data */
	isMockData?: boolean;
}

/**
 * Metadata for aggregated context
 */
export interface AggregatedContextMetadata extends ContextMetadata {
	/** The method used to aggregate the context */
	aggregationMethod: "merge" | "weighted" | "priority";
	/** The number of providers that contributed to the result */
	providerCount: number;
	/** The number of conflicts resolved during aggregation */
	conflictsResolved?: number;
}

/**
 * Error handling
 */
export interface ProtocolError {
	/** Error code */
	code:
		| "NOT_AVAILABLE"
		| "PERMISSION_DENIED"
		| "NO_DATA"
		| "PROVIDER_ERROR"
		| "NETWORK_ERROR"
		| "INVALID_OPTIONS";
	/** Error message */
	message: string;
	/** Whether the error is recoverable */
	recoverable: boolean;
	/** Suggested action to take */
	suggestedAction?: string;
	/** Additional error details */
	details?: Record<string, unknown>;
}

/**
 * Application information for permission requests
 */
export interface AppInfo {
	/** The name of the application */
	appName: string;
	/** The unique ID of the application */
	appId: string;
	/** The domain of the application */
	domain?: string;
	/** The permissions the application is requesting */
	permissions?: PermissionType[];
	/** A description of the application */
	description?: string;
	/** The URL of the application's icon */
	iconUrl?: string;
	/** The version of the application */
	version?: string;
	/** The capabilities the application is requesting */
	requestedCapabilities?: {
		read?: boolean;
		write?: boolean;
	};
}

/**
 * Permission result
 */
export interface PermissionResult {
	/** Whether the permission was granted */
	granted: boolean;
	/** Whether this is the first time the user is being asked for permission */
	isFirstTime: boolean;
	/** The permissions that were granted */
	permissions: PermissionType[];
	/** When the permission expires */
	expiresAt?: number;
	/** The domain the permission was granted for */
	domain?: string;
	/** Any restrictions on the permission */
	restrictions?: string[];
	/** The capabilities that were granted */
	capabilities?: {
		read: boolean;
		write: boolean;
	};
	/** The permissions that were denied */
	deniedPermissions?: PermissionType[];
}

/**
 * Protocol status
 */
export interface ProtocolStatus {
	/** Whether the protocol is available */
	available: boolean;
	/** The number of registered providers */
	providerCount: number;
	/** The status of each provider */
	providers: ProviderStatus[];
	/** The version of the protocol */
	protocolVersion: string;
	/** The features supported by the protocol */
	features: string[];
}

/**
 * Status of an individual provider
 */
export interface ProviderStatus {
	/** The ID of the provider */
	providerId: string;
	/** The name of the provider */
	providerName: string;
	/** The version of the provider */
	version: string;
	/** Whether the provider is available */
	available: boolean;
	/** Whether permission is granted for the provider */
	permissionGranted: boolean;
	/** The capabilities of the provider */
	capabilities: string[];
	/** When the provider was last seen */
	lastSeen?: number;
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
	/** The options supported by the provider */
	supportedOptions: {
		relevanceQuery?: boolean;
		timeRange?: boolean;
		topK?: boolean;
		format?: boolean;
		categories?: boolean;
	};
	/** Maximum number of memories this provider can return */
	maxTopK?: number;
	/** The formats supported by the provider */
	formats?: string[];
	/** The categories supported by the provider */
	categories?: string[];
	/** Custom options supported by the provider */
	customOptions?: Record<string, unknown>;
}

/**
 * Provider information
 */
export interface ProviderInfo {
	/** The ID of the provider */
	providerId: string;
	/** The name of the provider */
	providerName: string;
	/** The version of the provider */
	version: string;
	/** A description of the provider */
	description?: string;
	/** The author of the provider */
	author?: string;
	/** The website of the provider */
	website?: string;
	/** The URL of the provider's store page */
	storeUrl?: string;
	/** The URL of the provider's support page */
	supportUrl?: string;
	/** The URL of the provider's privacy policy */
	privacyPolicyUrl?: string;
	/** The features of the provider */
	features: string[];
	/** The permissions required by the provider */
	permissions: string[];
}

/**
 * Installation information
 */
export interface InstallationInfo {
	/** Whether any providers are available */
	available: boolean;
	/** Recommended providers to install */
	recommendedProviders?: RecommendedProvider[];
	/** Alternative options for installation */
	alternativeOptions?: string[];
}

/**
 * Recommended provider
 */
export interface RecommendedProvider {
	/** The ID of the provider */
	providerId: string;
	/** The name of the provider */
	providerName: string;
	/** A description of the provider */
	description: string;
	/** The URL of the provider's store page */
	storeUrl: string;
	/** The features of the provider */
	features: string[];
	/** The rating of the provider */
	rating?: number;
	/** The number of users of the provider */
	userCount?: string;
	/** The URL of the provider's icon */
	iconUrl?: string;
}

/**
 * Install dialog options
 */
export interface InstallDialogOptions {
	/** The title of the dialog */
	title?: string;
	/** The message of the dialog */
	message?: string;
	/** The theme of the dialog */
	theme?: "light" | "dark" | "auto";
	/** The position of the dialog */
	position?: "top" | "bottom" | "center";
	/** A list of providers to show in the dialog */
	providers?: string[];
	/** Whether to show alternative options */
	showAlternatives?: boolean;
}

/**
 * Utility types
 */
export type ContextFormat = "raw" | "structured" | "narrative";
export type PermissionType =
	| "context"
	| "context.read"
	| "context.write"
	| "history"
	| "history.read"
	| "history.write"
	| "preferences"
	| "analytics";

/**
 * Helper functions type definitions
 */
export interface MemoryProtocolHelpers {
	/** Detection utilities */
	isProtocolAvailable(): boolean;
	/** Wait for the protocol to become available */
	waitForProtocol(timeout?: number): Promise<AgentMemoryRegistry | null>;

	/** Provider utilities */
	selectBestProvider(
		criteria?: ProviderSelectionCriteria,
	): MemoryProvider | null;
	/** Get a provider by name */
	getProviderByName(name: string): MemoryProvider | undefined;

	/** Context utilities */
	getContextSafely(
		options?: ContextOptions,
		providerId?: string,
	): Promise<ContextResult | null>;
	/** Merge contexts from multiple providers */
	mergeContexts(contexts: MemoryContext[]): MemoryContext;

	/** Permission utilities */
	checkAllPermissions(appInfo: AppInfo): Promise<Record<string, boolean>>;
	/** Request permissions from all available providers */
	requestAllPermissions(
		appInfo: AppInfo,
	): Promise<Record<string, PermissionResult>>;
}

/**
 * Criteria for selecting a provider
 */
export interface ProviderSelectionCriteria {
	/** Preferred providers to use */
	preferredProviders?: string[];
	/** Required features for the provider */
	requiredFeatures?: string[];
	/** Minimum version of the provider */
	minVersion?: string;
	/** Maximum age of the provider in milliseconds */
	maxAge?: number;
}

/**
 * Event data types
 */
export interface ProtocolEventData {
	/** The ID of the provider that dispatched the event */
	providerId: string;
	/** When the event was dispatched */
	timestamp: number;
	/** Additional metadata about the event */
	metadata?: Record<string, unknown>;
}

/**
 * Permission event data
 */
export interface PermissionEventData extends ProtocolEventData {
	/** The domain the permission was granted for */
	domain: string;
	/** The permissions that were granted */
	permissions: string[];
	/** Whether the permission was granted */
	granted: boolean;
}

/**
 * Context Provision Types for Web Agent Communication
 */

/**
 * Context data structure for web agents to provide to extensions
 */
export interface WebAgentContext {
	/** Agent identification */
	agentId: string;
	/** The name of the agent */
	agentName: string;
	/** The version of the agent */
	agentVersion?: string;
	/** The type of the agent */
	agentType?: "assistant" | "chatbot" | "tool" | "service" | "other";

	/** Context data */
	memories: Memory[];
	/** The ID of the session */
	sessionId?: string;
	/** The type of the context */
	contextType: "conversation" | "task" | "document" | "analysis" | "other";

	/** Metadata */
	timestamp: number;
	/** The domain of the web agent */
	domain: string;
	/** The URL of the web agent */
	url?: string;
	/** The relevance score of the context */
	relevanceScore?: number;

	/** Lifetime and persistence */
	expiresAt?: number; // Unix timestamp in ms
	/** Whether to persist beyond session */
	persistent?: boolean;

	/** Source attribution */
	source: {
		type:
			| "user-input"
			| "agent-generated"
			| "external-api"
			| "document"
			| "other";
		description?: string;
		confidence?: number; // 0-1 confidence in the data
	};

	/** Optional categorization */
	categories?: string[];
	tags?: string[];

	/** Provider-specific data */
	metadata?: Record<string, unknown>;
}

/**
 * Options for providing context from web agents
 */
export interface WebAgentContextOptions {
	/** Merge strategy */
	mergeStrategy?: "append" | "replace" | "merge" | "augment";

	/** Storage options */
	storageType?: "ephemeral" | "session" | "persistent";
	priority?: "low" | "medium" | "high";

	/** Processing preferences */
	processImmediate?: boolean; // Process immediately vs batch
	allowDuplicates?: boolean; // Allow duplicate context entries

	/** Filtering */
	categories?: string[];
	relevanceThreshold?: number; // Minimum relevance score 0-1

	/** Security and privacy */
	sanitize?: boolean; // Sanitize content before storing
	requirePermission?: boolean; // Require explicit permission

	/** Provider-specific options */
	providerOptions?: Record<string, unknown>;
}

/**
 * Result of context provision operation
 */
export interface ContextProvisionResult {
	/** Whether the operation was successful */
	success: boolean;
	/** Whether context was processed immediately */
	processed: boolean;
	/** Whether provider acknowledged receipt */
	acknowledged: boolean;

	/** Processing details */
	memoriesAccepted: number;
	memoriesRejected: number;
	rejectionReasons?: string[];

	/** Storage info */
	storedUntil?: number; // Unix timestamp when data expires
	storageLocation?: "memory" | "cache" | "disk" | "external";

	/** Response data */
	contextId?: string; // Unique ID for this context provision
	providerResponse?: string; // Optional response from provider

	/** Error handling */
	error?: ProtocolError;
	warnings?: string[];

	/** Performance metrics */
	processingTimeMs?: number;
	sizeBytes?: number;

	/** Additional metadata */
	metadata?: {
		providerId: string;
		timestamp: number;
		version: string;
	};
}

/**
 * Extended memory interface for web agent context
 */
export interface WebAgentMemory extends Memory {
	/** Additional fields for web agent context */
	agentId: string;
	contextType: string;
	sessionId?: string;
	confidence?: number;

	/** Enhanced source information */
	source: string & {
		agentType?: string;
		processingMethod?: string;
	};
}

// Re-export for convenience
// End of types file
