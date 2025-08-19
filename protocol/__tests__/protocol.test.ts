import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimeUtils } from "../src/time-utils.ts";
import type { AgentMemoryRegistry, MemoryProvider } from "../src/types.ts";

describe("Memory Protocol Registry", () => {
	let mockProvider1: MemoryProvider;
	let mockProvider2: MemoryProvider;
	let registry: AgentMemoryRegistry;

	beforeEach(() => {
		// Create mock providers
		mockProvider1 = {
			providerId: "provider-1",
			providerName: "Test Provider 1",
			version: "1.0.0",
			getCapabilities: vi.fn().mockReturnValue(["context", "search"]),
			getProviderInfo: vi.fn().mockReturnValue({
				description: "Test provider 1",
				website: "https://provider1.com",
			}),
			isPermissionGranted: vi.fn().mockReturnValue(true),
			requestPermission: vi.fn().mockResolvedValue({
				granted: true,
				isFirstTime: false,
				permissions: ["context"],
			}),
			getContext: vi.fn().mockResolvedValue({
				success: true,
				data: {
					memories: [
						{
							text: "User browsed React documentation",
							relevance: 0.9,
							timestamp: Date.now() - 3600000, // 1 hour ago
							source: "browsing",
							metadata: { url: "https://react.dev" },
						},
					],
				},
				metadata: {
					generatedAt: Date.now(),
					provider: {
						id: "provider-1",
						name: "Test Provider 1",
						version: "1.0.0",
					},
					dataSource: {
						timeRange: TimeUtils.lastHours(24),
						categories: ["browsing"],
					},
				},
			}),
		};

		mockProvider2 = {
			providerId: "provider-2",
			providerName: "Test Provider 2",
			version: "2.0.0",
			getCapabilities: vi.fn().mockReturnValue(["context"]),
			getProviderInfo: vi.fn().mockReturnValue({
				description: "Test provider 2",
				website: "https://provider2.com",
			}),
			isPermissionGranted: vi.fn().mockReturnValue(false),
			requestPermission: vi.fn().mockResolvedValue({
				granted: false,
				isFirstTime: true,
				permissions: [],
			}),
			getContext: vi.fn().mockResolvedValue({
				success: false,
				error: {
					code: "PERMISSION_DENIED",
					message: "Permission required",
					recoverable: true,
				},
				metadata: {
					generatedAt: Date.now(),
					provider: {
						id: "provider-2",
						name: "Test Provider 2",
						version: "2.0.0",
					},
					dataSource: { timeRange: {}, categories: [] },
				},
			}),
		};

		// Create registry implementation
		const providers = new Map<string, MemoryProvider>();

		registry = {
			version: "1.0.0",
			spec: "1.0",
			providers,
			registerProvider: vi
				.fn()
				.mockImplementation((provider: MemoryProvider) => {
					providers.set(provider.providerId, provider);
				}),
			unregisterProvider: vi.fn().mockImplementation((providerId: string) => {
				providers.delete(providerId);
			}),
			getProviders: vi
				.fn()
				.mockImplementation(() => Array.from(providers.values())),
			getProvider: vi
				.fn()
				.mockImplementation(
					(providerId: string) => providers.get(providerId) || null,
				),
			getStatus: vi.fn().mockImplementation(() => ({
				available: providers.size > 0,
				providerCount: providers.size,
				providers: Array.from(providers.values()).map((p) => ({
					providerId: p.providerId,
					providerName: p.providerName,
					version: p.version,
					available: true,
					permissionGranted: p.isPermissionGranted(),
					capabilities: p.getCapabilities(),
				})),
				protocolVersion: "1.0.0",
				features: ["multi-provider", "permission-system"],
			})),
			getContext: vi.fn().mockImplementation(async (options = {}) => {
				const availableProviders = Array.from(providers.values()).filter((p) =>
					p.isPermissionGranted(),
				);

				if (availableProviders.length === 0) {
					return {
						success: false,
						error: {
							code: "NO_PROVIDERS",
							message: "No providers available or granted permission",
							recoverable: true,
						},
						metadata: {
							generatedAt: Date.now(),
							provider: { id: "", name: "", version: "" },
							dataSource: { timeRange: {}, categories: [] },
						},
					};
				}

				// Use the first available provider for simplicity
				const provider = availableProviders[0];
				return await provider.getContext(options);
			}),
			isPermissionGranted: vi.fn().mockImplementation((providerId?: string) => {
				if (providerId) {
					const provider = providers.get(providerId);
					return provider?.isPermissionGranted() || false;
				}
				return Array.from(providers.values()).some((p) =>
					p.isPermissionGranted(),
				);
			}),
			getInstallationInfo: vi.fn().mockReturnValue({
				available: true,
				recommendedProviders: [],
				alternativeOptions: [],
			}),
			getAggregatedContext: vi.fn().mockImplementation(async (options = {}) => {
				const availableProviders = Array.from(providers.values()).filter((p) =>
					p.isPermissionGranted(),
				);

				if (availableProviders.length === 0) {
					return {
						success: false,
						error: {
							code: "NO_PROVIDERS",
							message: "No providers available or granted permission",
							recoverable: true,
						},
						metadata: {
							generatedAt: Date.now(),
							provider: { id: "", name: "", version: "" },
							dataSource: { timeRange: {}, categories: [] },
							aggregationMethod: "merge" as const,
							providerCount: 0,
						},
					};
				}

				// Mock aggregated result
				const contexts = await Promise.all(
					availableProviders.map((p) => p.getContext(options)),
				);
				const successfulContexts = contexts
					.filter((c) => c.success && c.data)
					.map((c) => c.data);

				return {
					success: true,
					data: {
						summary: `Aggregated context from ${successfulContexts.length} providers`,
						patterns: [],
						topics: [],
						recentActivities: [],
					},
					metadata: {
						generatedAt: Date.now(),
						provider: {
							id: "aggregated",
							name: "Aggregated",
							version: "1.0.0",
						},
						dataSource: {
							timeRange: TimeUtils.lastHours(24),
							categories: ["all"],
						},
						aggregationMethod: "merge" as const,
						providerCount: successfulContexts.length,
					},
					aggregatedData: {
						providers: availableProviders.map((p) => p.providerId),
						providerResults: Object.fromEntries(
							contexts.map((result, index) => [
								availableProviders[index].providerId,
								result,
							]),
						),
					},
				};
			}),
			requestPermission: vi
				.fn()
				.mockImplementation(async (appInfo, providerId) => {
					if (providerId) {
						const provider = providers.get(providerId);
						if (provider) {
							return await provider.requestPermission(appInfo);
						}
					}

					// Default mock response
					return {
						granted: true,
						isFirstTime: false,
						permissions: ["context"],
					};
				}),
			showInstallDialog: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn().mockReturnValue(true),
		};

		// Set up global registry
		window.agentMemory = registry;
	});

	describe("Provider Registration", () => {
		it("should register a provider successfully", () => {
			registry.registerProvider(mockProvider1);

			expect(registry.registerProvider).toHaveBeenCalledWith(mockProvider1);
			expect(registry.getProviders()).toContain(mockProvider1);
			expect(registry.getProvider("provider-1")).toBe(mockProvider1);
		});

		it("should handle multiple provider registration", () => {
			registry.registerProvider(mockProvider1);
			registry.registerProvider(mockProvider2);

			const providers = registry.getProviders();
			expect(providers).toHaveLength(2);
			expect(providers).toContain(mockProvider1);
			expect(providers).toContain(mockProvider2);
		});

		it("should unregister a provider", () => {
			registry.registerProvider(mockProvider1);
			registry.registerProvider(mockProvider2);

			registry.unregisterProvider("provider-1");

			expect(registry.unregisterProvider).toHaveBeenCalledWith("provider-1");
			expect(registry.getProviders()).toHaveLength(1);
			expect(registry.getProvider("provider-1")).toBe(null);
			expect(registry.getProvider("provider-2")).toBe(mockProvider2);
		});

		it("should handle provider replacement", () => {
			registry.registerProvider(mockProvider1);

			const updatedProvider: MemoryProvider = {
				...mockProvider1,
				version: "1.1.0",
			};

			registry.registerProvider(updatedProvider);

			expect(registry.getProviders()).toHaveLength(1);
			expect(registry.getProvider("provider-1")?.version).toBe("1.1.0");
		});
	});

	describe("Registry Status", () => {
		it("should return correct status with no providers", () => {
			const status = registry.getStatus();

			expect(status.available).toBe(false);
			expect(status.providerCount).toBe(0);
			expect(status.providers).toHaveLength(0);
			expect(status.protocolVersion).toBe("1.0.0");
		});

		it("should return correct status with multiple providers", () => {
			registry.registerProvider(mockProvider1);
			registry.registerProvider(mockProvider2);

			const status = registry.getStatus();

			expect(status.available).toBe(true);
			expect(status.providerCount).toBe(2);
			expect(status.providers).toHaveLength(2);

			const provider1Status = status.providers.find(
				(p) => p.providerId === "provider-1",
			);
			const provider2Status = status.providers.find(
				(p) => p.providerId === "provider-2",
			);

			expect(provider1Status?.permissionGranted).toBe(true);
			expect(provider2Status?.permissionGranted).toBe(false);
		});
	});

	describe("Permission Management", () => {
		it("should check global permission status", () => {
			registry.registerProvider(mockProvider1);
			registry.registerProvider(mockProvider2);

			expect(registry.isPermissionGranted()).toBe(true); // At least one provider has permission
		});

		it("should check specific provider permission", () => {
			registry.registerProvider(mockProvider1);
			registry.registerProvider(mockProvider2);

			expect(registry.isPermissionGranted("provider-1")).toBe(true);
			expect(registry.isPermissionGranted("provider-2")).toBe(false);
			expect(registry.isPermissionGranted("nonexistent")).toBe(false);
		});
	});

	describe("Context Aggregation", () => {
		it("should get context from available provider", async () => {
			registry.registerProvider(mockProvider1);

			const result = await registry.getContext({
				relevanceQuery: "test query",
				topK: 20,
			});

			expect(result.success).toBe(true);
			expect(result.data?.memories).toHaveLength(1);
			expect(result.data?.memories[0].text).toBe(
				"User browsed React documentation",
			);
			expect(mockProvider1.getContext).toHaveBeenCalledWith({
				relevanceQuery: "test query",
				topK: 20,
			});
		});

		it("should handle no available providers", async () => {
			registry.registerProvider(mockProvider2); // No permission

			const result = await registry.getContext();

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe("NO_PROVIDERS");
		});

		it("should prioritize providers with permission", async () => {
			registry.registerProvider(mockProvider2); // No permission
			registry.registerProvider(mockProvider1); // Has permission

			const result = await registry.getContext();

			expect(result.success).toBe(true);
			expect(mockProvider1.getContext).toHaveBeenCalled();
			expect(mockProvider2.getContext).not.toHaveBeenCalled();
		});
	});

	describe("Event System", () => {
		it("should support event listeners", () => {
			const callback = vi.fn();

			registry.addEventListener("provider-registered", callback);

			expect(registry.addEventListener).toHaveBeenCalledWith(
				"provider-registered",
				callback,
			);
		});

		it("should support event removal", () => {
			const callback = vi.fn();

			registry.removeEventListener("provider-registered", callback);

			expect(registry.removeEventListener).toHaveBeenCalledWith(
				"provider-registered",
				callback,
			);
		});

		it("should support event dispatching", () => {
			const event = new CustomEvent("provider-registered", {
				detail: { providerId: "test-provider" },
			});

			registry.dispatchEvent(event);

			expect(registry.dispatchEvent).toHaveBeenCalledWith(event);
		});
	});
});
