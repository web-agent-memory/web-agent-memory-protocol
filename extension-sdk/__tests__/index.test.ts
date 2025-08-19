// Import dynamically to allow resetting between tests

import { describe, expect, it } from "vitest";

// Import the new simplified functions
import { createMockContextData, validateContextData } from "../src/index";

describe("Simplified ExtensionSDK", () => {
	it("should create mock context data", () => {
		const mockData = createMockContextData();

		expect(mockData).toBeDefined();
		expect(mockData.memories).toBeInstanceOf(Array);
		expect(mockData.memories.length).toBeGreaterThan(0);
		expect(mockData.memories[0]).toHaveProperty("text");
		expect(mockData.memories[0]).toHaveProperty("relevance");
		expect(mockData.memories[0]).toHaveProperty("timestamp");
		expect(mockData.memories[0]).toHaveProperty("source");
	});

	it("should validate context data", () => {
		const validData = createMockContextData();
		const invalidData = { memories: "not an array" } as any;
		const emptyData = { memories: [] };

		expect(validateContextData(validData)).toBe(true);
		expect(validateContextData(invalidData)).toBe(false);
		expect(validateContextData(emptyData)).toBe(true);
	});

	it("should validate context data with invalid memories", () => {
		const invalidData = {
			memories: [
				{
					text: "",
					relevance: 0.5,
					timestamp: Date.now(),
					source: "test",
				},
			],
		};

		expect(validateContextData(invalidData)).toBe(false);
	});
});
