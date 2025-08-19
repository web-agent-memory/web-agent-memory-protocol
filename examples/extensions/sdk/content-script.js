/**
 * Minimal Memory Provider Extension
 *
 * This demonstrates how to create a Memory Protocol provider using the Extension SDK.
 * Instead of 600+ lines of boilerplate, we only need ~50 lines!
 */

// Import the Extension SDK (in a real extension, this would be bundled)
// For this example, we'll use a simplified version

class MinimalProvider {
	constructor() {
		this.providerId = "minimal-memory-provider";
		this.providerName = "Minimal Memory Provider";
		this.version = "1.0.0";
		this.description = "A minimal example of Memory Protocol provider";
	}

	// This is the ONLY method you need to implement!
	async getContextData(options = {}) {
		// Get memory data
		const memories = await this.getMemories(options);

		return {
			memories,
		};
	}

	async getMemories(_options) {
		// Simple memory collection - in a real extension, this would analyze browsing history,
		// active tabs, bookmarks, etc. and convert them to natural language memories
		return [
			{
				text: "User frequently works on JavaScript and web development projects",
				relevance: 0.8,
				timestamp: Date.now() - 3600000,
				source: "browsing",
				metadata: {
					category: "programming",
					keywords: ["javascript", "web development", "programming"],
				},
			},
			{
				text: "Currently learning about Memory Protocol and browser extension development",
				relevance: 0.9,
				timestamp: Date.now() - 1800000,
				source: "browsing",
				metadata: {
					url: "https://github.com/memory-protocol/extension-sdk",
					category: "technology",
				},
			},
			{
				text: "Recently explored Chrome extension APIs and manifest configuration",
				relevance: 0.7,
				timestamp: Date.now() - 3600000,
				source: "browsing",
				metadata: {
					url: "https://developer.chrome.com/docs/extensions/",
					category: "documentation",
				},
			},
			{
				text: "Shows interest in AI agent development and LLM integration patterns",
				relevance: 0.6,
				timestamp: Date.now() - 7200000,
				source: "search",
				metadata: {
					category: "ai",
					keywords: ["llm", "ai agents", "function calling"],
				},
			},
		];
	}
}

// Initialize the extension - this is where the SDK magic happens!
// In a real implementation with bundling, this would be:
//
// import { initializeExtension } from '@wamp/extension-sdk';
//
// initializeExtension({
//   providerId: 'minimal-memory-provider',
//   providerName: 'Minimal Memory Provider',
//   version: '1.0.0',
//   description: 'A minimal example of Memory Protocol provider',
//   getContextData: async (options) => {
//     const provider = new MinimalProvider();
//     return provider.getContextData(options);
//   },
//   debug: true
// });

// For this standalone example, we'll simulate the SDK functionality
(function initializeMinimalExtension() {
	const provider = new MinimalProvider();

	// Create a simple registry if it doesn't exist
	if (!window.agentMemory) {
		window.agentMemory = {
			version: "1.0.0",
			spec: "1.0",
			providers: new Map(),

			registerProvider(provider) {
				this.providers.set(provider.providerId, provider);
				console.log(`Registered provider: ${provider.providerId}`);
			},

			unregisterProvider(providerId) {
				return this.providers.delete(providerId);
			},

			getProviders() {
				return Array.from(this.providers.values());
			},

			getProvider(providerId) {
				return this.providers.get(providerId) || null;
			},

			getStatus() {
				const providerList = Array.from(this.providers.values());
				return {
					available: providerList.length > 0,
					providerCount: providerList.length,
					providers: providerList.map((p) => ({
						providerId: p.providerId,
						providerName: p.providerName,
						version: p.version,
						available: true,
						permissionGranted: true, // Simplified
						capabilities: {
							supportedOptions: { relevanceQuery: true, timeRange: true },
						},
					})),
					protocolVersion: "1.0.0",
					features: ["basic-context"],
				};
			},

			getInstallationInfo() {
				return { available: true };
			},

			async getContext(options, providerId) {
				const targetProvider = providerId
					? this.getProvider(providerId)
					: Array.from(this.providers.values())[0];

				if (!targetProvider) {
					return {
						success: false,
						error: {
							code: "NO_PROVIDERS",
							message: "No providers available",
							recoverable: true,
						},
						metadata: {
							generatedAt: Date.now(),
							provider: { id: "", name: "", version: "" },
							dataSource: { timeRange: { start: 0, end: 0 }, categories: [] },
						},
					};
				}

				try {
					const contextData = await targetProvider.getContextData(options);
					return {
						success: true,
						data: {
							memories: contextData.memories || [],
						},
						metadata: {
							generatedAt: Date.now(),
							,
							provider: {
								id: targetProvider.providerId,
								name: targetProvider.providerName,
								version: targetProvider.version,
							},
							dataSource: {
								timeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000, end: Date.now() },
								categories: ["memories"],
							},
						},
					};
				} catch (error) {
					return {
						success: false,
						error: {
							code: "PROVIDER_ERROR",
							message: error.message,
							recoverable: false,
						},
						metadata: {
							generatedAt: Date.now(),
							,
							provider: {
								id: targetProvider.providerId,
								name: targetProvider.providerName,
								version: targetProvider.version,
							},
							dataSource: { timeRange: { start: 0, end: 0 }, categories: [] },
						},
					};
				}
			},

			getAggregatedContext(options) {
				return this.getContext(options); // Simplified - just use single provider
			},

			isPermissionGranted() {
				return true; // Simplified - always granted
			},

			async requestPermission(_appInfo) {
				return {
					granted: true,
					isFirstTime: false,
					permissions: ["context"],
				};
			},

			addEventListener() {},
			removeEventListener() {},
			dispatchEvent() {
				return true;
			},
		};
	}

	// Register our provider
	window.agentMemory.registerProvider(provider);

	// Notify that provider is ready
	window.dispatchEvent(
		new CustomEvent("agentMemoryReady", {
			detail: { providerId: provider.providerId },
		}),
	);

	console.log("✅ Minimal Memory Provider initialized successfully!");
	console.log("📊 Try: await window.agentMemory.getContext()");
})();
