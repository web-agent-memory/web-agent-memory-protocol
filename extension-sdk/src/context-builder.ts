/**
 * ContextBuilder - Builds standardized Memory Protocol context responses
 *
 * Takes raw context data from providers and formats it into the standardized
 * MemoryContext format with proper metadata, token counting, and validation.
 */

import type { ContextOptions, Memory, MemoryContext } from "@wamp/protocol";
import type { ContextData, ProviderContextResult, ProviderInfo } from "./types";

export interface ContextBuilderConfig {
	topK?: number;
	defaultTimeRange?: {
		start?: number;
		end?: number;
	};
	includeMetadata?: boolean;
}

export class ContextBuilder {
	private config: Required<ContextBuilderConfig>;

	constructor(config: ContextBuilderConfig = {}) {
		this.config = {
			topK: config.topK ?? 50,
			defaultTimeRange: config.defaultTimeRange ?? {
				start: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
				end: Date.now(),
			},
			includeMetadata: config.includeMetadata ?? true,
		};
	}

	/**
	 * Build a complete ContextResult from raw ContextData
	 */
	buildContextResult(
		contextData: ContextData,
		options: ContextOptions | undefined,
		providerInfo: ProviderInfo,
	): ProviderContextResult {
		try {
			// Build the core context
			const context = this.buildContext(contextData, options);

			return {
				success: true,
				data: context,
				metadata: this.buildMetadata(contextData, options, providerInfo),
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to build context",
				metadata: this.buildErrorMetadata(providerInfo),
			};
		}
	}

	/**
	 * Build the core MemoryContext from raw data
	 */
	private buildContext(
		contextData: ContextData,
		options?: ContextOptions,
	): MemoryContext {
		// Process and validate memories
		const memories = this.processMemories(contextData.memories, options);

		return {
			memories,
		};
	}

	/**
	 * Process and validate memories
	 */
	private processMemories(
		memories: ContextData["memories"],
		options?: ContextOptions,
	): Memory[] {
		if (!memories || !Array.isArray(memories)) {
			return [];
		}

		return memories
			.filter(
				(memory) =>
					memory.text?.trim() &&
					typeof memory.relevance === "number" &&
					typeof memory.timestamp === "number" &&
					memory.source?.trim(),
			)
			.map((memory) => ({
				text: memory.text.trim(),
				relevance: Math.max(0, Math.min(1, memory.relevance)), // Clamp to 0-1
				timestamp: memory.timestamp,
				source: memory.source.trim(),
				metadata: memory.metadata || {},
			}))
			.sort((a, b) => b.relevance - a.relevance) // Sort by relevance
			.slice(0, options?.topK ?? this.config.topK ?? 50); // Limit to top K memories
	}

	/**
	 * Build metadata for successful context response
	 */
	private buildMetadata(
		_contextData: ContextData,
		options: ContextOptions | undefined,
		providerInfo: ProviderInfo,
	) {
		return {
			generatedAt: Date.now(),
			provider: {
				id: providerInfo.providerId,
				name: providerInfo.providerName,
				version: providerInfo.version,
			},
			dataSource: {
				timeRange: options?.timeRange ?? this.config.defaultTimeRange,
				categories: options?.categories ?? ["memories"],
			},
		};
	}

	/**
	 * Build error metadata
	 */
	private buildErrorMetadata(providerInfo: ProviderInfo) {
		return {
			generatedAt: Date.now(),
			provider: {
				id: providerInfo.providerId,
				name: providerInfo.providerName,
				version: providerInfo.version,
			},
			dataSource: {
				timeRange: { start: 0, end: 0 },
				categories: [],
			},
		};
	}

	/**
	 * Create a context with mock data for testing
	 */
	static createMockContext(_options?: ContextOptions): MemoryContext {
		return {
			memories: [
				{
					text: "User frequently works on React and TypeScript projects, often debugging performance issues",
					relevance: 0.9,
					timestamp: Date.now() - 3600000,
					source: "browsing",
					metadata: { category: "programming", language: "typescript" },
				},
				{
					text: "Recently read about Memory Protocol implementation and browser extensions",
					relevance: 0.8,
					timestamp: Date.now() - 300000,
					source: "browsing",
					metadata: {
						url: "https://github.com/web-agent-memory/web-agent-memory-protocol",
					},
				},
				{
					text: "Learning about AI and LLM integration patterns, particularly function calling",
					relevance: 0.7,
					timestamp: Date.now() - 7200000,
					source: "search",
					metadata: {
						category: "ai",
						keywords: ["llm", "function-calling", "agents"],
					},
				},
				{
					text: "Working on browser extension development with Chrome APIs",
					relevance: 0.6,
					timestamp: Date.now() - 1800000,
					source: "ide",
					metadata: {
						project: "extension-sdk",
						files: ["manifest.json", "content-script.js"],
					},
				},
			],
		};
	}
}
