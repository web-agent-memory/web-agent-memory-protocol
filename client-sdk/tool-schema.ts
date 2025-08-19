/**
 * Memory Protocol Tool Schema for AI Agents
 *
 * Provides standardized tool schemas for integrating Memory Protocol
 * with AI agent frameworks like OpenAI, Anthropic, LangChain, etc.
 */

/**
 * Universal tool schema that can be adapted for any AI framework
 */
export const memoryToolSchema = {
	name: "get_user_memory_context",
	description:
		"Retrieve relevant user context from browsing history, patterns, and interests to personalize AI responses",
	parameters: {
		relevanceQuery: {
			type: "string",
			description:
				"What you're helping the user with - used to filter relevant context and memories",
		},
		timeRange: {
			type: "object",
			properties: {
				start: {
					type: "number",
					description:
						"Start time as Unix timestamp in milliseconds (optional, defaults to beginning of time)",
				},
				end: {
					type: "number",
					description:
						"End time as Unix timestamp in milliseconds (optional, defaults to now)",
				},
			},
			description:
				"Time range for context retrieval using start/end timestamps",
		},
		categories: {
			type: "array",
			items: { type: "string" },
			description:
				"Categories to focus on: browsing, search, documents, coding, etc.",
		},
		format: {
			type: "string",
			enum: ["structured", "narrative"],
			description:
				"Output format: 'structured' for JSON data, 'narrative' for natural language text",
		},
		topK: {
			type: "number",
			description:
				"Maximum number of memories to return, ordered by relevance (default: 50)",
		},
	},
} as const;

/**
 * Tool schema formatted for OpenAI Function Calling
 */
export const openAIToolSchema = {
	type: "function" as const,
	function: {
		name: memoryToolSchema.name,
		description: memoryToolSchema.description,
		parameters: {
			type: "object",
			properties: memoryToolSchema.parameters,
			required: ["relevanceQuery"],
		},
	},
};

/**
 * Tool schema formatted for Anthropic Claude
 */
export const anthropicToolSchema = {
	name: memoryToolSchema.name,
	description: memoryToolSchema.description,
	input_schema: {
		type: "object",
		properties: memoryToolSchema.parameters,
		required: ["relevanceQuery"],
	},
};

/**
 * Tool schema formatted for LangChain
 */
export const langChainToolSchema = {
	name: memoryToolSchema.name,
	description: memoryToolSchema.description,
	schema: memoryToolSchema.parameters,
};

/**
 * Usage examples for different frameworks
 */
export const usageExamples = {
	openai: `
import { openAIToolSchema } from '@wamp/client-sdk/tool-schema';
import { MemoryClientSDK } from '@wamp/client-sdk';

// Initialize memory client
const memoryClient = await MemoryClientSDK.init({
  appName: "My AI Agent",
  appId: "my-agent-123"
});

// Use with OpenAI
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Help me debug this React component" }],
  tools: [openAIToolSchema],
  tool_choice: "auto"
});

// Handle tool calls
for (const toolCall of response.choices[0].message.tool_calls || []) {
  if (toolCall.function.name === 'get_user_memory_context') {
    const params = JSON.parse(toolCall.function.arguments);
    const memoryResult = await MemoryClientSDK.getContext(memoryClient, params);
    
    if (memoryResult.success) {
      // Use memoryResult.data.memories for personalized response
      console.log("User memories:", memoryResult.data.memories);
    }
  }
}
  `,

	anthropic: `
import { anthropicToolSchema } from '@wamp/client-sdk/tool-schema';
import { MemoryClientSDK } from '@wamp/client-sdk';

// Initialize memory client
const memoryClient = await MemoryClientSDK.init({
  appName: "My AI Agent", 
  appId: "my-agent-123"
});

// Use with Anthropic Claude
const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  tools: [anthropicToolSchema],
  messages: [{ role: "user", content: "Help me with my project" }]
});

// Handle tool use
for (const content of message.content) {
  if (content.type === 'tool_use' && content.name === 'get_user_memory_context') {
    const memoryResult = await MemoryClientSDK.getContext(memoryClient, content.input);
    
    if (memoryResult.success) {
      // Use memoryResult.data.memories for context
      console.log("User memories:", memoryResult.data.memories);
    }
  }
}
  `,

	vanilla: `
import { memoryToolSchema } from '@wamp/client-sdk/tool-schema';
import { MemoryClientSDK } from '@wamp/client-sdk';

// For any framework - just use the universal handler
async function handleMemoryTool(parameters: any) {
  const memoryClient = await MemoryClientSDK.init({
    appName: "My AI Agent",
    appId: "my-agent-123"
  });

  const result = await MemoryClientSDK.getContext(memoryClient, {
    relevanceQuery: parameters.relevanceQuery,
    timeRange: parameters.timeRange,
    categories: parameters.categories,
    format: parameters.format || "structured",
    topK: parameters.topK || 50
  });

  if (result.success && result.data) {
    // Format for your specific needs
    if (parameters.format === "narrative") {
      return result.data.memories
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10)
        .map(m => \`- \${m.text} (\${m.source})\`)
        .join('\\n');
    } else {
      return result.data.memories;
    }
  }

  return null;
}

// Use with any agent framework
if (toolCall.name === memoryToolSchema.name) {
  const memoryContext = await handleMemoryTool(toolCall.parameters);
  // Use memoryContext in your agent logic
}
  `,
};

/**
 * Type definitions for tool parameters
 */
export interface MemoryToolParameters {
	relevanceQuery: string;
	timeRange?: {
		start?: number;
		end?: number;
	};
	categories?: string[];
	format?: "structured" | "narrative";
	topK?: number;
}

/**
 * Expected return type from the memory tool
 */
export interface MemoryToolResult {
	success: boolean;
	memories?: Array<{
		text: string;
		relevance: number;
		timestamp: number;
		source: string;
		metadata?: Record<string, unknown>;
	}>;
	error?: {
		code: string;
		message: string;
	};
}

export default memoryToolSchema;
