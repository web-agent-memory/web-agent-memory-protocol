/**
 * Memory Protocol Demo Extension - Content Script
 * This script injects the Memory Protocol API into web pages
 */

(() => {
	// Don't inject multiple times
	if (window.agentMemoryInjected) return;
	window.agentMemoryInjected = true;

	console.log("Memory Protocol Demo Extension: Injecting API");

	// Initialize the global agent memory registry if it doesn't exist
	if (!window.agentMemory) {
		window.agentMemory = createProtocolRegistry();
	}

	// Create our provider implementation
	const demoProvider = createDemoProvider();

	// Register our provider
	window.agentMemory.registerProvider(demoProvider);

	// Notify that a provider is ready
	window.dispatchEvent(
		new CustomEvent("agentMemoryReady", {
			detail: { providerId: "demo-extension" },
		}),
	);

	console.log("Memory Protocol Demo Extension: API injected successfully");

	/**
	 * Create the global protocol registry
	 */
	function createProtocolRegistry() {
		const registry = {
			version: "1.0.0",
			spec: "1.0",
			providers: new Map(),
			_listeners: new Map(),

			// Provider management
			registerProvider(provider) {
				console.log("Registering provider:", provider.providerId);
				this.providers.set(provider.providerId, provider);
				this.dispatchEvent("providerRegistered", {
					providerId: provider.providerId,
				});
			},

			getProviders() {
				return Array.from(this.providers.values());
			},

			getProvider(providerId) {
				return this.providers.get(providerId);
			},

			// Status and discovery
			getStatus() {
				const providers = this.getProviders();
				return {
					available: providers.length > 0,
					providerCount: providers.length,
					providers: providers.map((p) => ({
						providerId: p.providerId,
						providerName: p.providerName,
						version: p.version,
						available: true,
						permissionGranted: p.isPermissionGranted(),
						capabilities: Object.keys(
							p.getCapabilities().supportedOptions,
						).filter((key) => p.getCapabilities().supportedOptions[key]),
					})),
					protocolVersion: this.version,
					features: [
						"multi-provider",
						"permissions",
						"context-retrieval",
						"installation-info",
					],
				};
			},

			getInstallationInfo() {
				const status = this.getStatus();
				if (status.available) {
					return { available: true };
				}

				return {
					available: false,
					recommendedProviders: [
						{
							providerId: "demo-extension",
							providerName: "Memory Protocol Demo",
							description:
								"Reference implementation for testing the Memory Protocol",
							storeUrl: "https://github.com/your-repo/memory-protocol",
							features: ["context-retrieval", "browsing-history", "mock-data"],
							iconUrl: "chrome-extension://demo/icons/icon-48.png",
						},
					],
				};
			},

			// Convenience methods
			async getContext(options = {}, providerId) {
				const provider = providerId
					? this.getProvider(providerId)
					: this.getProviders()[0];

				if (!provider) {
					return {
						success: false,
						error: {
							code: "NOT_AVAILABLE",
							message: "No memory providers available",
							recoverable: true,
							suggestedAction: "Install a memory extension",
						},
						metadata: {
							generatedAt: Date.now(),
							provider: { id: "none", name: "None", version: "0.0.0" },
							dataSource: { timeRange: { start: 0, end: 0 }, categories: [] },
						},
					};
				}

				try {
					const result = await provider.getContext(options);

					if (!result.success) {
						return {
							success: false,
							error: {
								code: "PROVIDER_ERROR",
								message: result.error || "Provider returned an error",
								recoverable: true,
							},
							metadata: {
								generatedAt: Date.now(),
								provider: {
									id: provider.providerId,
									name: provider.providerName,
									version: provider.version,
								},
								dataSource: {
									timeRange: {
										start: Date.now() - 7 * 24 * 60 * 60 * 1000,
										end: Date.now(),
									},
									categories: options.categories || [],
								},
							},
						};
					}

					return {
						success: true,
						data: result.data,
						metadata: {
							generatedAt: Date.now(),
							provider: {
								id: provider.providerId,
								name: provider.providerName,
								version: provider.version,
							},
							dataSource: {
								timeRange: {
									start: Date.now() - 7 * 24 * 60 * 60 * 1000,
									end: Date.now(),
								},
								categories: options.categories || ["browsing"],
							},
						},
					};
				} catch (error) {
					return {
						success: false,
						error: {
							code: "PROVIDER_ERROR",
							message: error.message || "Unexpected error occurred",
							recoverable: false,
						},
						metadata: {
							generatedAt: Date.now(),
							provider: {
								id: provider.providerId,
								name: provider.providerName,
								version: provider.version,
							},
							dataSource: { timeRange: { start: 0, end: 0 }, categories: [] },
						},
					};
				}
			},

			async getAggregatedContext(options = {}) {
				const providers = this.getProviders();
				if (providers.length === 0) {
					return this.getContext(options);
				}

				const results = await Promise.allSettled(
					providers.map(async (provider) => ({
						providerId: provider.providerId,
						result: await provider.getContext(options),
					})),
				);

				const successfulResults = results
					.filter((r) => r.status === "fulfilled" && r.value.result.success)
					.map((r) => r.value);

				if (successfulResults.length === 0) {
					return this.getContext(options);
				}

				// Merge contexts
				const mergedData = mergeContexts(
					successfulResults.map((r) => r.result.data).filter(Boolean),
				);

				const providerResults = {};
				successfulResults.forEach((r) => {
					providerResults[r.providerId] = r.result;
				});

				return {
					success: true,
					data: mergedData,
					metadata: {
						generatedAt: Date.now(),
						provider: {
							id: "aggregated",
							name: "Multiple Providers",
							version: "1.0.0",
						},
						dataSource: {
							timeRange: {
								start: Date.now() - 7 * 24 * 60 * 60 * 1000,
								end: Date.now(),
							},
							categories: options.categories || ["browsing"],
						},
						aggregationMethod: "merge",
						providerCount: successfulResults.length,
					},
					providers: successfulResults.map((r) => r.providerId),
					providerResults,
				};
			},

			// Permission management
			isPermissionGranted(providerId, domain = window.location.hostname) {
				if (providerId) {
					const provider = this.getProvider(providerId);
					return provider ? provider.isPermissionGranted(domain) : false;
				}

				// Check if any provider has permission
				return this.getProviders().some((p) => p.isPermissionGranted(domain));
			},

			async requestPermission(appInfo, providerId) {
				const provider = providerId
					? this.getProvider(providerId)
					: this.getProviders()[0];

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
			addEventListener(event, callback) {
				if (!this._listeners.has(event)) {
					this._listeners.set(event, new Set());
				}
				this._listeners.get(event).add(callback);
			},

			removeEventListener(event, callback) {
				const listeners = this._listeners.get(event);
				if (listeners) {
					listeners.delete(callback);
				}
			},

			dispatchEvent(event, data) {
				const listeners = this._listeners.get(event);
				if (listeners) {
					const customEvent = {
						type: event,
						detail: { ...data, timestamp: Date.now() },
					};
					listeners.forEach((callback) => {
						try {
							callback(customEvent);
						} catch (error) {
							console.error("Error in event callback:", error);
						}
					});
				}

				// Also dispatch as DOM event
				window.dispatchEvent(
					new CustomEvent(
						`memory${event.charAt(0).toUpperCase() + event.slice(1)}`,
						{
							detail: data,
						},
					),
				);
			},
		};

		return registry;
	}

	/**
	 * Create our demo provider implementation
	 */
	function createDemoProvider() {
		return {
			providerId: "demo-extension",
			providerName: "Memory Protocol Demo",
			version: "1.0.0",

			getCapabilities() {
				return {
					supportedOptions: {
						relevanceQuery: true,
						timeRange: true,
						maxTokens: true,
						format: true,
						categories: true,
					},
					topK: 60,
					formats: ["structured", "narrative"],
					categories: ["browsing", "search", "documents"],
					customOptions: {
						mockMode: true,
						debugMode: true,
					},
				};
			},

			getProviderInfo() {
				return {
					providerId: this.providerId,
					providerName: this.providerName,
					version: this.version,
					description:
						"Reference implementation of the Memory Protocol for testing and development",
					author: "Memory Protocol Team",
					website: "https://github.com/your-repo/memory-protocol",
					features: ["context-retrieval", "mock-data", "debugging"],
					permissions: ["context", "history"],
				};
			},

			isPermissionGranted(domain = window.location.hostname) {
				// For demo purposes, simulate permission logic
				const permissions = JSON.parse(
					localStorage.getItem("agentMemoryPermissions") || "{}",
				);
				return permissions[domain]?.granted === true;
			},

			async requestPermission(appInfo) {
				return new Promise((resolve) => {
					const domain = appInfo.domain || window.location.hostname;
					const permissions = JSON.parse(
						localStorage.getItem("agentMemoryPermissions") || "{}",
					);

					// Check if already granted
					if (permissions[domain]?.granted) {
						resolve({
							granted: true,
							isFirstTime: false,
							permissions: ["context", "history"],
							domain,
						});
						return;
					}

					// For demo, auto-grant after a short delay
					setTimeout(() => {
						const granted = true; // In real extension, show permission dialog

						if (granted) {
							permissions[domain] = {
								granted: true,
								grantedAt: Date.now(),
								appInfo,
							};
							localStorage.setItem(
								"agentMemoryPermissions",
								JSON.stringify(permissions),
							);
						}

						resolve({
							granted,
							isFirstTime: !permissions[domain],
							permissions: granted ? ["context", "history"] : [],
							domain,
						});
					}, 100);
				});
			},

			async getContext(options = {}) {
				const domain = window.location.hostname;

				if (!this.isPermissionGranted(domain)) {
					return {
						success: false,
						error: `Permission denied for domain: ${domain}`,
					};
				}

				// Generate demo context data
				const mockData = generateMockContext(options);

				return {
					success: true,
					data: mockData,
					metadata: {
						generatedAt: Date.now(),
						provider: {
							id: "demo-extension",
							name: "Memory Protocol Demo",
							version: "1.0.0",
						},
						dataSource: {
							timeRange: {
								start: Date.now() - 7 * 24 * 60 * 60 * 1000,
								end: Date.now(),
							},
							categories: options.categories || ["browsing"],
						},
						isMockData: true,
					},
				};
			},
		};
	}

	/**
	 * Generate mock context data for demonstration
	 */
	function generateMockContext(options) {
		const { relevanceQuery } = options;

		const mockPatterns = [
			{
				name: "Web Development Workflow",
				description:
					"Frequently switches between IDE, documentation, and debugging tools",
				frequency: 0.85,
				lastSeen: Date.now() - 3600000,
				confidence: 0.9,
			},
			{
				name: "Research Sessions",
				description: "Deep dives into technical articles and documentation",
				frequency: 0.65,
				lastSeen: Date.now() - 86400000,
				confidence: 0.8,
			},
		];

		const mockTopics = [
			{
				topic: "JavaScript Development",
				relevance: 0.9,
				keywords: ["javascript", "nodejs", "react", "typescript"],
				category: "programming",
			},
			{
				topic: "Browser Extensions",
				relevance: 0.8,
				keywords: ["chrome extension", "manifest v3", "content scripts"],
				category: "development",
			},
			{
				topic: "API Design",
				relevance: 0.7,
				keywords: ["rest api", "graphql", "authentication", "protocols"],
				category: "architecture",
			},
		];

		const mockActivities = [
			{
				activity: "Reading Chrome Extension documentation",
				timestamp: Date.now() - 1800000,
				relevance: 0.9,
				category: "research",
				url: "https://developer.chrome.com/docs/extensions/",
			},
			{
				activity: "Working on Memory Protocol implementation",
				timestamp: Date.now() - 3600000,
				relevance: 0.95,
				category: "development",
			},
			{
				activity: "Researching TypeScript best practices",
				timestamp: Date.now() - 7200000,
				relevance: 0.75,
				category: "learning",
			},
		];

		// Filter based on relevanceQuery if provided
		let filteredTopics = mockTopics;
		let filteredActivities = mockActivities;

		if (relevanceQuery) {
			const query = relevanceQuery.toLowerCase();
			filteredTopics = mockTopics.filter(
				(topic) =>
					topic.keywords.some((keyword) => keyword.includes(query)) ||
					topic.topic.toLowerCase().includes(query),
			);
			filteredActivities = mockActivities.filter(
				(activity) =>
					activity.activity.toLowerCase().includes(query) ||
					activity.category.toLowerCase().includes(query),
			);
		}

		const summary =
			`Active web developer focused on ${filteredTopics.map((t) => t.topic).join(" and ")}. ` +
			`Shows consistent patterns in development workflows and continuous learning. ` +
			`Recent activity indicates work on browser extensions and API protocols.`;

		return {
			summary,
			patterns: mockPatterns,
			topics: filteredTopics,
			recentActivities: filteredActivities,
		};
	}

	/**
	 * Merge multiple contexts intelligently
	 */
	function mergeContexts(contexts) {
		if (contexts.length === 0) return null;
		if (contexts.length === 1) return contexts[0];

		const merged = {
			summary: contexts.map((c) => c.summary).join(" "),
			patterns: [],
			topics: [],
			recentActivities: [],
		};

		// Merge patterns by name, keeping highest frequency
		const patternMap = new Map();
		contexts.forEach((context) => {
			context.patterns?.forEach((pattern) => {
				const existing = patternMap.get(pattern.name);
				if (!existing || pattern.frequency > existing.frequency) {
					patternMap.set(pattern.name, pattern);
				}
			});
		});
		merged.patterns = Array.from(patternMap.values());

		// Merge topics, combining keywords and using highest relevance
		const topicMap = new Map();
		contexts.forEach((context) => {
			context.topics?.forEach((topic) => {
				const key = topic.topic.toLowerCase();
				const existing = topicMap.get(key);
				if (existing) {
					existing.keywords = [
						...new Set([...existing.keywords, ...topic.keywords]),
					];
					existing.relevance = Math.max(existing.relevance, topic.relevance);
				} else {
					topicMap.set(key, { ...topic });
				}
			});
		});
		merged.topics = Array.from(topicMap.values());

		// Merge activities, remove duplicates, sort by timestamp
		const activitySet = new Set();
		contexts.forEach((context) => {
			context.recentActivities?.forEach((activity) => {
				const key = `${activity.activity}-${activity.timestamp}`;
				if (!activitySet.has(key)) {
					activitySet.add(key);
					merged.recentActivities.push(activity);
				}
			});
		});
		merged.recentActivities.sort((a, b) => b.timestamp - a.timestamp);

		return merged;
	}
})();
