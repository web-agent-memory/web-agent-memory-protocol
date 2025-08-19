/**
 * Mock Data Generator for Memory Protocol
 * Generates realistic context data for development and testing
 */

import type { ContextOptions, Memory, MemoryContext } from "@wamp/protocol";

export class MockDataGenerator {
	private debug: boolean;

	constructor(debug = false) {
		this.debug = debug;
	}

	/**
	 * Generate a complete mock context
	 */
	generateContext(options: ContextOptions = {}): MemoryContext {
		const { timeRange, topK = 50, categories = [] } = options;
		let { relevanceQuery } = options;

		// Use default relevance query if not provided
		relevanceQuery = relevanceQuery || "";

		if (this.debug) {
			console.log("Mock data generator options:", {
				timeRange,
				topK,
				categories,
				relevanceQuery,
			});
		}

		// Generate base memories
		const memories = this.generateMemories(
			timeRange,
			categories,
			relevanceQuery,
		);

		// Filter by relevance query if provided
		const filteredMemories = relevanceQuery
			? memories.filter(
					(memory) =>
						memory.text.toLowerCase().includes(relevanceQuery.toLowerCase()) ||
						memory.source
							.toLowerCase()
							.includes(relevanceQuery.toLowerCase()) ||
						JSON.stringify(memory.metadata)
							.toLowerCase()
							.includes(relevanceQuery.toLowerCase()),
				)
			: memories;

		// Apply topK limit
		const maxMemories = topK || 50;

		return {
			memories: filteredMemories
				.sort((a, b) => b.relevance - a.relevance)
				.slice(0, maxMemories),
		};
	}

	/**
	 * Generate memories based on time range and categories
	 */
	private generateMemories(
		timeRange: { start?: number; end?: number } | undefined,
		categories: string[],
		relevanceQuery?: string,
	): Memory[] {
		const now = Date.now();
		const memories: Memory[] = [];

		// Base memories covering different categories and time ranges
		const baseMemories: Omit<Memory, "timestamp">[] = [
			// Programming/Development
			{
				text: "User frequently works on React and TypeScript projects",
				relevance: 0.9,
				source: "browsing",
				metadata: {
					category: "programming",
					languages: ["react", "typescript"],
				},
			},
			{
				text: "Recently debugged performance issues in a Next.js application",
				relevance: 0.8,
				source: "browsing",
				metadata: {
					category: "programming",
					framework: "nextjs",
					issue: "performance",
				},
			},
			{
				text: "Reading documentation about browser extension APIs",
				relevance: 0.7,
				source: "browsing",
				metadata: { category: "programming", platform: "browser-extension" },
			},

			// AI/LLM related
			{
				text: "Learning about Memory Protocol for AI agent development",
				relevance: 0.9,
				source: "browsing",
				metadata: {
					category: "ai",
					keywords: ["agent-memory", "agents", "llm"],
				},
			},
			{
				text: "Researching function calling patterns for LLM integration",
				relevance: 0.8,
				source: "search",
				metadata: {
					category: "ai",
					keywords: ["function-calling", "openai", "anthropic"],
				},
			},
			{
				text: "Implemented tool schemas for AI agent workflows",
				relevance: 0.7,
				source: "ide",
				metadata: { category: "ai", implementation: "tool-schemas" },
			},

			// Web Development
			{
				text: "User prefers modern JavaScript frameworks and TypeScript",
				relevance: 0.8,
				source: "browsing",
				metadata: {
					category: "web-dev",
					preferences: ["typescript", "modern-js"],
				},
			},
			{
				text: "Recently worked with Vite for build tooling",
				relevance: 0.6,
				source: "ide",
				metadata: { category: "web-dev", tools: ["vite", "build-tools"] },
			},

			// Documentation/Learning
			{
				text: "Frequently visits MDN for JavaScript reference",
				relevance: 0.7,
				source: "browsing",
				metadata: {
					category: "documentation",
					site: "mdn",
					topic: "javascript",
				},
			},
			{
				text: "Learning about RAG (Retrieval-Augmented Generation) patterns",
				relevance: 0.8,
				source: "search",
				metadata: { category: "ai", concept: "rag", learning: true },
			},

			// Tools/Workflow
			{
				text: "Uses pnpm for package management over npm",
				relevance: 0.5,
				source: "ide",
				metadata: { category: "tools", preference: "pnpm" },
			},
			{
				text: "Prefers Biome for TypeScript linting and formatting",
				relevance: 0.6,
				source: "ide",
				metadata: {
					category: "tools",
					preference: "biome",
					language: "typescript",
				},
			},

			// Current Projects
			{
				text: "Currently working on browser extension SDK development",
				relevance: 1.0,
				source: "ide",
				metadata: {
					category: "current-work",
					project: "extension-sdk",
					status: "active",
				},
			},
			{
				text: "Implementing memory protocol integration patterns",
				relevance: 0.9,
				source: "ide",
				metadata: { category: "current-work", feature: "agent-memory" },
			},
		];

		// Add timestamps based on time range
		const startTime = timeRange?.start || now - 7 * 24 * 60 * 60 * 1000; // Default 7 days ago
		const endTime = timeRange?.end || now;
		const timeRangeMs = endTime - startTime;

		baseMemories.forEach((memory) => {
			// Distribute timestamps across the time range
			const randomOffset = Math.random() * timeRangeMs;
			const timestamp = startTime + randomOffset;

			// Adjust relevance based on how recent the memory is
			const ageRatio = (now - timestamp) / timeRangeMs;
			const adjustedRelevance = Math.max(
				0.1,
				memory.relevance * (1 - ageRatio * 0.3),
			);

			memories.push({
				...memory,
				timestamp,
				relevance: adjustedRelevance,
			});
		});

		// Filter by categories if specified
		if (categories.length > 0) {
			return memories.filter((memory) =>
				categories.some(
					(cat) =>
						memory.metadata?.category === cat ||
						memory.source === cat ||
						JSON.stringify(memory.metadata)
							.toLowerCase()
							.includes(cat.toLowerCase()),
				),
			);
		}

		// Add extra relevance boost for memories matching the query
		if (relevanceQuery) {
			memories.forEach((memory) => {
				if (
					memory.text.toLowerCase().includes(relevanceQuery.toLowerCase()) ||
					JSON.stringify(memory.metadata)
						.toLowerCase()
						.includes(relevanceQuery.toLowerCase())
				) {
					memory.relevance = Math.min(1.0, memory.relevance + 0.1);
				}
			});
		}

		return memories;
	}

	/**
	 * Generate a simple context for quick testing
	 */
	generateSimpleContext(): MemoryContext {
		return {
			memories: [
				{
					text: "User is working on a TypeScript project with React",
					relevance: 0.9,
					timestamp: Date.now() - 3600000, // 1 hour ago
					source: "ide",
					metadata: {
						category: "programming",
						languages: ["typescript", "react"],
					},
				},
				{
					text: "Recently searched for Memory Protocol documentation",
					relevance: 0.8,
					timestamp: Date.now() - 1800000, // 30 minutes ago
					source: "search",
					metadata: { category: "research", topic: "agent-memory" },
				},
				{
					text: "Learning about AI agent development patterns",
					relevance: 0.7,
					timestamp: Date.now() - 7200000, // 2 hours ago
					source: "browsing",
					metadata: { category: "ai", topic: "agents" },
				},
			],
		};
	}
}

// Export a default instance
export const mockDataGenerator = new MockDataGenerator(false);

export default mockDataGenerator;
