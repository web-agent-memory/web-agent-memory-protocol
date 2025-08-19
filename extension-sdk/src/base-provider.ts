/**
 * BaseProvider - Abstract base class for Memory Protocol providers
 *
 * Extension developers extend this class and only need to implement:
 * - getContextData(): Return their raw context data
 * - getPermissionState(): Check if domain has permission (optional)
 *
 * All other MemoryProvider interface methods are implemented automatically.
 */

import type {
	AppInfo,
	ContextData,
	ContextOptions,
	MemoryProvider,
	PermissionResult,
	ProviderCapabilities,
	ProviderConfig,
	ProviderContextResult,
	ProviderInfo,
} from "./types";

export abstract class BaseProvider implements MemoryProvider {
	protected config: ProviderConfig;
	private _permissionManager?: import("./permissions").PermissionManager;
	private _contextBuilder?: import("./context-builder").ContextBuilder;
	private _browserAPI?: import("./browser-api").BrowserAPIHelper;

	constructor(config: ProviderConfig) {
		this.config = config;
	}

	/**
	 * ABSTRACT METHODS - Extensions must implement these
	 */

	/**
	 * Get raw context data from the extension's data sources
	 * This is the main method extensions need to implement
	 */
	abstract getContextData(options?: ContextOptions): Promise<ContextData>;

	/**
	 * VIRTUAL METHODS - Extensions can override these if needed
	 */

	/**
	 * Check if the given domain has permission
	 * Default implementation uses the PermissionManager
	 */
	protected getPermissionState(domain: string): boolean {
		return this._permissionManager?.isPermissionGranted(domain) ?? false;
	}

	/**
	 * IMPLEMENTED METHODS - Standard implementations
	 */

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
			customOptions: {
				features: this.config.features ?? [],
				permissions: this.config.permissions ?? [],
			},
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
		const targetDomain = domain ?? this.getCurrentDomain();
		return this.getPermissionState(targetDomain);
	}

	async requestPermission(appInfo: AppInfo): Promise<PermissionResult> {
		if (!this._permissionManager) {
			throw new Error(
				"PermissionManager not initialized. Call ExtensionSDK.initialize() first.",
			);
		}
		return this._permissionManager.requestPermission(appInfo);
	}

	async getContext(options?: ContextOptions): Promise<ProviderContextResult> {
		try {
			// Check permissions first
			const domain = this.getCurrentDomain();
			if (!this.isPermissionGranted(domain)) {
				return {
					success: false,
					error: "Permission required to access memory data",
					metadata: this.createErrorMetadata(),
				};
			}

			// Get raw context data from the extension implementation
			const contextData = await this.getContextData(options);

			// Build standardized response
			if (!this._contextBuilder) {
				throw new Error(
					"ContextBuilder not initialized. Call ExtensionSDK.initialize() first.",
				);
			}

			return this._contextBuilder.buildContextResult(
				contextData,
				options,
				this.getProviderInfo(),
			);
		} catch (error) {
			console.error(`${this.providerName}: Error getting context:`, error);

			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Unknown provider error",
				metadata: this.createErrorMetadata(),
			};
		}
	}

	/**
	 * INTERNAL METHODS - Used by the SDK
	 */

	/**
	 * Initialize the provider with SDK utilities
	 * Called by ExtensionSDK.initialize()
	 */
	public _initialize(
		permissionManager: import("./permissions").PermissionManager,
		contextBuilder: import("./context-builder").ContextBuilder,
		browserAPI: import("./browser-api").BrowserAPIHelper,
	): void {
		this._permissionManager = permissionManager;
		this._contextBuilder = contextBuilder;
		this._browserAPI = browserAPI;
	}

	/**
	 * Get access to browser API helper
	 */
	protected get browserAPI(): import("./browser-api").BrowserAPIHelper {
		if (!this._browserAPI) {
			throw new Error(
				"BrowserAPI not initialized. Call ExtensionSDK.initialize() first.",
			);
		}
		return this._browserAPI;
	}

	/**
	 * Get access to permission manager
	 */
	protected get permissionManager(): import("./permissions").PermissionManager {
		if (!this._permissionManager) {
			throw new Error(
				"PermissionManager not initialized. Call ExtensionSDK.initialize() first.",
			);
		}
		return this._permissionManager;
	}

	/**
	 * Get access to context builder
	 */
	protected get contextBuilder(): import("./context-builder").ContextBuilder {
		if (!this._contextBuilder) {
			throw new Error(
				"ContextBuilder not initialized. Call ExtensionSDK.initialize() first.",
			);
		}
		return this._contextBuilder;
	}

	/**
	 * Get the current domain
	 */
	private getCurrentDomain(): string {
		// In browser extension context, we might not have location
		// Extensions typically pass domain through context or use tabs API
		if (typeof globalThis !== "undefined" && globalThis.location) {
			return globalThis.location.hostname;
		}
		return "localhost"; // Default fallback
	}

	/**
	 * Create error metadata for failed requests
	 */
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
