// Import dynamically to allow resetting between tests

import type { AgentMemoryRegistry } from "@wamp/protocol";
import { TimeUtils } from "@wamp/protocol";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Import the new simplified functions
import {
	getContext,
	getProtocolStatus,
	initMemoryClient,
	isAvailable,
	requestPermission,
} from "../index";

describe("Simplified MemoryClientSDK", () => {
	beforeEach(async () => {
		// Clear module cache to reset state
		vi.resetModules();

		// Clean up global state (with proper DOM typing from @types/jsdom)
		delete window.agentMemory;

		// Ensure clean DOM state
		document.body.innerHTML = "";
		localStorage.clear();
		sessionStorage.clear();
	});

	describe("initMemoryClient()", () => {
		const mockConfig = {
			appName: "Test App",
			appId: "test-app-id",
		};

		it("should initialize successfully when no protocol is available", async () => {
			const client = await initMemoryClient(mockConfig);

			expect(client.available).toBe(false);
			expect(client.providersInstalled).toBe(false);
			expect(client.permissionGranted).toBe(false);
			expect(client.provider).toBe(null);
			expect(client.config).toEqual(mockConfig);
		});

		it("should initialize with mock mode enabled", async () => {
			const mockModeConfig = {
				...mockConfig,
				mockMode: true,
			};

			const client = await initMemoryClient(mockModeConfig);

			expect(client.available).toBe(true);
			expect(client.providersInstalled).toBe(true);
			expect(client.permissionGranted).toBe(true);
			expect(client.provider).toBe(null); // Mock mode doesn't use real providers
			expect(client.config).toEqual(mockModeConfig);
		});
	});

	describe("getContext()", () => {
		const mockConfig = {
			appName: "Test App",
			appId: "test-app-id",
		};

		it("should return mock data in mock mode", async () => {
			const client = await initMemoryClient({
				...mockConfig,
				mockMode: true,
			});

			const result = await getContext(client, {
				relevanceQuery: "react",
				timeRange: TimeUtils.lastHours(24),
			});

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data?.memories).toBeInstanceOf(Array);
			expect(result.data?.memories.length).toBeGreaterThan(0);
			expect(result.data?.memories[0]).toHaveProperty("text");
			expect(result.data?.memories[0]).toHaveProperty("relevance");
			expect(result.data?.memories[0]).toHaveProperty("timestamp");
			expect(result.data?.memories[0]).toHaveProperty("source");
		});

		it("should return error when protocol not available", async () => {
			const client = await initMemoryClient(mockConfig);

			const result = await getContext(client);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe("NOT_AVAILABLE");
		});
	});

	describe("requestPermission()", () => {
		const mockConfig = {
			appName: "Test App",
			appId: "test-app-id",
		};

		it("should return granted permission in mock mode", async () => {
			const client = await initMemoryClient({
				...mockConfig,
				mockMode: true,
			});

			const result = await requestPermission(client);

			expect(result.granted).toBe(true);
		});

		it("should return denied permission when no provider", async () => {
			const client = await initMemoryClient(mockConfig);

			const result = await requestPermission(client);

			expect(result.granted).toBe(false);
		});
	});

	describe("Utility Functions", () => {
		it("should check if protocol is available", () => {
			expect(isAvailable()).toBe(false);

			window.agentMemory = {} as AgentMemoryRegistry;
			expect(isAvailable()).toBe(true);
		});

		it("should get protocol status", async () => {
			const mockStatus = {
				available: true,
				providerCount: 1,
				providers: [],
				protocolVersion: "1.0.0",
				features: [],
			};

			const mockProtocol: Partial<AgentMemoryRegistry> = {
				getStatus: vi.fn().mockReturnValue(mockStatus),
			};

			window.agentMemory = mockProtocol as AgentMemoryRegistry;

			const status = await getProtocolStatus();
			expect(status).toEqual(mockStatus);
		});

		it("should return null status when protocol not available", async () => {
			const status = await getProtocolStatus();
			expect(status).toBe(null);
		});
	});
});
