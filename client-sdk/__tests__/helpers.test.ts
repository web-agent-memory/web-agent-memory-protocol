import type { AgentMemoryRegistry, MemoryProvider } from "@wamp/protocol";
import { TimeUtils } from "@wamp/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	checkAllPermissions,
	getContextSafely,
	getProviderByName,
	requestAllPermissions,
	selectBestProvider,
	waitForProtocol,
} from "../helpers";

describe("Client SDK Helpers", () => {
	let mockProvider1: MemoryProvider;
	let mockProvider2: MemoryProvider;
	let mockRegistry: AgentMemoryRegistry;

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
				features: ["context", "search"],
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
							timestamp: Date.now() - 3600000,
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
				features: ["context"],
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

		// Create registry mock
		mockRegistry = {
			version: "1.0.0",
			spec: "1.0",
			providers: new Map(),
			registerProvider: vi.fn(),
			unregisterProvider: vi.fn(),
			getProviders: vi.fn().mockReturnValue([]),
			getProvider: vi.fn().mockReturnValue(null),
			getStatus: vi.fn().mockReturnValue({
				available: true,
				providerCount: 0,
				providers: [],
				protocolVersion: "1.0.0",
				features: [],
			}),
			getContext: vi.fn().mockResolvedValue({
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
			}),
			isPermissionGranted: vi.fn().mockReturnValue(false),
			getInstallationInfo: vi.fn().mockReturnValue({
				available: true,
				recommendedProviders: [],
				alternativeOptions: [],
			}),
			getAggregatedContext: vi.fn(),
			requestPermission: vi.fn().mockResolvedValue({
				granted: false,
				isFirstTime: true,
				permissions: [],
			}),
			showInstallDialog: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn().mockReturnValue(true),
		};
	});

	afterEach(() => {
		delete window.agentMemory;
	});

	describe("waitForProtocol", () => {
		it("should resolve immediately if protocol is available", async () => {
			window.agentMemory = mockRegistry;

			const result = await waitForProtocol(1000);
			expect(result).toBe(mockRegistry);
		});

		it("should wait for protocol injection", async () => {
			// Start waiting
			const waitPromise = waitForProtocol(500);

			// Inject protocol after delay
			setTimeout(() => {
				window.agentMemory = mockRegistry;
				window.dispatchEvent(new Event("agentMemoryReady"));
			}, 200);

			const result = await waitPromise;
			expect(result).toBe(mockRegistry);
		});

		it("should timeout if protocol never becomes available", async () => {
			const result = await waitForProtocol(100);
			expect(result).toBe(null);
		});
	});

	describe("selectBestProvider", () => {
		beforeEach(() => {
			window.agentMemory = mockRegistry;
			mockRegistry.getProviders = vi
				.fn()
				.mockReturnValue([mockProvider1, mockProvider2]);
		});

		it("should return null when protocol not available", () => {
			delete window.agentMemory;
			const result = selectBestProvider();
			expect(result).toBe(null);
		});

		it("should return null when no providers available", () => {
			mockRegistry.getProviders = vi.fn().mockReturnValue([]);
			const result = selectBestProvider();
			expect(result).toBe(null);
		});

		it("should return first provider by default", () => {
			const result = selectBestProvider();
			expect(result).toBe(mockProvider1);
		});

		it("should respect preferred provider", () => {
			const result = selectBestProvider({
				preferredProviders: ["provider-2"],
			});
			expect(result).toBe(mockProvider2);
		});

		it("should filter by required features", () => {
			const result = selectBestProvider({
				requiredFeatures: ["search"],
			});
			expect(result).toBe(mockProvider1); // Only provider1 has "search" feature
		});

		it("should fallback to first provider if preferred not found", () => {
			const result = selectBestProvider({
				preferredProviders: ["nonexistent"],
			});
			expect(result).toBe(mockProvider1);
		});
	});

	describe("getProviderByName", () => {
		beforeEach(() => {
			window.agentMemory = mockRegistry;
			mockRegistry.getProviders = vi
				.fn()
				.mockReturnValue([mockProvider1, mockProvider2]);
		});

		it("should return undefined when protocol not available", () => {
			delete window.agentMemory;
			const result = getProviderByName("Test Provider 1");
			expect(result).toBe(undefined);
		});

		it("should find provider by exact name", () => {
			const result = getProviderByName("Test Provider 1");
			expect(result).toBe(mockProvider1);
		});

		it("should find provider by case-insensitive name", () => {
			const result = getProviderByName("test provider 2");
			expect(result).toBe(mockProvider2);
		});

		it("should return undefined for nonexistent provider", () => {
			const result = getProviderByName("Nonexistent Provider");
			expect(result).toBe(undefined);
		});
	});

	describe("getContextSafely", () => {
		it("should return null when protocol not available", async () => {
			const result = await getContextSafely();
			expect(result).toBe(null);
		});

		it("should return context when successful", async () => {
			window.agentMemory = mockRegistry;
			const mockResult = {
				success: true,
				data: { memories: [] },
				metadata: {
					generatedAt: Date.now(),
					provider: { id: "test", name: "Test", version: "1.0.0" },
					dataSource: { timeRange: {}, categories: [] },
				},
			};
			mockRegistry.getContext = vi.fn().mockResolvedValue(mockResult);

			const result = await getContextSafely({ relevanceQuery: "test" });
			expect(result).toBe(mockResult);
			expect(mockRegistry.getContext).toHaveBeenCalledWith(
				{ relevanceQuery: "test" },
				undefined,
			);
		});

		it("should return null on error and log warning", async () => {
			window.agentMemory = mockRegistry;
			mockRegistry.getContext = vi
				.fn()
				.mockRejectedValue(new Error("Test error"));
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const result = await getContextSafely();
			expect(result).toBe(null);
			expect(consoleSpy).toHaveBeenCalledWith(
				"Failed to get context:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("checkAllPermissions", () => {
		const appInfo = {
			appName: "Test App",
			appId: "test-app",
			description: "Test description",
			domain: "test.com",
		};

		it("should return empty object when protocol not available", async () => {
			const result = await checkAllPermissions(appInfo);
			expect(result).toEqual({});
		});

		it("should check permissions for all providers", async () => {
			window.agentMemory = mockRegistry;
			mockRegistry.getProviders = vi
				.fn()
				.mockReturnValue([mockProvider1, mockProvider2]);

			const result = await checkAllPermissions(appInfo);

			expect(result).toEqual({
				"provider-1": true,
				"provider-2": false,
			});
			expect(mockProvider1.isPermissionGranted).toHaveBeenCalledWith(
				"test.com",
			);
			expect(mockProvider2.isPermissionGranted).toHaveBeenCalledWith(
				"test.com",
			);
		});

		it("should handle permission check errors", async () => {
			window.agentMemory = mockRegistry;
			const faultyProvider = {
				...mockProvider1,
				isPermissionGranted: vi.fn().mockImplementation(() => {
					throw new Error("Permission check failed");
				}),
			};
			mockRegistry.getProviders = vi.fn().mockReturnValue([faultyProvider]);
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const result = await checkAllPermissions(appInfo);

			expect(result).toEqual({ "provider-1": false });
			expect(consoleSpy).toHaveBeenCalledWith(
				"Failed to check permissions for provider-1:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("requestAllPermissions", () => {
		const appInfo = {
			appName: "Test App",
			appId: "test-app",
			description: "Test description",
			domain: "test.com",
		};

		it("should return empty object when protocol not available", async () => {
			const result = await requestAllPermissions(appInfo);
			expect(result).toEqual({});
		});

		it("should request permissions from all providers", async () => {
			window.agentMemory = mockRegistry;
			mockRegistry.getProviders = vi
				.fn()
				.mockReturnValue([mockProvider1, mockProvider2]);

			const result = await requestAllPermissions(appInfo);

			expect(result).toEqual({
				"provider-1": {
					granted: true,
					isFirstTime: false,
					permissions: ["context"],
				},
				"provider-2": {
					granted: false,
					isFirstTime: true,
					permissions: [],
				},
			});
			expect(mockProvider1.requestPermission).toHaveBeenCalledWith(appInfo);
			expect(mockProvider2.requestPermission).toHaveBeenCalledWith(appInfo);
		});

		it("should handle permission request errors", async () => {
			window.agentMemory = mockRegistry;
			const faultyProvider = {
				...mockProvider1,
				requestPermission: vi
					.fn()
					.mockRejectedValue(new Error("Permission request failed")),
			};
			mockRegistry.getProviders = vi.fn().mockReturnValue([faultyProvider]);
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const result = await requestAllPermissions(appInfo);

			expect(result).toEqual({
				"provider-1": {
					granted: false,
					isFirstTime: false,
					permissions: [],
				},
			});
			expect(consoleSpy).toHaveBeenCalledWith(
				"Failed to request permissions for provider-1:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});
});
