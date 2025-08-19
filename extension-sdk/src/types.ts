/**
 * Extension SDK Types
 * Types specific to the extension SDK that extend the core protocol types
 */

// Import types for use in this file
import type {
	AppInfo,
	ContextOptions,
	ContextResult,
	PermissionResult,
	ProviderCapabilities,
	ProviderInfo,
} from "@wamp/protocol";

// Re-export core protocol types
export type {
	AgentMemoryRegistry,
	AggregatedContextResult,
	AppInfo,
	ContextMetadata,
	ContextOptions,
	ContextResult,
	InstallationInfo,
	InstallDialogOptions,
	Memory,
	MemoryContext,
	MemoryProvider,
	PermissionResult,
	ProtocolError,
	ProtocolStatus,
	ProviderCapabilities,
	ProviderContextResult,
	ProviderInfo,
	ProviderStatus,
	RecommendedProvider,
} from "@wamp/protocol";

// Extension-specific types that extend the core protocol

// No duplicate types needed - all imported from protocol

/**
 * Configuration for initializing a provider
 */
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
}

/**
 * Raw context data that providers return before it's formatted
 */
export interface ContextData {
	memories: Array<{
		text: string;
		relevance: number;
		timestamp: number;
		source: string;
		metadata?: Record<string, unknown>;
	}>;
}

/**
 * Permission storage structure
 */
export interface PermissionStorage {
	[domain: string]: {
		granted: boolean;
		grantedAt: number;
		permissions: string[];
		appInfo?: AppInfo;
	};
}

/**
 * Extension SDK initialization options
 */
export interface ExtensionSDKConfig {
	provider: import("./base-provider").BaseProvider;
	autoRegister?: boolean;
	debug?: boolean;
	permissionStorageKey?: string;
}

/**
 * Browser API access levels
 */
export type BrowserAPILevel = "basic" | "history" | "tabs" | "storage" | "all";

/**
 * Abstract base class that providers extend
 */
export abstract class BaseProvider {
	protected config: ProviderConfig;
	protected permissionManager?: PermissionManager;
	protected contextBuilder?: ContextBuilder;
	protected browserAPI?: BrowserAPIHelper;

	constructor(config: ProviderConfig) {
		this.config = config;
	}

	// Methods that extensions MUST implement
	abstract getContextData(options?: ContextOptions): Promise<ContextData>;

	// Methods that extensions CAN override
	getPermissionState(domain: string): boolean {
		return this.permissionManager?.isPermissionGranted(domain) ?? false;
	}

	// Standard implementations (usually don't need to override)
	get providerId(): string {
		return this.config.providerId;
	}

	get providerName(): string {
		return this.config.providerName;
	}

	get version(): string {
		return this.config.version;
	}

	getCapabilities(): ProviderCapabilities {
		return {
			supportedOptions: {
				relevanceQuery: true,
				timeRange: true,
				topK: true,
				format: true,
				categories: true,
			},
			maxTopK: this.config.maxTopK ?? 50,
			formats: this.config.supportedFormats ?? ["structured", "narrative"],
			categories: this.config.supportedCategories ?? [
				"browsing",
				"search",
				"documents",
			],
		};
	}

	getProviderInfo(): ProviderInfo {
		return {
			providerId: this.config.providerId,
			providerName: this.config.providerName,
			version: this.config.version,
			description:
				this.config.description ??
				`${this.config.providerName} memory provider`,
			author: this.config.author,
			website: this.config.website,
			features: this.config.features ?? ["context-retrieval"],
			permissions: this.config.permissions ?? ["context"],
		};
	}

	isPermissionGranted(domain?: string): boolean {
		const targetDomain = domain ?? globalThis.location?.hostname ?? "localhost";
		return this.getPermissionState(targetDomain);
	}

	async requestPermission(appInfo: AppInfo): Promise<PermissionResult> {
		if (!this.permissionManager) {
			throw new Error("Permission manager not initialized");
		}
		return this.permissionManager.requestPermission(appInfo);
	}

	async getContext(options?: ContextOptions): Promise<ContextResult> {
		try {
			// Check permissions
			const domain = globalThis.location?.hostname ?? "localhost";
			if (!this.isPermissionGranted(domain)) {
				return {
					success: false,
					error: {
						code: "PERMISSION_DENIED",
						message: "Permission required to access memory data",
						recoverable: true,
						suggestedAction: "Request permission from user",
					},
					metadata: this.createErrorMetadata(),
				};
			}

			// Get context data from the provider
			const contextData = await this.getContextData(options);

			// Build and return the response
			if (!this.contextBuilder) {
				throw new Error("Context builder not initialized");
			}

			return this.contextBuilder.buildContextResult(
				contextData,
				options,
				this.getProviderInfo(),
			);
		} catch (error) {
			return {
				success: false,
				error: {
					code: "PROVIDER_ERROR",
					message:
						error instanceof Error ? error.message : "Unknown provider error",
					recoverable: false,
				},
				metadata: this.createErrorMetadata(),
			};
		}
	}

	private createErrorMetadata() {
		return {
			generatedAt: Date.now(),
			provider: {
				id: this.config.providerId,
				name: this.config.providerName,
				version: this.config.version,
			},
			dataSource: {
				timeRange: { start: 0, end: 0 },
				categories: [],
			},
		};
	}
}

// Forward declare classes that will be implemented in other files
export declare class PermissionManager {
	isPermissionGranted(domain: string): boolean;
	requestPermission(appInfo: AppInfo): Promise<PermissionResult>;
}

export declare class ContextBuilder {
	buildContextResult(
		contextData: ContextData,
		options: ContextOptions | undefined,
		providerInfo: ProviderInfo,
	): ContextResult;
}

export declare class BrowserAPIHelper {
	getHistory(timeRange?: string): Promise<chrome.history.HistoryItem[]>;
	getTabs(): Promise<chrome.tabs.Tab[]>;
	getStorage<T>(key: string): Promise<T | undefined>;
	setStorage(data: Record<string, unknown>): Promise<void>;
}

export declare const RegistryManager: {
	injectRegistry(): void;
	registerProvider(provider: BaseProvider): void;
};

export declare const ExtensionSDK: {
	initialize(config: ExtensionSDKConfig): Promise<void>;
};
